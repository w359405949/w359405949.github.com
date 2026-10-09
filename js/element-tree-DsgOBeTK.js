import { decodeFixedTextRecordSelection, decodeFixedTextRecord, summarizePhysicalRanges, physicalAddressOf, hex as hex$2, physicalAddressTarget, migrateLegacyOpaqueEditPolicies, db, hasFieldOwner, fieldOwner, SPARSE_ARRAY_FORMAT, fieldAssetPaths, HIDDEN_TELEPORT_RESOURCE_ID, StoryPageDataError, storyScriptBytecode, projectFieldDraftOrigin, trackProjectFieldProjection, projectStoryScriptPrograms, projectFieldDraftRevision, VISUAL_CHR_BANK_IDS, decodeDirectFrames, decodeGenericObjects, renderCodeFields, isBattleObjectOwnerProjection, VISUAL_METASPRITES_RESOURCE_ID, projectBattleObjectOwners, prepareAttackChrEntryContext, attackInitialEffectBank, resolveAttackChrPatternBanks, attackChrContextReference, effectPaletteAfterCommand, monsterVisualRecipes, MONSTER_SEQUENTIAL_GRAPHICS, acceptProjectFieldDraft, createProjectFieldDraft } from './battle-result-script-runtime-B_EClFew.js';
import { editorLog, isPlainJsonObject, sha256Hex, battleRoleSelector } from './visual-metasprites-DJP54-bV.js';
import { state, nesVideoStandard, nesFrameDurationMs, startNesFrameClock } from './emulator-DynsZsth.js';

// @editor-module 提供 DOM 查询、转义、格式化与文字输入事件绑定。


const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const bytes = (value) => value >= 1024 ? `${(value / 1024).toFixed(value % 1024 ? 1 : 0)} KiB` : `${value} B`;

/** 组字期间保留输入原文，结束后恢复长度限制并处理已提交文字。 */
function bindTextInputEvents(root, {selector = null, onInput = null, onChange = null} = {}) {
  if (!root) return;
  const composing = new WeakMap();
  const target = event => selector ? event.target.closest?.(selector) : event.target;
  const limit = (input, selection = null) => {
    const maximum = input.maxLength;
    if (!Number.isInteger(maximum) || maximum < 0 || input.value.length <= maximum) return;
    const prefix = selection?.prefix ?? '';
    const suffix = selection?.suffix ?? '';
    const preserve = input.value.startsWith(prefix) && input.value.endsWith(suffix)
      && prefix.length + suffix.length <= maximum;
    const available = preserve ? maximum - prefix.length - suffix.length : maximum;
    const source = preserve ? input.value.slice(prefix.length, input.value.length - suffix.length) : input.value;
    let text = '';
    for (const character of source) {
      if (text.length + character.length > available) break;
      text += character;
    }
    input.value = preserve ? prefix + text + suffix : text;
    const caret = preserve ? prefix.length + text.length : text.length;
    input.setSelectionRange?.(caret, caret);
  };
  root.addEventListener('compositionstart', event => {
    const input = target(event);
    if (!input || composing.has(input)) return;
    const maximum = input.getAttribute('maxlength');
    composing.set(input, {maximum,
      prefix: maximum === null ? '' : input.value.slice(0, input.selectionStart),
      suffix: maximum === null ? '' : input.value.slice(input.selectionEnd)});
    input.removeAttribute('maxlength');
  });
  root.addEventListener('input', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onInput?.(event);
  });
  root.addEventListener('compositionend', event => {
    const input = target(event);
    if (!input) return;
    const selection = composing.get(input);
    composing.delete(input);
    const maximum = selection?.maximum;
    if (maximum !== null && maximum !== undefined) input.setAttribute('maxlength', maximum);
    limit(input, selection);
    onInput?.(event);
  });
  if (onChange) root.addEventListener('change', event => {
    const input = target(event);
    if (!input || event.isComposing || composing.has(input)) return;
    limit(input);
    onChange(event);
  });
}

// @editor-module 按字段对象名与序号组成记录句柄。
function recordUid(domain, id) {
  if (id === null || id === undefined) return null;
  return `${domain}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`;
}

// @editor-module 攻击预览标记供资源引用与视觉消费方共用。
function attackVisualCanvas({
  visualCode, frame = 0, play = false, segment = "full", className = "", label = "",
} = {}) {
  const segmentId = ["launch", "trajectory", "impact", "full"].includes(segment)
    ? segment : "full";
  const attributes = [
    `data-attack-visual="${Number(visualCode)}"`,
    `data-attack-visual-segment="${segmentId}"`,
    frame ? `data-attack-visual-frame="${Number(frame)}"` : "",
    play ? 'data-attack-visual-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

// @editor-module 解析资源外键、文本引用、字节范围与地址展示单元格。
//
// 来源：拆分前 engine/editor/app.js 第 1232-1493 行。


function romMapAddressHref(address) {
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

function resourceByteRanges(uid) {
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
function resourceFieldByteRanges(uid) {
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
function expandResourceByteRangeSlots(uid, declarations = {}) {
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
function resourceDomain(uid) {
  const prefix = String(uid || "").split(":", 1)[0];
  return state.project?.resource_index?.uid_domains?.[prefix] || null;
}

function indexedResource(uid) {
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
function resourcePhysicalAddressSummary(uid) {
  const summary = summarizePhysicalRanges(resourceByteRanges(uid));
  if (summary.kind !== "unregistered") return {...summary, uid: String(uid || "")};
  return {
    ...summary,
    uid: String(uid || ""),
    kind: addresslessResourceKind(indexedResource(uid)),
  };
}

/** 资源跳转没有专属页面时所用的语义主入口；无声明时才回退到展示首项。 */
function resourcePrimaryAddress(uid) {
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
function resourceLabel(uid, fallback = null) {
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

function itemResourceUid(itemOrId) {
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

function currentTextReference(reference, {ranges = null} = {}) {
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

function currentTextChoiceLabel(reference) {
  const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(reference?.record || '');
  if (!match) return '';
  const record = `record:${match[1]}:${String(parseInt(match[2], 16)).padStart(3, '0')}`;
  const text = currentTextReference(record).label;
  if (Number.isInteger(reference.line)) return text.split('\n')[reference.line]?.trim() || '';
  if (Number.isInteger(reference.glyph_index)) return [...text.replace(/\s/gu, '')][reference.glyph_index] || '';
  return text.trim();
}

/** 曲名只解引用点唱机声明的游戏文字；无曲名时显示命令编号。 */
function audioCommandLabel(id) {
  const entry = (state.project?.facilities?.configuration_loader?.pointer_entries || [])
    .find(item => Number(item.family_id) === 0x0A);
  const good = (entry?.value_namespace?.goods || [])
    .find(item => Number(item.value) === Number(id));
  return currentTextReference(good?.text_record || good?.resource_uid).label
    || `音频命令 ${hex$2(Number(id), 2)}`;
}

function currentTextReferenceLink(reference, fallback = null) {
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
function plainTextRecordReferences(
  recordIds,
  emptyLabel = "",
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
    : emptyLabel ? `<span class="resource-empty">${esc(emptyLabel)}</span>` : "";
}

function textRecordDisplayText(record) {
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
function currentTextRecordCard(record, {compact = false} = {}) {
  const text = currentTextReference(record?.node_id).label || textRecordDisplayText(record);
  if (!text) return "";
  const resourceUid = uiScriptResourceUid(record.node_id);
  return `<button class="current-text-record ${compact ? "compact" : ""}" type="button" data-resource-target="${esc(resourceUid)}" title="${esc(resourceUid)}">
    <span>${esc(text)}</span><small>${esc(record.node_id)}</small>
  </button>`;
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
function directPhysicalAddress(address, options = {}) {
  const label = options.label || physicalAddressOf(address);
  const href = romMapAddressHref(address);
  if (!label || !href) {
    return "";
  }
  const title = options.title || physicalRangeTitle(address);
  const deferredTitle = options.deferredAddressTitle
    ? ` data-address-title-space="${esc(String(address.space || ""))}"` : "";
  return `<a class="mono resource-address-link" href="${href}" title="${esc(title)}"${deferredTitle}>${esc(label)}</a>`;
}

function physicalAddressLink(source, {
  label = "", fallback = "", missingClass = "resource-unregistered",
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
    ? `${physicalAddressOf(address) || "—"} · CPU ${address.cpu_address != null ? hex$2(address.cpu_address, 4) : "—"}`
    : physicalAddressOf(address));
  return directPhysicalAddress(address, {...options, label: text});
}

/** 明确表示该行只是组合/派生视图，不把子资源入口冒充成自身地址。 */
function noIndependentPhysicalAddress(label = "") {
  return `<span class="resource-empty" title="该行引用其他资源，但没有可归属给自身的独立物理字节">${esc(label)}</span>`;
}

function unregisteredResourceAddress(uid) {
  return "";
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

function compactResourceAddress(uid, {deferFullTitle = false} = {}) {
  const summary = resourcePhysicalAddressSummary(uid);
  if (summary.kind === "composite") return noIndependentPhysicalAddress();
  if (summary.kind === "derived") return noIndependentPhysicalAddress("派生资源（无独立地址）");
  if (summary.kind === "unregistered") return unregisteredResourceAddress();
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

function tableValueStack(values, empty = "—") {
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

function resourceForwardReferenceCell(uid, targetKinds = null) {
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

function textCharacterResourceUid(reference) {
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

function textRecordReferenceCell(record, uid) {
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

// @editor-module 提供资产定点编辑、选择性重置和迁移写入入口，写后使 DB 失效。

function editableJsonAsset(value, resourceId) {
  if (!isPlainJsonObject(value) || value.resource_id !== resourceId ||
      !isPlainJsonObject(value.document)) {
    throw new TypeError(`${resourceId}: browser project value is not an editable JSON asset`);
  }
  return value;
}

/**
 * Upgrade legacy Working policy metadata from one storage read's snapshots.
 * This is a storage migration, not an editor callback: current Original owns
 * the policy. Resolving again here would re-enter the in-flight migration.
 */
async function migrateLegacyProjectAssetEditPolicies(
  repository,
  resourceId,
  {original, working},
) {
  if (!repository || typeof repository.saveValue !== "function") {
    throw new TypeError("repository must implement saveValue");
  }
  requireResourceId(resourceId);
  if (!isPlainJsonObject(original) || !isPlainJsonObject(working) ||
      original.resource_id !== resourceId || working.resource_id !== resourceId ||
      original.revision_id !== working.revision_id || working.layer !== "working" ||
      !Number.isSafeInteger(working.version) || working.version < 0) {
    throw new TypeError(`${resourceId}: migration requires matching storage snapshots`);
  }
  const migrated = migrateLegacyOpaqueEditPolicies(
    editableJsonAsset(original.value, resourceId),
    editableJsonAsset(working.value, resourceId),
  );
  if (migrated === null) return working;
  const saved = await repository.saveValue(resourceId, migrated, {
    previousValue: working.value,
  });
  db.invalidateResource(resourceId);
  return saved;
}

function requireResetRepository(repository, method) {
  if (!repository || typeof repository[method] !== "function") {
    throw new TypeError(`repository must implement ${method}`);
  }
  return repository;
}

function requireResourceId(resourceId) {
  if (typeof resourceId !== "string" || !resourceId.trim()) {
    throw new TypeError("resourceId must be a non-empty string");
  }
  return resourceId;
}

/** Convenience form used by a single table-row button. */

const fieldSelectionSources = new WeakMap();

async function fieldSelectionSource(repository, resourceId) {
  if (requireBrowserProjectRepository(state) !== repository) throw new TypeError("字段选区不属于当前项目会话");
  const selection = await db.getFieldSelectionSource(resourceId);
  const fields = selection.fields;
  if (!fields.length) throw new TypeError("字段选区缺少字段");
  let source = fieldSelectionSources.get(fields[0]);
  if (!source) {
    source = (async () => {
      const byPath = new Map();
      for (const field of fields) for (const path of fieldAssetPaths(field)) for (let size = 1; size <= path.length; size++) {
        const key = JSON.stringify(path.slice(0, size));
        if (!byPath.has(key)) byPath.set(key, new Set());
        byPath.get(key).add(field);
      }
      return {fields, original: selection.original, byPath, selection};
    })();
    fieldSelectionSources.set(fields[0], source);
    source.catch(() => fieldSelectionSources.delete(fields[0]));
  }
  return source;
}

function selectProjectFields({original, byPath}, selectors) {
  if (!Array.isArray(selectors) || !selectors.length) throw new TypeError("字段选区不能为空");
  const selected = new Set();
  // 选区可以落在字段值内部（`logic.layers.transitions.point_transitions[0]`、剧情脚本的
  // 字节下标）：认最深的已登记前缀，但余下的路径必须真的落在那一份值里——随便给一条
  // 路径不该选中某个字段。
  const valueAt = (value, path) => path.reduce(
    (node, key) => node === null || node === undefined ? undefined : node[key], value);
  const coveringFields = path => {
    for (let size = path.length - 1; size > 0; size -= 1) {
      const parent = byPath.get(JSON.stringify(path.slice(0, size)));
      if (!parent?.size) continue;
      const suffix = path.slice(size);
      const covered = [...parent].filter(field => valueAt(field.defaultValue, suffix) !== undefined);
      if (covered.length) return new Set(covered);
    }
    return null;
  };
  for (const selector of selectors) {
    let path;
    if (selector?.kind === "path") path = selector.path;
    else if (selector?.kind === "item") {
      const collection = selector.collectionPath?.reduce((node, key) => node?.[key], original);
      if (!Array.isArray(collection)) throw new TypeError("字段选区集合不存在");
      const indices = collection.flatMap((row, index) => String(row?.[selector.identityKey]) === String(selector.identityValue) ? [index] : []);
      if (indices.length !== 1) throw new TypeError("字段选区身份不唯一");
      path = [...selector.collectionPath, indices[0]];
    } else throw new TypeError("字段选区类型无效");
    if (!Array.isArray(path) || !path.length) throw new TypeError("字段选区路径无效");
    const matches = byPath.get(JSON.stringify(path)) ?? coveringFields(path);
    if (!matches?.size) throw new TypeError("字段选区没有登记字段");
    matches.forEach(field => selected.add(field));
  }
  return [...selected];
}

async function projectFieldsForSelectors(repository, resourceId, selectors) {
  const source = await fieldSelectionSource(repository, resourceId);
  return selectProjectFields(source, selectors).map(source.selection.resolve);
}

async function projectAssetSelectionStates(
  repository,
  resourceId,
  groups,
) {
  if (hasFieldOwner(resourceId) && fieldOwner(resourceId).workingFormat !== SPARSE_ARRAY_FORMAT) {
    if (!Array.isArray(groups) || !groups.length) throw new TypeError("字段选区组不能为空");
    const source = await fieldSelectionSource(repository, resourceId);
    const states = Object.create(null);
    for (const group of groups) {
      if (!group || typeof group.key !== "string" || !group.key || Object.hasOwn(states, group.key))
        throw new TypeError("字段选区组无效");
      const fields = selectProjectFields(source, group.selectors);
      states[group.key] = fields.some(source.selection.overridden);
    }
    const dirty = source.selection.dirty;
    return {resource_id: resourceId, layer: dirty ? "working" : "original", version: source.selection.version, dirty, states};
  }
  if (hasFieldOwner(resourceId) && fieldOwner(resourceId).workingFormat === SPARSE_ARRAY_FORMAT) {
    const fields = await db.getFields(resourceId);
    if (fields.every(field => field.workingFormat === SPARSE_ARRAY_FORMAT)) {
      if ((await repository.getManifest()).project_id !== fields[0].key[0])
        throw new TypeError("字段选区不属于当前项目");
      if (!Array.isArray(groups) || !groups.length) throw new TypeError("字段选区组不能为空");
      const states = Object.create(null);
      for (const group of groups) {
        if (!group || typeof group.key !== "string" || !group.key || Object.hasOwn(states, group.key)
            || !Array.isArray(group.selectors) || !group.selectors.length)
          throw new TypeError("字段选区组无效");
        states[group.key] = group.selectors.some(selector => {
          if (selector?.kind !== "path" || !Array.isArray(selector.path))
            throw new TypeError("数组字段只接受值路径选区");
          return fields.some(field => {
            const path = ["document", ...field.documentPath], selected = selector.path;
            const common = Math.min(path.length, selected.length);
            if (!path.slice(0, common).every((part, index) => part === selected[index])) return false;
            if (selected.length <= path.length) return field.hasOverride;
            if (selected.length !== path.length + 1 || !Number.isSafeInteger(selected.at(-1))
                || selected.at(-1) < 0 || selected.at(-1) >= field.defaultValue.length)
              throw new TypeError("数组字段选区越界");
            return field.workingValue?.entries.some(entry => entry.index === selected.at(-1)) || false;
          });
        });
      }
      return {resource_id: resourceId, layer: fields.some(field => field.hasOverride) ? "working" : "original",
        version: fields[0].version, dirty: fields.some(field => field.hasOverride), states};
    }
  }
  requireResetRepository(repository, "selectionStates");
  requireResourceId(resourceId);
  return repository.selectionStates(resourceId, groups);
}

async function projectAssetSelectionsDirty(
  repository,
  resourceId,
  selectors,
) {
  if (hasFieldOwner(resourceId))
    return (await projectAssetSelectionStates(repository, resourceId,
    [{key: "selection", selectors}])).states.selection;
  requireResetRepository(repository, "selectionsDirty");
  requireResourceId(resourceId);
  return repository.selectionsDirty(resourceId, selectors);
}

function requireBrowserProjectRepository(state) {
  const repository = state?.projectRepository;
  if (!repository) {
    throw new Error("当前项目尚未初始化，不能保存更改");
  }
  return repository;
}

function applyFacilityConfigurationProjection(project, document, dirty = false) {
  const entries = project.facilities?.configuration_loader?.pointer_entries;
  if (!Array.isArray(entries) || !Array.isArray(document?.families) ||
      !Array.isArray(document?.records)) return;
  const records = new Map(document.records.map(record => [record.id, record]));
  const families = new Map(document.families.map(family => [Number(family.id), family]));
  for (const entry of entries) {
    const family = families.get(Number(entry.family_id));
    if (!family) throw new Error(`facility-config missing family ${entry.family_id}`);
    const recordIds = new Map((family.records || []).map(record => [
      Number(record.id), record.record_id,
    ]));
    for (const projection of entry.records || []) {
      const record = records.get(recordIds.get(Number(projection.id)));
      if (!record || !Array.isArray(record.slots)) {
        throw new Error(
          `facility-config missing ${entry.family_id}:${projection.id}`,
        );
      }
      // readResource supplies getters backed by the shared field instances.
      // Keep held facility projections live without a second saved value set.
      for (const [key, read] of Object.entries({
        values: () => record.slots.map(slot => Number(slot.value)),
        values_hex: () => record.slots.map(slot => `0x${Number(slot.value).toString(16).toUpperCase().padStart(2, "0")}`),
        payload_hex: () => record.slots.map(slot => Number(slot.value).toString(16).toUpperCase().padStart(2, "0")).join(" "),
      })) Object.defineProperty(projection, key, {configurable: true, enumerable: true, get: read});
    }
  }
  const jukebox = project.facilities.facilities?.find(row => row.id === 'jukebox');
  for (const track of jukebox?.configuration?.tracks || []) {
    const alias = families.get(0x0a)?.records.find(row => Number(row.id) === Number(track.configuration_id));
    const record = records.get(alias?.record_id);
    const slot = record?.slots.find(row => Number(row.id) === Number(track.index));
    if (!slot) continue;
    Object.defineProperties(track, {
      audio_command_id: {configurable: true, enumerable: true, get: () => Number(slot.value)},
      audio_command_id_hex: {configurable: true, enumerable: true,
        get: () => `0x${Number(slot.value).toString(16).toUpperCase().padStart(2, '0')}`},
    });
  }
  project.facilities.configuration_writeback_state = {
    component: document.component_id,
    length: Number(document.byte_length),
    modified: Boolean(dirty),
  };
}

/**
 * Unified field mutations. The DB publishes to all references after the store commits.
 * 字段层在事务中读取最新 Working，并只提交本次选择的字段。
 */
async function setProjectField(database, field, value, {expectedVersion, selection, storyPage} = {}) {
  return database.writeField(field, value, {expectedVersion, selection, storyPage});
}

async function resetProjectField(database, field, {expectedVersion, selection, storyPage} = {}) {
  return database.writeField(field, undefined, {expectedVersion, reset: true, selection, storyPage});
}

async function setProjectFields(database, changes, {expectedVersion} = {}) {
  return database.writeFields(changes, {expectedVersion});
}

async function resetProjectFields(database, fields, {expectedVersion} = {}) {
  return database.writeFields(fields.map(field => ({field, reset: true})), {expectedVersion});
}

/** 页面给的是仓库记录路径（`document` 打头），字段发布的是正文内路径：入口去掉那一层。 */
function documentRelativePath(path) {
  return path[0] === "document" ? path.slice(1) : path;
}

function pathIsUnder(prefix, path) {
  return prefix.length <= path.length && prefix.every((step, index) => path[index] === step);
}

/**
 * 重置按字段对象声明的全部正文路径匹配，并按字段身份去重。
 * 父路径选择子树；无匹配路径报错。
 * 字段写入负责投影失效。
 */
async function resetProjectFieldsAtPaths(resourceId, paths, {expectedVersion} = {}) {
  if (!Array.isArray(paths) || !paths.length) throw new TypeError("paths must be a non-empty array");
  const wanted = paths.map(path => {
    if (!Array.isArray(path) || !path.length || path.some(step => step === undefined || step === null))
      throw new TypeError("path must be a non-empty array of steps");
    return documentRelativePath(path);
  });
  const fields = await db.getFields(resourceId);
  const matched = new Set();
  wanted.forEach((prefix, position) => {
    const hits = fields.filter(field => (field.documentPaths || [field.documentPath])
      .some(path => Array.isArray(path) && pathIsUnder(prefix, path)));
    if (!hits.length) throw new TypeError(`${resourceId}: 第 ${position + 1} 个正文位置没有对应字段：${JSON.stringify(prefix)}`);
    for (const field of hits) matched.add(field);
  });
  const selected = [...matched];
  await resetProjectFields(db, selected, {expectedVersion});
  return Object.freeze(selected);
}

var projectData = /*#__PURE__*/Object.freeze({
  __proto__: null,
  acceptProjectFieldDraft: acceptProjectFieldDraft,
  applyFacilityConfigurationProjection: applyFacilityConfigurationProjection,
  createProjectFieldDraft: createProjectFieldDraft,
  migrateLegacyProjectAssetEditPolicies: migrateLegacyProjectAssetEditPolicies,
  projectAssetSelectionStates: projectAssetSelectionStates,
  projectAssetSelectionsDirty: projectAssetSelectionsDirty,
  projectFieldDraftRevision: projectFieldDraftRevision,
  projectFieldsForSelectors: projectFieldsForSelectors,
  requireBrowserProjectRepository: requireBrowserProjectRepository,
  resetProjectField: resetProjectField,
  resetProjectFields: resetProjectFields,
  resetProjectFieldsAtPaths: resetProjectFieldsAtPaths,
  setProjectField: setProjectField,
  setProjectFields: setProjectFields
});

// @editor-module 错误传送与大门的已发布条件及预览。

function hiddenTeleportDestination(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')
    ?.configuration?.hidden_destination || null;
}

async function prepareHiddenTeleportDestination(project) {
  const facility = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal');
  if (facility) facility.configuration.hidden_destination =
    await db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID, null);
}

function hiddenTeleportFlags(project) {
  const hidden = hiddenTeleportDestination(project);
  return hidden ? [...hidden.trigger_flags, {id: hidden.set_flag, value: 1, label: hidden.flag_label}] : [];
}

function hiddenTeleportGate(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return null;
  const gate = hidden.gate;
  return {
    key: HIDDEN_TELEPORT_RESOURCE_ID, object: null,
    scene_id: gate.scene_id, x: gate.cells[0].x, y: gate.cells[0].y,
    label: `scene:${gate.scene_id.toString(16).toUpperCase()} 下方大门`,
    appearance_condition: {
      label: '错误传送后下方大门开放',
      flags: [gate.event_flag], flag_labels: {[gate.event_flag]: hidden.flag_label},
      persistence: '置位开放，清位关闭，随存档保存。',
      triggers: [{flag: gate.event_flag, reference: HIDDEN_TELEPORT_RESOURCE_ID,
        label: '时空隧道错误传送', href: '?view=teleport&facilityTab=config#hidden-teleport'}],
      states: [
        {id: 'before', label: '关闭', cells: []},
        {id: 'after', label: '开放', cells: gate.cells},
      ],
      note: `地图格 ${gate.cells.map(cell => `(${cell.x},${cell.y}) → $${
        cell.metatile_id.toString(16).toUpperCase().padStart(2, '0')}`).join('、')}`,
      destination: {label: `隐藏目的地 scene:${hidden.scene_id.toString(16).toUpperCase()}`,
        scene_id: hidden.scene_id},
      sources: [gate.source],
    },
  };
}

// @editor-module 场景显示名的地点部分解引用当前城镇名称文本。

function applyTeleportDestinationNames(project) {
  const destinations = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')?.configuration?.destinations || [];
  for (const row of destinations) Object.defineProperty(row, 'name', {enumerable: true, configurable: true,
    get: () => currentTextReference(row.text_record).label.trim()});
}

function applySceneTownNames(project) {
  for (const scene of project?.scenes?.editable_scenes || []) {
    if (!scene.name_reference || Object.getOwnPropertyDescriptor(scene, 'name')?.get) continue;
    const detail = scene.name;
    if (detail.includes(' · ') && !scene.name_reference_prefix) continue;
    Object.defineProperty(scene, 'name', {enumerable: true, configurable: true,
      get: () => {
        const town = currentTextChoiceLabel({record: scene.name_reference});
        return town ? scene.name_reference_prefix
          ? `${town}${detail.slice(scene.name_reference_prefix.length)}` : `${town} · ${detail}` : detail;
      }});
  }
}

// @editor-module NES 渲染原语：调色板、pattern 解码与图块合成。
// 显示现场的区域合成由 frame-composition.js 提供。

// RGB 对照采用 Mesen NesDefaultVideoFilter 的 2C02 色表。
const nesPalette = [
  [102,102,102],[0,42,136],[20,18,167],[59,0,164],[92,0,126],[110,0,64],[108,6,0],[86,29,0],
  [51,53,0],[11,72,0],[0,82,0],[0,79,8],[0,64,77],[0,0,0],[0,0,0],[0,0,0],
  [173,173,173],[21,95,217],[66,64,255],[117,39,254],[160,26,204],[183,30,123],[181,49,32],[153,78,0],
  [107,109,0],[56,135,0],[12,147,0],[0,143,50],[0,124,141],[0,0,0],[0,0,0],[0,0,0],
  [255,254,255],[100,176,255],[146,144,255],[198,118,255],[243,106,255],[254,110,204],[254,129,112],[234,158,34],
  [188,190,0],[136,216,0],[92,228,48],[69,224,130],[72,205,222],[79,79,79],[0,0,0],[0,0,0],
  [255,254,255],[192,223,255],[211,210,255],[232,200,255],[251,194,255],[254,196,234],[254,204,197],[247,216,165],
  [228,229,148],[207,239,150],[189,244,171],[179,243,204],[181,235,242],[184,184,184],[0,0,0],[0,0,0],
];

function uiHexBytes(rawHex) {
  return String(rawHex || "").trim().split(/\s+/)
    .filter(Boolean)
    .map(value => Number.parseInt(value, 16));
}

function uiPutRgb(pixels, width, x, y, colour) {
  if (x < 0 || y < 0 || x >= width || y * width * 4 >= pixels.length) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = colour[0];
  pixels[offset + 1] = colour[1];
  pixels[offset + 2] = colour[2];
  pixels[offset + 3] = 255;
}

function uiPaintPattern(
  pixels, width, height, patterns, corePatterns, tileId, originX, originY,
  patternProfiles = [], paletteValues = null
) {
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(index => nesPalette[Number(index) & 0x3F]);
  const profiles = Array.isArray(patternProfiles)
    ? patternProfiles : patternProfiles ? [patternProfiles] : [];
  const patternProfile = profiles.find(profile => (
    tileId >= Number(profile?.first_tile ?? -1)
    && tileId <= Number(profile?.last_tile ?? -1)
  )) || null;
  const coreMatch = !patternProfile && tileId <= 0x7F;
  const profileFirst = Number(patternProfile?.first_tile ?? -1);
  const profileLast = Number(patternProfile?.last_tile ?? -1);
  const profileMatch = (
    patternProfile
    && tileId >= profileFirst
    && tileId <= profileLast
  );
  const source = coreMatch
    ? corePatterns
    : profileMatch ? patternProfile.patterns : patterns;
  const patternOffset = coreMatch
    ? tileId * 16
    : profileMatch ? (tileId - profileFirst) * 16 : (tileId - 0x80) * 16;
  if (patternOffset < 0 || patternOffset + 16 > source.length) {
    const warning = [154, 67, 88];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if (!((x + y) & 1)) uiPutRgb(pixels, width, originX + x, originY + y, warning);
      }
    }
    return;
  }
  for (let y = 0; y < 8; y += 1) {
    const low = source[patternOffset + y];
    const high = source[patternOffset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(pixels, width, originX + x, originY + y, palette[value]);
    }
  }
}

// rowProfiles 描述帧内切 CHR bank 的整屏画面：青蛙赛跑在第 18 行换掉背景
// bank，上半屏是赛道图、下半屏的消息窗回到常规 UI bank。用同一对 bank 铺整屏
// 会把其中一半画成乱码，所以按行段选图块。
function uiPaintRomNametable(
  image, layer, patterns, corePatterns, patternProfiles, rowProfiles = []
) {
  const source = uiHexBytes(layer.raw_hex);
  if (source.length !== 0x400) return;
  const paletteSets = layer.palette_sets || [];
  const segments = Array.isArray(rowProfiles) ? rowProfiles : [];
  for (let position = 0; position < 32 * 30; position += 1) {
    const tileX = position % 32;
    const tileY = Math.floor(position / 32);
    const attribute = source[0x3C0 + Math.floor(tileY / 4) * 8
      + Math.floor(tileX / 4)];
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    const segment = segments.find(item => (
      tileY >= Number(item?.first_row ?? -1)
      && tileY <= Number(item?.last_row ?? -1)
    ));
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      source[position], tileX * 8, tileY * 8,
      segment ? [...segment.profiles, ...patternProfiles] : patternProfiles,
      paletteSets[paletteId]
    );
  }
}

function uiPaintSpritePattern(
  image, tileId, originX, originY, patternProfiles, paletteValues,
  horizontalFlip = false, verticalFlip = false,
  behindBackground = false
) {
  const profile = (patternProfiles || []).find(item => (
    tileId >= Number(item?.first_tile ?? -1)
    && tileId <= Number(item?.last_tile ?? -1)
  ));
  if (!profile?.patterns) return;
  const patternOffset = (tileId - Number(profile.first_tile)) * 16;
  if (patternOffset < 0 || patternOffset + 16 > profile.patterns.length) return;
  const palette = (paletteValues || [0x0F, 0x30, 0x10, 0x00])
    .map(value => nesPalette[Number(value) & 0x3F]);
  for (let outputY = 0; outputY < 8; outputY += 1) {
    const sourceY = verticalFlip ? 7 - outputY : outputY;
    const low = profile.patterns[patternOffset + sourceY];
    const high = profile.patterns[patternOffset + 8 + sourceY];
    for (let outputX = 0; outputX < 8; outputX += 1) {
      const sourceX = horizontalFlip ? 7 - outputX : outputX;
      const shift = 7 - sourceX;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      if (value) {
        const targetOffset = (
          (originY + outputY) * image.width + originX + outputX
        ) * 4;
        const background = nesPalette[0x0F];
        if (
          behindBackground
          && (
            image.data[targetOffset] !== background[0]
            || image.data[targetOffset + 1] !== background[1]
            || image.data[targetOffset + 2] !== background[2]
          )
        ) {
          continue;
        }
        uiPutRgb(
          image.data, image.width, originX + outputX, originY + outputY,
          palette[value]
        );
      }
    }
  }
}

function uiPaintRomTileGrid(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const source = uiHexBytes(layer.raw_hex);
  const rows = Number(layer.rows || 0);
  const groups = Number(layer.groups_per_row || 0);
  const cells = Number(layer.cells_per_group || 0);
  const groupGap = Number(layer.group_gap || 0);
  const rowStride = Number(layer.row_stride || 0);
  let sourceIndex = 0;
  let rowCursor = Number(layer.destination_cursor || 0) & 0x3FF;
  const paint = (position, tile) => {
    const logical = Number(position) & 0x3FF;
    const tileY = Math.floor(logical / 32);
    if (tileY >= 30) return;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(tile), (logical % 32) * 8, tileY * 8, patternProfiles
    );
  };
  for (let row = 0; row < rows; row += 1) {
    let cursor = rowCursor;
    for (let group = 0; group < groups; group += 1) {
      for (let cell = 0; cell < cells; cell += 1) {
        if (sourceIndex < source.length) paint(cursor, source[sourceIndex]);
        sourceIndex += 1;
        cursor = (cursor + 1) & 0x3FF;
      }
      cursor = (cursor + groupGap) & 0x3FF;
    }
    rowCursor = (rowCursor + rowStride) & 0x3FF;
  }
  for (const [position, tile] of layer.extra_writes || []) {
    paint(position, tile);
  }
}

// 运行期把实体图形、数字等写回同一张逻辑 nametable。constructor 只保存这些
// 语义写入，不保存截图；图块像素仍从已登记的 ROM / 核心字体 pattern 读取。
function uiPaintTileWrites(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const paletteSets = layer.palette_sets || [];
  const defaultAttribute = Number(layer.default_attribute ?? 0xFF) & 0xFF;
  const attributes = new Map(
    (layer.attribute_writes || []).map(([position, value]) => [
      Number(position) & 0x3FF, Number(value) & 0xFF,
    ])
  );
  for (const [rawPosition, rawTile] of layer.writes || []) {
    const position = Number(rawPosition) & 0x3FF;
    const tileY = Math.floor(position / 32);
    if (tileY >= 30) continue;
    const tileX = position % 32;
    const attributePosition = 0x3C0
      + Math.floor(tileY / 4) * 8 + Math.floor(tileX / 4);
    const attribute = attributes.get(attributePosition) ?? defaultAttribute;
    const shift = ((tileY & 0x02) << 1) | (tileX & 0x02);
    const paletteId = (attribute >> shift) & 0x03;
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns,
      Number(rawTile), tileX * 8, tileY * 8, patternProfiles,
      paletteSets[paletteId]
    );
  }
}

function uiPaintTileFill(
  image, layer, patterns, corePatterns, patternProfiles
) {
  const writes = [];
  const originX = Number(layer.x || 0);
  const originY = Number(layer.y || 0);
  const width = Number(layer.width || 0);
  const height = Number(layer.height || 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      writes.push([(originY + y) * 32 + originX + x, Number(layer.tile)]);
    }
  }
  uiPaintTileWrites(
    image, {...layer, writes}, patterns, corePatterns, patternProfiles
  );
}

function uiPaintResolvedMetasprite(image, layer, patternProfiles, preview) {
  const anchorX = Number(layer.anchor_x || 0);
  const anchorY = Number(layer.anchor_y || 0);
  const yBias = Number(layer.oam_y_bias ?? 1);
  const paletteSets = layer.palette_sets || preview.sprite_palettes || [];
  const sprites = layer.kind === "rom_oam"
    ? [...(layer.sprites || [])].reverse()
    : (layer.sprites || []);
  for (const sprite of sprites) {
    if (sprite.transparent_tile) continue;
    const attribute = Number(sprite.attribute || 0);
    uiPaintSpritePattern(
      image, Number(sprite.tile),
      anchorX + Number(sprite.x || 0),
      anchorY + Number(sprite.y || 0) + yBias,
      patternProfiles,
      paletteSets[attribute & 0x03],
      Boolean(sprite.horizontal_flip ?? (attribute & 0x40)),
      Boolean(sprite.vertical_flip ?? (attribute & 0x80)),
      Boolean(sprite.behind_background ?? (attribute & 0x20))
    );
  }
}

function uiBlankCanvas(canvas, {transparent = false} = {}) {
  canvas.width = 256;
  canvas.height = 240;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(canvas.width, canvas.height);
  if (transparent) return {context, image};
  const background = nesPalette[0x0F];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = background[0];
    image.data[offset + 1] = background[1];
    image.data[offset + 2] = background[2];
    image.data[offset + 3] = 255;
  }
  return {context, image};
}

// @editor-module 将编辑器错误与调用栈上报日志并保留出错位置与恢复操作。

function storyPageRecoveryButton(page) {
  return `<button class="button ghost" data-clear-story-page="${esc(page)}" title="丢弃本剧情页的修改；其他页面和字段修改保留">清理本页修改</button>`;
}

function bindStoryPageRecovery(root, {database, afterReset, onError}) {
  for (const button of root?.querySelectorAll("[data-clear-story-page]") || []) {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await database.resetStoryPageWorking(button.dataset.clearStoryPage);
        await afterReset();
      } catch (error) {onError(error);}
      finally {button.disabled = false;}
    });
  }
}

function editorErrorMarkup(block, error, {storyRecovery = false} = {}) {
  editorLog.error("编辑页面", `${block}：${error?.message || error}`, error);
  return `<div class="editor-error"><b>${esc(block)}</b>
    ${storyRecovery && error instanceof StoryPageDataError ? storyPageRecoveryButton(error.storyPage) : ""}</div>`;
}

/** Render at the failed subview, without replacing its controls or other errors. */
function showEditorError(root, block, error) {
  if (!root?.isConnected) {
    // Failed writes can finish after navigation. Keep their named block visible
    // on the current page rather than losing the error with the detached panel.
    root = document.querySelector("#content");
    if (!root) throw error;
  }
  let host = [...root.children].find(node => node.dataset.editorErrorBlock === block);
  if (!host) {
    host = document.createElement("div");
    host.dataset.editorErrorBlock = block;
    root.prepend(host);
  }
  host.innerHTML = editorErrorMarkup(block, error);
}

// @editor-module 画布视口的缩放、平移与坐标换算。

const scales = [0.125, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 16, 24, 32, 48, 64];
const presets = scales.filter(scale => scale <= 16);
const controllers = new WeakMap();
const pendingLayouts = new Map();
let layoutFrame = null;

function flushCanvasViewportLayouts() {
  if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  const jobs = [...pendingLayouts].filter(([viewport]) => viewport.isConnected).map(([, job]) => job);
  pendingLayouts.clear();
  const measurements = jobs.map(job => job.measure());
  const applied = jobs.map((job, index) => job.apply(measurements[index]));
  jobs.forEach((job, index) => {if (applied[index]) job.after();});
}

function scheduleLayout(viewport, job) {
  pendingLayouts.set(viewport, job);
  if (layoutFrame === null) layoutFrame = requestAnimationFrame(flushCanvasViewportLayouts);
}

const clampScale = value => Math.max(0.125, Math.min(64, Number(value)));

function canvasViewportControls(label = "画布缩放") {
  return `<div class="canvas-viewport-controls">
    <button type="button" class="button ghost" data-canvas-zoom-step="-1" title="缩小">−</button>
    <input type="range" min="-3" max="6" step="0.001" value="0" data-canvas-zoom-range aria-label="${esc(label)}">
    <select data-canvas-zoom aria-label="缩放档位"><option value="fit">适应</option>${presets.map(scale =>
      `<option value="${scale}">${scale * 100}%</option>`).join("")}<option value="custom" disabled>自定</option></select>
    <button type="button" class="button ghost" data-canvas-zoom-step="1" title="放大">＋</button>
    <button type="button" class="button ghost" data-canvas-zoom-fit>适应</button>
    <output data-canvas-zoom-value></output>
  </div>`;
}

function canvasViewportPoint(surface, point, {width, height} = {}) {
  const rect = surface.getBoundingClientRect();
  return {x: (point.clientX - rect.left) * (width || surface.width) / rect.width,
    y: (point.clientY - rect.top) * (height || surface.height) / rect.height};
}

function bindCanvasViewport({viewport, surface, controls, key, size = () => surface,
  sizeElement = surface, zoom = "fit", fitAlignment = {x: .5, y: .5},
  onChange = () => {}, onLayout = () => {}, canPan = () => true, retainWhenDetached = false} = {}) {
  if (!viewport || !surface || !controls) return null;
  if (controllers.has(viewport)) return controllers.get(viewport);
  const storageKey = `canvas-viewport:${key}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* 本机值缺失时使用初值。 */ }
  let mode = saved?.zoom === "fit" ? "fit"
    : Number.isFinite(saved?.zoom) ? clampScale(saved.zoom) : zoom;
  let panX = Number.isFinite(saved?.x) ? saved.x : 0;
  let panY = Number.isFinite(saved?.y) ? saved.y : 0;
  let scale = 1;
  let lastLayout;
  let viewportSize;
  let drag = null;
  let suppressClick = false;
  const listeners = [];
  const listen = (target, event, callback, options = {}) => {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  };
  viewport.classList.add("canvas-viewport");
  surface.dataset.canvasViewportSurface = "";
  const surfaceDimensions = () => {
    const value = size();
    return {width: Number(value.width) || 256, height: Number(value.height) || 240};
  };
  const geometry = (bounds = null) => {
    const {width, height} = surfaceDimensions();
    const viewportWidth = bounds?.width ?? viewport.clientWidth;
    const viewportHeight = bounds?.height ?? viewport.clientHeight;
    const fit = Math.min(viewportWidth / width, viewportHeight / height);
    const pixelSurface = surface.matches("canvas") || surface.querySelector("canvas");
    return {width, height, viewportWidth, viewportHeight,
      fit: pixelSurface && fit >= 1 ? Math.floor(fit) : fit};
  };
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({zoom: mode, x: panX, y: panY})); }
    catch { /* 本机存储不可用时保留页内值。 */ }
    onChange(mode);
  };
  const applyLayout = ({width, height, viewportWidth, viewportHeight, fit}) => {
    if (!(fit > 0)) return;
    scale = mode === "fit" ? fit : clampScale(mode);
    const values = [width, height, viewportWidth, viewportHeight, scale, mode, panX, panY];
    if (lastLayout && values.every((value, index) => value === lastLayout[index])) return false;
    lastLayout = values;
    surface.style.width = `${width * scale}px`;
    surface.style.height = `${height * scale}px`;
    surface.style.left = `${(viewportWidth - width * scale) * (mode === "fit" ? fitAlignment.x : .5) + panX}px`;
    surface.style.top = `${(viewportHeight - height * scale) * (mode === "fit" ? fitAlignment.y : .5) + panY}px`;
    const range = controls.querySelector("[data-canvas-zoom-range]");
    const percentage = `${Math.round(scale * 1000) / 10}%`;
    range.value = String(Math.log2(scale));
    range.setAttribute("aria-valuetext", percentage);
    controls.querySelector("[data-canvas-zoom]").value = mode === "fit" ? "fit"
      : presets.includes(scale) ? String(scale) : "custom";
    controls.querySelector("[data-canvas-zoom-value]").textContent = percentage;
    return true;
  };
  const layout = (measurements = geometry()) => {
    pendingLayouts.delete(viewport);
    if (applyLayout(measurements)) onLayout();
  };
  const schedule = () => {
    if (viewport.isConnected && viewportSize) scheduleLayout(viewport,
      {measure: () => geometry(viewportSize), apply: applyLayout, after: onLayout});
  };
  const setZoom = (next, point = null) => {
    if (next === "fit" && !point) {
      panX = 0; panY = 0; mode = "fit";
      schedule(); persist();
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const x = point ? point.clientX - rect.left - viewport.clientLeft - viewport.clientWidth / 2 : 0;
    const y = point ? point.clientY - rect.top - viewport.clientTop - viewport.clientHeight / 2 : 0;
    const {width, height, viewportWidth, viewportHeight, fit} = geometry();
    const offsetX = panX + (mode === "fit" ? (viewportWidth - width * scale) * (fitAlignment.x - .5) : 0);
    const offsetY = panY + (mode === "fit" ? (viewportHeight - height * scale) * (fitAlignment.y - .5) : 0);
    const nextScale = next === "fit" ? fit : clampScale(next);
    if (!(nextScale > 0)) return;
    panX = next === "fit" ? 0 : x - (x - offsetX) * nextScale / scale;
    panY = next === "fit" ? 0 : y - (y - offsetY) * nextScale / scale;
    mode = next === "fit" ? "fit" : nextScale;
    layout({width, height, viewportWidth, viewportHeight, fit});
    persist();
  };
  const panBy = (x, y) => { panX += x; panY += y; layout(); persist(); };
  const step = direction => setZoom(direction > 0
    ? scales.find(value => value > scale + .001) ?? scales.at(-1)
    : scales.findLast(value => value < scale - .001) ?? scales[0]);
  listen(controls.querySelector("[data-canvas-zoom]"), "change", event =>
    setZoom(event.target.value === "fit" ? "fit" : Number(event.target.value)));
  listen(controls.querySelector("[data-canvas-zoom-range]"), "input", event => setZoom(2 ** Number(event.target.value)));
  controls.querySelectorAll("[data-canvas-zoom-step]").forEach(button =>
    listen(button, "click", () => step(Number(button.dataset.canvasZoomStep))));
  listen(controls.querySelector("[data-canvas-zoom-fit]"), "click", () => setZoom("fit"));
  listen(viewport, "wheel", event => {
    if (!event.deltaY) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    setZoom(scale * Math.exp(-delta * .0015), event);
  }, {passive: false});
  listen(viewport, "pointerdown", event => {
    suppressClick = false;
    if (![0, 1].includes(event.button) || !canPan(event)) return;
    if (event.button === 1) event.preventDefault();
    viewport.ownerDocument.getSelection()?.removeAllRanges();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, moved: false};
  });
  for (const type of ["selectstart", "dragstart"]) listen(viewport, type, event => {
    if (drag) event.preventDefault();
  });
  listen(viewport, "pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    if ((event.buttons & 5) === 0) { release(event); return; }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) viewport.setPointerCapture(event.pointerId);
    drag.moved = true;
    suppressClick = true;
    viewport.classList.add("is-panning");
    panX = drag.panX + dx;
    panY = drag.panY + dy;
    layout();
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    if (drag.moved) persist();
    drag = null;
    viewport.classList.remove("is-panning");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(viewport, type, release);
  listen(viewport, "click", event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, {capture: true});
  listen(viewport, "auxclick", event => { if (event.button === 1) event.preventDefault(); });
  listen(viewport, "keydown", event => {
    if (event.target !== viewport || event.altKey || event.metaKey) return;
    const directions = {ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40]};
    if (["+", "=", "-", "_"].includes(event.key)) step(["+", "="].includes(event.key) ? 1 : -1);
    else if (event.key === "0") setZoom(1);
    else if (directions[event.key]) panBy(...directions[event.key].map(value => value * (event.shiftKey ? 4 : 1)));
    else return;
    event.preventDefault();
  });
  const observer = new ResizeObserver(() => {
    if (!viewport.isConnected) { if (!retainWhenDetached) controller.destroy(); return; }
    viewportSize = {width: viewport.clientWidth, height: viewport.clientHeight};
    schedule();
  });
  const dimensions = new MutationObserver(schedule);
  dimensions.observe(sizeElement, {attributes: true,
    attributeFilter: ["width", "height", "data-stage-width", "data-stage-height"]});
  const controller = {layout: schedule, setZoom, panBy, zoom: () => mode,
    point: point => canvasViewportPoint(surface, point, surfaceDimensions()),
    center: (x, y) => {
      const {width, height} = surfaceDimensions();
      panX = (width / 2 - x) * scale;
      panY = (height / 2 - y) * scale;
      layout(); persist();
    },
    destroy: () => {
      observer.disconnect(); dimensions.disconnect();
      pendingLayouts.delete(viewport);
      listeners.forEach(remove => remove());
      controllers.delete(viewport);
    }};
  controllers.set(viewport, controller);
  observer.observe(viewport);
  schedule();
  return controller;
}

// @editor-module 场景加载状态与角色初始动作的当前值投影。
const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneRemapItems(sceneId, lifecycle) {
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap'
    && row.source_scene_reference === `scene:${hex$1(sceneId)}`).map(row => ({
      ...row, key: `scene-state:${row.handle}`, id: row.handle,
      label: `${row.global_event_flag_reference} = 1 → ${row.target_scene_reference}`,
    }));
}

function sceneActorEntryStates(record, scripts, story) {
  const script = scripts?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  if (!script) return [];
  const bytes = scripts.layout ? storyScriptBytecode(scripts, script.id, {lazy: true})
    : {length: script.bytecode.length, byteAt: index => script.bytecode[index]};
  const handlers = new Map((story?.vm?.handlers || []).map(row => [Number(row.opcode), row]));
  const semantics = new Map((story?.browser_vm?.opcode_semantics || []).map(row => [Number(row.opcode), row]));
  const poses = [];
  const emit = (pose, flags, cursor) => {
    if (pose.actor_type >= 0x80 || pose.x < 0 || pose.y < 0 || pose.x >= 64 || pose.y >= 64) return;
    if (pose.actor_type === Number(record.actor_type) && pose.x === Number(record.x)
        && pose.y === Number(record.y) && pose.render_slot_marker === Number(record.render_slot_marker)) return;
    const conditions = [...flags].map(([flag, set]) => `global-event-flag:${hex$1(flag)} = ${Number(set)}`);
    poses.push({...pose, scriptId: Number(script.id), cursor, conditions});
  };
  const walk = (cursor, pose, flags, assignedFlags, visited) => {
    const key = `${cursor}/${JSON.stringify([...flags])}/${JSON.stringify([...assignedFlags])}`;
    if (visited.has(key) || visited.size >= bytes.length) { emit(pose, flags, cursor); return; }
    const opcode = bytes.byteAt(cursor), handler = handlers.get(opcode), semantic = semantics.get(opcode);
    if (!handler || !semantic || (semantic.fidelity !== 'exact' && semantic.operation !== 'sound-command')) {
      emit(pose, flags, cursor); return;
    }
    const nextVisited = new Set(visited).add(key);
    const next = cursor + Number(handler.fixed_advance);
    const operand = index => bytes.byteAt(cursor + 1 + index);
    const step = (target = next, value = pose, condition = flags, assigned = assignedFlags) =>
      walk(target, value, condition, assigned, nextVisited);
    const flagBranch = (flag, set, action) => {
      if (!Number.isInteger(flag)) return;
      if (assignedFlags.has(flag)) {
        if (assignedFlags.get(flag) === set) action(flags);
        return;
      }
      if (flags.has(flag) && flags.get(flag) !== set) return;
      action(new Map(flags).set(flag, set));
    };
    switch (semantic.operation) {
      case 'branch-if-event-flag-clear':
        flagBranch(operand(0), true, condition => step(next, pose, condition));
        flagBranch(operand(0), false, condition => step((cursor + operand(semantic.branch_operand_index)) & 255, pose, condition));
        return;
      case 'remove-actor-if-event-flag-set':
        flagBranch(operand(0), false, condition => step(next, pose, condition));
        return;
      case 'set-event-flag':
      case 'clear-event-flag':
        step(next, pose, flags, new Map(assignedFlags).set(operand(0), semantic.operation === 'set-event-flag'));
        return;
      case 'relative-cursor-advance': step((cursor + operand(0)) & 255); return;
      case 'set-actor-type-animation-renderer':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 0}); return;
      case 'set-actor-type':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0)}); return;
      case 'set-direct-frame-id':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 1}); return;
      case 'set-actor-position':
        if (!Number.isInteger(operand(0)) || !Number.isInteger(operand(1))) return;
        step(next, {...pose, x: operand(0), y: operand(1)}); return;
      case 'set-direction':
        step(next, {...pose, direction_name: semantic.direction,
          direction: ['up', 'down', 'left', 'right'].indexOf(semantic.direction)}); return;
      case 'sound-command':
        step(); return;
      default: emit(pose, flags, cursor);
    }
  };
  walk(0, {actor_type: Number(record.actor_type), x: Number(record.x), y: Number(record.y),
    render_slot_marker: Number(record.render_slot_marker), direction: Number(record.direction),
    direction_name: record.direction_name}, new Map(), new Map(), new Set());
  return [...new Map(poses.map(pose => [JSON.stringify(pose), pose])).values()];
}

function sceneActorStateObjects(object, scripts, story) {
  return sceneActorEntryStates(object.record, scripts, story).map((pose, index) => ({
    ...object, key: `${object.key}:state:${index}`, pose,
  }));
}

// @editor-module 自主脚本在场景中的条件与交互投影。
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

const PRESENTATIONS = new Map([
  ['branch-if-event-flag-clear', ['事件位条件', ['条件事件位', '分支位移']]],
  ['remove-actor-if-event-flag-set', ['条件消失', ['消失事件位']]],
  ['wait-event-flag-set', ['等待事件位', ['等待事件位']]],
  ['set-event-flag', ['写入事件位', ['写入事件位']]],
  ['clear-event-flag', ['清除事件位', ['清除事件位']]],
  ['set-actor-position', ['角色位置', ['位置 X', '位置 Y']]],
  ['move-actor-to-position', ['移动', ['移动 X', '移动 Y']]],
  ['branch-on-player-position-exact', ['玩家位置条件', ['触发 X', '触发 Y', '不匹配位移']]],
  ['branch-on-player-position-rectangle', ['玩家范围条件',
    ['触发 X 起点', '触发 X 上界', '触发 Y 起点', '触发 Y 上界', '范围外位移']]],
  ['branch-on-player-direction', ['玩家朝向条件', ['触发朝向', '不匹配位移']]],
  ['set-motion-attributes', ['移动属性', ['移动属性']]],
  ['start-scripted-encounter', ['战斗', ['战斗编队', '胜利事件位', '剧情状态']]],
  ['end-story-state-with-scene-context', ['退出场景', []]],
  ['relative-cursor-advance', ['跳转', ['跳转位移']]],
  ['countdown-relative-branch', ['循环', ['循环位移', '循环次数']]],
  ['branch-if-runtime-result-nonzero', ['结果条件', ['分支位移']]],
  ['branch-if-runtime-slot-empty', ['空槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-slot-present', ['占用槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-party-actor-type-absent', ['队伍形象条件', ['角色形象', '分支位移']]],
  ['branch-if-runtime-slot-is-not-player-actor', ['队员条件', ['队伍槽', '分支位移']]],
  ['wander-inside-rectangle', ['移动范围', ['X 起点', 'X 上界', 'Y 起点', 'Y 上界']]],
  ['follow-rom-waypoint-loop', ['循环路径', ['路径']]],
  ['play-render-slot-offset-sequence', ['位置变化序列', ['序列', '角色形象']]],
  ['play-table-driven-actor-transformation', ['形象变化序列', ['序列']]],
  ['set-direct-frame-id', ['单帧形象', ['单帧形象']]],
  ['set-actor-type-animation-renderer', ['动画形象', ['角色形象']]],
  ['set-actor-type', ['角色形象', ['角色形象']]],
  ['replace-runtime-player-actor-type', ['队伍形象替换', ['原形象', '新形象']]],
  ['set-packed-camera-relative-position', ['镜头相对位置', ['相对位置']]],
  ['wait-operand-frames', ['等待', ['等待帧数']]],
  ['drive-scripted-input', ['自动输入', ['移动步数']]],
  ['sound-command', ['音频', ['音频命令']]],
  ['set-dialogue-actor-parameter', ['对话角色', ['对话角色']]],
  ['start-blocking-dialogue', ['文字', ['文字记录']]],
  ['start-blocking-ui-action', ['文字', ['文字记录']]],
  ['advance-global-screen-effect', ['画面效果', ['效果轮数']]],
  ['set-global-parameter', ['全局参数', ['全局参数']]],
  ['set-story-parameter', ['剧情参数', ['剧情参数']]],
  ['set-runtime-parameter-$9c', ['运行参数 9C', ['参数']]],
  ['set-runtime-parameter-$a2', ['运行参数 A2', ['参数']]],
  ['enter-dedicated-field-mode', ['场景模式', ['模式']]],
  ['set-runtime-party-slot-index', ['队伍槽', ['队伍槽']]],
  ['adopt-runtime-entity-state', ['接管现场角色', ['现场角色']]],
  ['transfer-actor-to-runtime-entity', ['转交队伍角色', ['队伍槽']]],
  ['subtract-party-money', ['扣除金钱', ['金额']]],
  ['write-field-tile-at-actor', ['角色位置地形', ['元图块']]],
  ['step-by-rom-direction-table', ['方向表移动', []]],
  ['step-toward-story-target', ['趋向目标', []]],
  ['attempt-tile-step', ['格步', []]],
  ['advance-wander-motion', ['游走', []]],
  ['move-actor-off-map', ['移出场景', []]],
  ['toggle-player-control-lock', ['切换操控锁', []]],
  ['clear-runtime-entity-render-slots', ['清除现场角色', []]],
  ['remove-actor', ['移除角色', []]],
  ['initialize-actor-motion-state', ['初始化移动', []]],
  ['face-opposite-runtime-direction', ['背向玩家', []]],
  ['set-direction', ['朝向', []]],
  ['end-actor-script', ['脚本结束', []]],
  ['set-runtime-entity-direction', ['现场角色朝向', []]],
  ['refresh-field-state', ['刷新场景状态', []]],
  ['mutate-field-tile-near-actor', ['附近地形变化', []]],
  ['pop-story-actor-slot', ['移除末尾角色', []]],
  ['wait', ['等待', []]],
]);

function storySceneDialogueReferences(action) {
  const ui = action.command.blocking_ui;
  if (!ui) return [];
  // 文字区与记录双操作数沿用剧情生产端的 $26 读写定义。
  const variableRegion = action.command.opcode === 0x26;
  const index = variableRegion ? 1 : ui.record_operand_index ?? action.semantic.record_operand_index ?? 0;
  return [{index, regionId: variableRegion ? action.operands[0] : ui.region_id,
    recordId: action.operands[index]}];
}

function storySceneActionPresentation(action) {
  const definition = PRESENTATIONS.get(action.operation);
  if (!definition) return null;
  const [label, names] = definition;
  const labels = action.command.opcode === 0x26 ? ['文字区', '文字记录'] : names;
  const flags = ['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set',
    'wait-event-flag-set', 'set-event-flag', 'clear-event-flag'].includes(action.operation);
  const directions = {up: '上', down: '下', left: '左', right: '右'};
  const value = action.semantic.direction ? directions[action.semantic.direction]
    : action.operation === 'wait' ? `${action.semantic.frames} 帧`
      : action.operation === 'drive-scripted-input' ? directions[
        ['up', 'down', 'left', 'right'][action.semantic.input_value - 1]] : '';
  return {label, value, operands: labels.map((label, index) => ({label, index,
    eventFlag: flags && index === 0 || action.operation === 'start-scripted-encounter' && index === 1})),
    destination: action.operation === 'end-story-state-with-scene-context'};
}

async function prepareStorySceneActions(records, document, story, database) {
  const ids = [...new Set(records.map(row => Number(row.autonomous_script_id)))];
  const entries = ids.filter(id => id > 0 && !story?.browser_vm?.programs?.some(row =>
    row.kind === 'autonomous' && Number(row.id) === id)).map(id =>
    story?.autonomous?.entries?.find(row => Number(row.id) === id)).filter(row => row?.path);
  const programs = await Promise.all(entries.map(entry =>
    database.getPackageDocument(`game/story/${entry.path}`, null)));
  const projection = Object.assign(Object.create(document), {
    scene_action_programs: programs.filter(program => program?.kind === 'autonomous')});
  const origin = projectFieldDraftOrigin(document);
  return origin ? trackProjectFieldProjection(projection, origin,
    () => projectFieldDraftRevision(document)) : projection;
}

function storySceneActions(record, document, story) {
  const script = document?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  let programs = [...(story?.browser_vm?.programs || []), ...(document?.scene_action_programs || [])]
    .filter(row => row.kind === 'autonomous');
  if (document?.layout) programs = projectStoryScriptPrograms(document, programs);
  const program = programs
    .find(row => row.kind === 'autonomous' && Number(row.id) === Number(script?.id));
  if (!script || !program) return [];
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row => [row.opcode, row]));
  const segments = (document.scripts || []).map(script => ({script,
    range: story.autonomous.entries.find(row => Number(row.id) === Number(script.id))?.encoded_range}))
    .filter(row => row.range);
  const fieldAt = offset => {
    const segment = segments.find(row => offset >= row.range.start_prg
      && offset < row.range.end_prg_exclusive);
    if (!segment) return null;
    const byteIndex = offset - segment.range.start_prg;
    return {entityHandle: `story-autonomous-script:script:${hex(segment.script.id)}`,
      byteIndex, value: segment.script.bytecode[byteIndex]};
  };
  return program.commands.flatMap(command => {
    const cursor = Number(command.cursor);
    const declared = command.instructionBindings;
    const bound = index => {
      const binding = declared?.[index];
      if (!binding) return null;
      return binding.kind === 'sequence' ? {entityHandle: 'story-autonomous-script:pool',
        tokenId: binding.tokenId, operandIndex: binding.index, value: index ? command.currentOperands[index - 1] : command.opcode}
        : {entityHandle: binding.handle, byteIndex: binding.byteIndex,
          value: index ? command.currentOperands[index - 1] : command.opcode};
    };
    const location = declared ? bound(0) : fieldAt(command.prg_offset);
    if (!location || location.value !== command.opcode) return [];
    const semantic = semantics.get(command.opcode);
    if (!semantic) return [];
    const operandFields = Array.from({length: 5}, (_, index) => declared ? bound(index + 1) : fieldAt(command.prg_offset + index + 1));
    return [{cursor, operation: semantic.operation, semantic, command,
      handle: location.entityHandle, byteCursor: location.byteIndex, operandFields,
      operands: operandFields.map(field => field?.value)}];
  });
}

function storyActorCondition(record, document, story, actors) {
  const actions = storySceneActions(record, document, story);
  const action = actions.find(row => row.cursor === 0);
  if (!action || !['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set'].includes(action.operation)) return null;
  const flag = action.operands[0];
  let removedWhenSet = action.operation === 'remove-actor-if-event-flag-set';
  const clearCursor = action.operands[action.semantic.branch_operand_index];
  for (let cursor = action.command.normal_advance; cursor < clearCursor;) {
    const step = actions.find(row => row.cursor === cursor);
    if (!step) break;
    if (step.operation === 'remove-actor') {removedWhenSet = true; break;}
    if (step.semantic.fidelity !== 'exact' || step.command.terminal_side_effect
        || step.command.edges.some(edge => edge.kind !== 'normal')
        || !(step.command.normal_advance > 0)) break;
    cursor += step.command.normal_advance;
  }
  const poses = sceneActorStateObjects({record}, document, story).map(row => row.pose);
  const triggers = (actors?.records || []).filter(row => row.entry_id === record.entry_id)
    .flatMap(actor => storySceneActions(actor, document, story).filter(row =>
      row.operation === 'start-scripted-encounter' && row.operands[1] === flag)
      .map(() => ({flag, label: '战斗胜利', reference: actor.uid,
        scene_id: actor.entry_id, object: `actor:${actor.id}`})));
  return {label: '自主动作条件', flags: [flag], flag_labels: {[flag]: '事件位'},
    triggers, states: [false, true].map(set => ({id: set ? 'set' : 'clear',
      label: `${hex(flag)} = ${Number(set)}`, cells: [],
      actor_hidden: set && removedWhenSet,
      actor_pose: poses.find(pose => pose.conditions.includes(`global-event-flag:${hex(flag)} = ${Number(set)}`)),
    }))};
}

// @editor-module owner 模块向消费页公开可嵌入 UI 能力
//
// 模块图决定数据与引用归属；本注册表只决定一个 owner 怎样提供可嵌入的
// reference / preview / cover。编辑控件只由字段对象提供。
// 消费页按 `module id + component kind` 取组件，
// 不再复制名称解析、候选目录、缩略图和水合代码。字段结构、编码与保存规则仍是
// 模块专有函数，不在这里描述，因而这不是通用表单 schema 或逐字节解释器。


const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const COMPONENT_KIND = /^[a-z][a-z0-9-]*$/u;
const registry = new Map();
const fallbacks = new Map();
const hydrationByHost = new WeakMap();

function identity(moduleId, kind) {
  const normalizedModule = String(moduleId || "");
  const normalizedKind = String(kind || "");
  if (!MODULE_ID.test(normalizedModule)) {
    throw new TypeError(`模块组件 ID 无效：${normalizedModule || "（空）"}`);
  }
  if (!COMPONENT_KIND.test(normalizedKind)) {
    throw new TypeError(`模块组件类型无效：${normalizedKind || "（空）"}`);
  }
  return {moduleId: normalizedModule, kind: normalizedKind};
}

function componentKey(moduleId, kind) {
  return `${moduleId}:${kind}`;
}

function validateDefinition(moduleId, kind, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`${moduleId}:${kind} 必须提供组件定义`);
  }
  if (typeof definition.render !== "function") {
    throw new TypeError(`${moduleId}:${kind} 缺少 render`);
  }
  for (const hook of ["prepare", "hydrate", "sync", "dispose"]) {
    if (definition[hook] !== undefined && typeof definition[hook] !== "function") {
      throw new TypeError(`${moduleId}:${kind}.${hook} 必须是函数`);
    }
  }
  return Object.freeze({...definition});
}

/** owner 可分散登记 reference / preview / cover，但同种能力只有一个实现。 */
function registerModuleComponent(moduleId, kind, definition) {
  const id = identity(moduleId, kind);
  if (id.kind === "editor") {
    throw new TypeError("editor 不能作为通用组件");
  }
  const key = componentKey(id.moduleId, id.kind);
  if (registry.has(key)) {
    throw new TypeError(`模块组件重复登记：${key}`);
  }
  registry.set(key, validateDefinition(id.moduleId, id.kind, definition));
}

/**
 * 所有 owner 都有的保底嵌入能力。精确登记始终优先；fallback 只提供身份卡，
 * 不包含 editor、ROM 字段、编码或模块专有布局。
 */
function registerModuleComponentFallback(kind, definition) {
  const normalizedKind = identity("fallback", kind).kind;
  if (normalizedKind === "editor") {
    throw new TypeError("editor 禁止 fallback");
  }
  if (fallbacks.has(normalizedKind)) {
    throw new TypeError(`模块组件 fallback 重复登记：${normalizedKind}`);
  }
  fallbacks.set(
    normalizedKind,
    validateDefinition("fallback", normalizedKind, definition),
  );
}

function moduleComponentDefinition(moduleId, kind) {
  const id = identity(moduleId, kind);
  return registry.get(componentKey(id.moduleId, id.kind))
    || fallbacks.get(id.kind)
    || null;
}

/** 异步读取 owner 资源、目录或缓存；render 本身继续保持纯同步字符串函数。 */
async function prepareModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  if (!definition.prepare) return props;
  const prepared = await definition.prepare({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
  });
  return prepared === undefined ? props : prepared;
}

/** owner 渲染根节点时带上这两个属性，通用水合器才能按模块把行为送回 owner。 */
function moduleComponentAttributes(moduleId, kind) {
  const id = identity(moduleId, kind);
  return `data-module-component-module="${esc(id.moduleId)}" `
    + `data-module-component-kind="${esc(id.kind)}"`;
}

/** 消费页唯一需要调用的渲染入口。具体 HTML 仍由 owner 的 render 决定。 */
function renderModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) {
    throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  }
  return definition.render({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
    componentAttributes: moduleComponentAttributes(id.moduleId, id.kind),
  });
}

function componentHosts(root) {
  if (!root) return [];
  const selector = "[data-module-component-module][data-module-component-kind]";
  return [
    ...(root.matches?.(selector) ? [root] : []),
    ...(root.querySelectorAll?.(selector) || []),
  ].filter(host => {
    const menu = host.closest(".module-reference-picker-menu");
    const picker = menu?.closest("[data-save-item-picker]");
    return !picker || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
}

async function hydrateHost(host) {
  if (host.dataset.moduleComponentHydrated === "1") return;
  const pending = hydrationByHost.get(host);
  if (pending) return pending;
  const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
  const id = identity(moduleId, kind);
  const key = componentKey(id.moduleId, id.kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
  let resolveHydration;
  let rejectHydration;
  const hydration = new Promise((resolve, reject) => {
    resolveHydration = resolve;
    rejectHydration = reject;
  });
  // 先公布进行中的任务，再调用 owner hook。这样重入会复用同一个 Promise，
  // 而场景过滤/键盘绑定这类同步工作仍在 DOM 交给用户前立即完成。
  hydrationByHost.set(host, hydration);
  void (async () => {
    try {
      if (definition.hydrate) await definition.hydrate(host, {
        moduleId: id.moduleId,
        componentKind: id.kind,
      });
      host.dataset.moduleComponentHydrated = "1";
      resolveHydration();
    } catch (error) {
      rejectHydration(error);
    } finally {
      hydrationByHost.delete(host);
    }
  })();
  return hydration;
}

/**
 * 页面只调一次统一水合；首次渲染与局部刷新即使重叠，也会复用同一宿主正在进行的
 * Promise。模块 hook 只拿到自己的宿主，不会越过边界扫描或重复绑定相邻组件。
 */
async function hydrateModuleComponents(root = document) {
  await Promise.all(componentHosts(root).map(hydrateHost));
}

/** Original 恢复或共享字段联动后，让各 owner 从原生控件重新同步自己的组件。 */
function syncModuleComponents(root = document) {
  const groups = new Map();
  for (const host of componentHosts(root)) {
    const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
    const id = identity(moduleId, kind);
    const key = componentKey(id.moduleId, id.kind);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(host);
  }
  for (const [key] of groups) {
    const [moduleId, ...kindParts] = key.split(":");
    const kind = kindParts.join(":");
    const definition = moduleComponentDefinition(moduleId, kind);
    if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
    definition.sync?.(root);
  }
}

/** 只供目录页与薄合同枚举能力；页面不能靠这个结果猜字段或保存方式。 */

// @editor-module 位图字节投影按读取位置解引用当前字段值。
function indexedByteSource(length, readByte) {
  const index = value => Number.isInteger(Number(value)) && Number(value) >= 0 && String(Number(value)) === value;
  const range = (start = 0, end = length) => {
    const bound = value => value < 0 ? Math.max(0, length + Math.trunc(value)) : Math.min(length, Math.trunc(value));
    start = bound(start); end = Math.max(start, bound(end));
    return Uint8Array.from({length: end - start}, (_, offset) => readByte(start + offset));
  };
  return new Proxy({length, slice: range, subarray: range,
    *[Symbol.iterator]() {for (let offset = 0; offset < length; offset++) yield readByte(offset);}}, {
    get(target, key, receiver) {
      if (typeof key === 'string' && index(key)) return Number(key) < length ? readByte(Number(key)) : undefined;
      return Reflect.get(target, key, receiver);
    },
  });
}

// @editor-module 将已发布 Web 媒体 JSON 解码为字节与 CHR pattern 表。
//
// 物理地址的唯一权威仍是 resource-byte-ranges；这里仅负责把项目中已经提取出的
// JSON 表示还原成浏览器可组合的媒体数据。预览代码不得以地址为由去读 ROM/.bin。


const chrBankFieldCaches = new Map();
const webByteCaches = new WeakMap();

async function composeCorePatternTable({lazy = false} = {}) {
  const [core, characters] = await Promise.all([
    db.getResourceDocument('core-latin'), db.getResourceDocument('char'),
  ]);
  const slots = core?.font_template?.slots;
  if (slots?.length !== 128) throw new TypeError('核心字模模板槽数量无效');
  const origin = projectFieldDraftOrigin(characters) || characters;
  const glyphs = new Map(origin.records.flatMap((record, index) => record.kind === 'core-8x8'
    ? [[record.handle, index]] : []));
  const bitmap = slot => slot.glyph_reference
    ? characters.records[glyphs.get(slot.glyph_reference)]?.core_glyph_bitmap : slot.opaque_bitmap;
  if (lazy) return indexedByteSource(2048, offset => {
    const slot = slots[Math.floor(offset / 16)];
    const values = bitmap(slot);
    if (!Array.isArray(values) || values.length !== 16 || slot.glyph_index !== Math.floor(offset / 16))
      throw new TypeError('核心字模位图或引用无效');
    return byte(values[offset % 16], '核心字模');
  });
  const bytes = new Uint8Array(2048);
  for (const slot of slots) {
    const values = bitmap(slot);
    if (!Array.isArray(values) || values.length !== 16 || !Number.isInteger(slot.glyph_index)
        || slot.glyph_index < 0 || slot.glyph_index > 127)
      throw new TypeError('核心字模位图或引用无效');
    bytes.set(values.map(value => byte(value, '核心字模')), slot.glyph_index * 16);
  }
  return bytes;
}

function chrPatternByteSource(document, bankIds) {
  const origin = projectFieldDraftOrigin(document) || document;
  const banks = new Map(origin.banks.map((bank, index) => [bank.id, index]));
  if (!bankIds.length || bankIds.some(id => !banks.has(id))) throw new TypeError('CHR pattern 表缺少已发布 bank');
  const values = new Map();
  return indexedByteSource(bankIds.length * 1024, offset => {
    const bank = bankIds[Math.floor(offset / 1024)], local = offset % 1024;
    const tile = Math.floor(local / 16), plane = local % 16 < 8 ? 'plane_0' : 'plane_1';
    const key = `${bank}:${tile}`;
    if (!values.has(key)) values.set(key, document.banks[banks.get(bank)].tiles[tile]);
    return byte(values.get(key)[plane][local % 8], 'CHR 位面');
  });
}

function byte(value, context) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`${context}: 必须是 0..255 的字节`);
  }
  return number;
}

function chrBankId(value) {
  const number = typeof value === "string"
    ? Number.parseInt(value.replace(/^0x/i, ""), 16)
    : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`CHR bank 无效：${value}`);
  }
  return number;
}

function encodeChrBank(bank, expectedId) {
  if (Number(bank?.id) !== expectedId || !Array.isArray(bank?.tiles)) {
    throw new TypeError(`shared-chr-bank 缺少 CHR bank ${expectedId.toString(16).padStart(2, "0")}`);
  }
  const result = new Uint8Array(0x400);
  const seen = new Set();
  for (const tile of bank.tiles) {
    const tileId = Number(tile?.id);
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= 0x40 || seen.has(tileId)) {
      throw new TypeError(`CHR bank ${expectedId.toString(16)} 的 tile id 无效`);
    }
    if (!Array.isArray(tile.plane_0) || tile.plane_0.length !== 8 ||
        !Array.isArray(tile.plane_1) || tile.plane_1.length !== 8) {
      throw new TypeError(`CHR bank ${expectedId.toString(16)} tile ${tileId} 位面无效`);
    }
    const offset = tileId * 16;
    tile.plane_0.forEach((value, row) => {
      result[offset + row] = byte(value, `plane_0[${row}]`);
    });
    tile.plane_1.forEach((value, row) => {
      result[offset + 8 + row] = byte(value, `plane_1[${row}]`);
    });
    seen.add(tileId);
  }
  if (seen.size !== 0x40) {
    throw new TypeError(`CHR bank ${expectedId.toString(16)} 只有 ${seen.size}/64 个 tile`);
  }
  return result;
}

function base64Bytes(value, context) {
  if (typeof value !== "string") {
    throw new TypeError(`${context}: base64 正文必须是字符串`);
  }
  let decoded;
  try {
    decoded = atob(value);
  } catch (error) {
    throw new TypeError(`${context}: base64 正文无效`, {cause: error});
  }
  if (btoa(decoded) !== value) {
    throw new TypeError(`${context}: base64 正文不是 canonical 编码`);
  }
  const result = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    result[index] = decoded.charCodeAt(index);
  }
  return result;
}

/**
 * 把提取阶段发布的 JSON 字节值还原为只读 Uint8Array。
 *
 * 这不是 package binary 适配层：正文、来源地址和摘要都在当前页面已加载的 JSON
 * document 中。缓存以 descriptor identity 为键，项目切换或正文失效后不会串用。
 */
async function decodeWebByteArray(descriptor, context = "Web 媒体资产") {
  if (!descriptor || typeof descriptor !== "object") {
    throw new TypeError(`${context}: 缺少 JSON 字节表示`);
  }
  if (webByteCaches.has(descriptor)) return webByteCaches.get(descriptor);
  const promise = (async () => {
    if (descriptor.schema !== "metalmaxcn.web-byte-array") {
      throw new TypeError(`${context}: JSON 字节 schema 无效`);
    }
    if (descriptor.encoding !== "base64") {
      throw new TypeError(`${context}: JSON 字节 encoding 必须是 base64`);
    }
    const bytes = base64Bytes(descriptor.data, context);
    if (!Number.isInteger(descriptor.length) || descriptor.length < 0
        || descriptor.length !== bytes.length) {
      throw new TypeError(
        `${context}: 声明长度 ${descriptor.length} 与正文 ${bytes.length} 不一致`,
      );
    }
    if (!/^[0-9a-f]{64}$/.test(descriptor.sha256 || "")
        || descriptor.sha256 !== await sha256Hex(bytes)) {
      throw new TypeError(`${context}: SHA-256 与正文不一致`);
    }
    return bytes;
  })();
  webByteCaches.set(descriptor, promise);
  return promise;
}

/**
 * 从 shared-chr-bank Original/Working 读取一个 1 KiB bank。
 *
 * 返回值按字段会话与版本缓存并视为只读；调用方若要修改，必须先 `.slice()`。
 */
async function loadChrBankBytes(bankId) {
  const id = chrBankId(bankId);
  const cached = chrBankFieldCaches.get(id);
  if (cached?.repository === state.projectRepository
      && cached.packageManifest === state.browserPackageManifest) {
    if (cached.pending) return cached.pending;
    try {
      if (cached.field.version === cached.version) return cached.bytes;
    } catch {
      chrBankFieldCaches.delete(id);
    }
  }
  const entry = {repository: state.projectRepository,
    packageManifest: state.browserPackageManifest, pending: null};
  entry.pending = (async () => {
    const index = VISUAL_CHR_BANK_IDS.indexOf(id);
    if (index < 0) throw new TypeError(`shared-chr-bank 缺少 CHR bank ${id.toString(16).padStart(2, "0")}`);
    const objects = await db.getFieldObjects("shared-chr-bank", {offset: index * 64, limit: 64});
    if (objects.length !== 64) throw new TypeError(`shared-chr-bank bank ${id.toString(16)} 缺少 tile`);
    const firstField = objects[0].fields[0];
    const version = firstField.version;
    const tiles = objects.map(object => {
      const planes = new Map(object.fields.map(field => [field.fieldName, field]));
      if (object.fields.some(field => field.recordId !== id))
        throw new TypeError(`shared-chr-bank bank ${id.toString(16)} 字段身份无效`);
      return {id: object.fields[0].tileId,
        plane_0: planes.get("plane_0")?.value, plane_1: planes.get("plane_1")?.value};
    });
    const bytes = encodeChrBank({id, tiles}, id);
    if (chrBankFieldCaches.get(id) === entry) {
      Object.assign(entry, {field: firstField, version, bytes, pending: null});
    }
    return bytes;
  })();
  chrBankFieldCaches.set(id, entry);
  try {
    return await entry.pending;
  } catch (error) {
    if (chrBankFieldCaches.get(id) === entry) chrBankFieldCaches.delete(id);
    throw error;
  }
}

/** shared-chr-bank 里现有的 bank 号，升序。选 bank 的界面按它列举，不猜连续区间。 */
async function listChrBankIds() {
  const document_ = await db.getDocument("shared-chr-bank", null);
  if (!document_ || !Array.isArray(document_.banks)) {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  return document_.banks
    .map(bank => Number(bank?.id))
    .filter(id => Number.isInteger(id) && id >= 0)
    .sort((left, right) => left - right);
}

/** 把若干 1 KiB CHR bank 按给定顺序拼成 PPU pattern table。 */
async function composeChrPatternTable(bankIds) {
  if (!Array.isArray(bankIds) || !bankIds.length) {
    throw new TypeError("CHR pattern table 必须声明 bank 顺序");
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  const result = new Uint8Array(banks.length * 0x400);
  banks.forEach((bank, index) => result.set(bank, index * 0x400));
  return result;
}

// @editor-module CHR 图块光栅化的共享底座
//
// 每个「配方 + shared-chr-bank → 像素」的渲染器都要做同两件事：从图案表里解一个
// 8×8 的 2bpp 图块，然后按调色板画到某个坐标上。这里只放这两件事，别的都不放。
//
// 与 Python 侧的对应（两边必须逐像素一致）：
//   `decodeChrTile`  ← `mm_trace_analyze.decode_chr_tile`
//   `paintChrTile`   ← `mm_visual._paint_tile`
//
// **色号 0 是透明**，画成 `background`（默认与 Python 预览同一个显示衬底色）。
// 那不是 NES 的颜色，只是「透明」的可见表示；真正需要 alpha 的场合传
// `transparent: true` 且 `background: null`。


/** Python 预览用的显示衬底色。黑色轮廓在深色背景上才看得见。 */
const MATTE = Object.freeze([11, 14, 16]);

/** 从 4 KiB（或更长）图案表里解出一个 8×8 图块的 4 色索引。 */
function decodeChrTile(patternTable, tileId) {
  const start = tileId * 16;
  if (start < 0 || start + 16 > patternTable.length) {
    throw new RangeError(`图块 ${tileId} 超出图案表（${patternTable.length} 字节）`);
  }
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = patternTable[start + row];
    const high = patternTable[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] = ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/** 一次解开整张图案表，避免同一图块被反复解。 */
function decodeChrTiles(patternTable) {
  const count = Math.floor(patternTable.length / 16);
  const tiles = new Array(count);
  for (let id = 0; id < count; id += 1) tiles[id] = decodeChrTile(patternTable, id);
  return tiles;
}

/**
 * 把一个已解开的图块画进 RGBA 缓冲区。
 *
 * `palette` 是 4 个 NES 系统调色板下标。`transparent` 为真时色号 0 不落笔
 * （`background` 为 null）或落成衬底色。
 */
function paintChrTile(data, imageWidth, originX, originY, tile, palette, {
  hflip = false, vflip = false, scale = 1,
  transparent = true, background = MATTE,
} = {}) {
  for (let y = 0; y < 8; y += 1) {
    const sourceY = vflip ? 7 - y : y;
    for (let x = 0; x < 8; x += 1) {
      const sourceX = hflip ? 7 - x : x;
      const colorIndex = tile[sourceY * 8 + sourceX];
      let color;
      let alpha = 255;
      if (transparent && colorIndex === 0) {
        if (!background) continue;          // 真 alpha：这一格不落笔
        color = background;
      } else {
        color = nesPalette[palette[colorIndex] & 0x3f];
      }
      for (let sy = 0; sy < scale; sy += 1) {
        const row = (originY + y * scale + sy) * imageWidth;
        for (let sx = 0; sx < scale; sx += 1) {
          const target = (row + originX + x * scale + sx) * 4;
          if (target < 0 || target + 3 >= data.length) continue;
          data[target] = color[0];
          data[target + 1] = color[1];
          data[target + 2] = color[2];
          data[target + 3] = alpha;
        }
      }
    }
  }
}

/** 建一块填好衬底色的 RGBA 缓冲区；`background` 为 null 则全透明。 */
function createRaster(width, height, background = MATTE) {
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [red, green, blue] = background;
    const pixel = new Uint8ClampedArray([red, green, blue, 255]);
    new Uint32Array(data.buffer).fill(new Uint32Array(pixel.buffer)[0]);
  }
  return {width, height, data};
}

/** 把 RGBA 缓冲区画进 canvas。canvas 尺寸随之调整。 */
function blitRaster(canvas, raster) {
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
}

/** `{id, value}` 稳定字节记录 → 扁平 Uint8Array。 */
function byteRecords(records, label) {
  if (!Array.isArray(records) || !records.length) {
    throw new TypeError(`${label}: 缺少稳定字节记录`);
  }
  const result = new Uint8Array(records.length);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const value = Number(record?.value);
    if (!Number.isInteger(id) || id < 0 || id >= records.length || seen.has(id)) {
      throw new TypeError(`${label}: 字节记录 id ${record?.id} 无效或重复`);
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new TypeError(`${label}[${id}]: 字节值必须是 0..255`);
    }
    result[id] = value;
    seen.add(id);
  }
  return result;
}

// @editor-module ROM metasprite 与打包直接帧的浏览器现画
//
// 配方权威是可编辑的 `metasprite-record`：两张指针表加两段紧凑记录区。
// **注意它存的是原始字节，不是解好的 sprite 列表**——`generic_objects` /
// `direct_frames` 那种带 `sprites[]` 的形状只存在于提取期派生的
// `game/visuals/index.json` 里。改了记录区，派生视图不会跟着变，所以这里必须
// 自己重新解码。
//
// 与 Python 侧的对应：
//   `decodeGenericObjects`   ← `mm_visual._generic_objects`（$80B6 记录区）
//   `decodeDirectFrames`     ← `mm_visual._direct_frame_objects`（$915A 打包网格）
//   `metaspriteObjectImage`  ← `mm_visual._render_metasprite_object`
//   `genericSheetImage`      ← `mm_visual._render_generic_sheet`
//   `directFrameSheetImage`  ← `mm_visual._render_direct_frame_sheet`


const GENERIC_POINTER_COUNT = 55;
const DIRECT_FRAME_POINTER_COUNT = 0x46;

const recipeCaches = new WeakMap();
const canvasPaints = new WeakMap();
const sourceCaches$1 = new WeakMap();

// 战斗上下文的调色板：ROM 只存三色，backdrop 由渲染器补 $0F。
const UNIVERSAL_BACKGROUND = 0x0f;

/** 指针表发布成 `{id, pointer_cpu}`（已经是 16 位），不是裸字节。 */
function pointerRecords(records, count, label) {
  if (!Array.isArray(records) || records.length !== count) {
    throw new TypeError(`${label}: 需要 ${count} 条指针记录`);
  }
  const table = new Uint16Array(count);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (!Number.isInteger(id) || id < 0 || id >= count || seen.has(id)) {
      throw new TypeError(`${label}: 指针 id ${record?.id} 无效或重复`);
    }
    if (!Number.isInteger(pointer) || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${label}[${id}]: pointer_cpu 必须是 u16`);
    }
    table[id] = pointer;
    seen.add(id);
  }
  return table;
}


function buildRecipe(document_) {
  const genericPointers = pointerRecords(
    document_?.generic_pointers, GENERIC_POINTER_COUNT, "generic_pointers");
  const genericData = byteRecords(
    document_?.generic_record_region, "generic_record_region");
  const directPointers = pointerRecords(
    document_?.direct_frame_pointers, DIRECT_FRAME_POINTER_COUNT,
    "direct_frame_pointers");
  const directData = byteRecords(
    document_?.direct_frame_record_region, "direct_frame_record_region");
  // 每组补上 backdrop，成为渲染器要的 4 色一组。
  const battle = [];
  for (const record of document_?.battle_sprite_palettes || []) {
    const colors = record?.colors;
    if (!Array.isArray(colors) || colors.length !== 3) {
      throw new TypeError(`战斗精灵调色板 ${record?.id} 必须是 3 色`);
    }
    battle[Number(record.id)] = [UNIVERSAL_BACKGROUND,
      ...colors.map(value => Number(value) & 0x3f)];
  }
  if (!battle.length || battle.some(item => !item)) {
    throw new TypeError("metasprite-record 缺少战斗精灵调色板");
  }
  return {
    genericObjects: decodeGenericObjects(genericPointers, genericData),
    directFrames: decodeDirectFrames(directPointers, directData),
    battlePalettes: Uint8Array.from(battle.flat()),
  };
}

async function metaspriteRecipe() {
  const document_ = db.peekDocument('metasprite-record', null) || await db.getDocument("metasprite-record", null);
  if (!document_) throw new TypeError("metasprite-record 配方正文不可用");
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  return recipe;
}

async function genericMetaspriteObject(objectId) {
  const handle = `metasprite:${Number(objectId).toString(16).toUpperCase().padStart(2, '0')}`;
  const [document, pointer] = await Promise.all([
    db.getDocument('metasprite-record', null), db.getField('metasprite', handle, 'pointer_cpu'),
  ]);
  const owner = fieldOwner('metasprite-record');
  const object = owner.genericObject(document, {id: Number(objectId), handle, pointer});
  if (![3, 48, ...Array.from({length: 12}, (_, index) => 0x16 + index)].includes(Number(objectId))) return object;
  const header = object.source_fields[1];
  const count = await db.getField(header.resource_id, header.entity_handle, header.field);
  return owner.genericObject(document, {id: Number(objectId), handle, pointer, capacity: count.defaultValue});
}

async function directMetaspriteFrame(frameId) {
  const recipe = await metaspriteRecipe();
  const frame = recipe.directFrames.find(row => row.id === frameId);
  if (!frame || frame.runtimeGenerated) throw new TypeError('直接帧缺少当前所属记录');
  return frame;
}

function spriteBounds(sprites) {
  const xs = sprites.map(sprite => sprite.x);
  const ys = sprites.map(sprite => sprite.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX, minY,
    width: Math.max(...xs) + 8 - minX,
    height: Math.max(...ys) + 8 - minY,
  };
}

/** `mm_visual._render_metasprite_object`：定尺画布 + 居中 + 自适应缩放。 */
function metaspriteObjectImage(
  {tiles, palettes}, item,
  {size = 192, scale = 4, background = undefined} = {},
) {
  const raster = createRaster(size, size, background);
  const sprites = (item?.sprites || []).filter(sprite => !sprite.transparentTile);
  if (!sprites.length) return raster;
  const bounds = spriteBounds(sprites);
  const padding = 8;
  const fitScale = Math.min(
    scale,
    Math.max(1, Math.floor((size - padding * 2) / Math.max(1, bounds.width))),
    Math.max(1, Math.floor((size - padding * 2) / Math.max(1, bounds.height))));
  const originX = Math.floor((size - bounds.width * fitScale) / 2)
    - bounds.minX * fitScale;
  const originY = Math.floor((size - bounds.height * fitScale) / 2)
    - bounds.minY * fitScale;
  for (const sprite of sprites) {
    paintChrTile(
      raster.data, size,
      originX + sprite.x * fitScale, originY + sprite.y * fitScale,
      tiles[sprite.tile], palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
      {
        hflip: sprite.horizontalFlip,
        vflip: sprite.verticalFlip,
        scale: fitScale,
        background,
      });
  }
  return raster;
}

/** `mm_visual._render_generic_sheet`：8 列 × 64 px 网格组合表。 */
function genericSheetImage({tiles, palettes}, objects, scale = 3) {
  const cell = 64;
  const columns = 8;
  const rows = Math.ceil(objects.length / columns);
  const width = columns * cell * scale;
  const raster = createRaster(width, rows * cell * scale);
  for (const item of objects) {
    const sprites = item.sprites || [];
    if (!sprites.length) continue;
    const bounds = spriteBounds(sprites);
    const cellX = (item.id % columns) * cell;
    const cellY = Math.floor(item.id / columns) * cell;
    const originX = cellX + Math.floor((cell - bounds.width) / 2) - bounds.minX;
    const originY = cellY + Math.floor((cell - bounds.height) / 2) - bounds.minY;
    for (const sprite of sprites) {
      paintChrTile(
        raster.data, width,
        (originX + sprite.x) * scale, (originY + sprite.y) * scale,
        tiles[sprite.tile],
        palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
        {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip, scale});
    }
  }
  return raster;
}

/** 取一个 metasprite 上下文的绘制输入。`banks` 就是该上下文的四页图案表。 */
async function metaspriteContextSources(banks, palettes = null) {
  const recipe = await metaspriteRecipe();
  const chrDocument = db.peekDocument('shared-chr-bank', null) || await db.getDocument("shared-chr-bank", null);
  let byKey = sourceCaches$1.get(chrDocument);
  if (!byKey || byKey.recipe !== recipe) {
    byKey = {recipe, tiles: new Map()};
    sourceCaches$1.set(chrDocument, byKey);
  }
  const key = banks.join(",");
  if (!byKey.tiles.has(key)) {
    const request = composeChrPatternTable(banks).then(decodeChrTiles);
    byKey.tiles.set(key, request);
    request.catch(() => {if (byKey.tiles.get(key) === request) byKey.tiles.delete(key);});
  }
  return {
    recipe,
    tiles: await byKey.tiles.get(key),
    palettes: palettes ? Uint8Array.from(palettes) : recipe.battlePalettes,
  };
}

/** 当前直接帧正文与已发布的只读 CHR 投影组合。 */
async function metaspriteProjectedSources(patternTable, palettes) {
  return {
    recipe: await metaspriteRecipe(),
    tiles: decodeChrTiles(Uint8Array.from(patternTable)),
    palettes: Uint8Array.from(palettes),
  };
}

/**
 * 渲染后统一扫一遍 `[data-metasprite]` 并批量画。
 *
 * `data-metasprite-banks` 是该上下文的图案表 bank 顺序（逗号分隔），
 * `data-metasprite-kind` 取 `generic-sheet` / `direct-sheet` / `object` / `direct-frame`，
 * `data-metasprite-id` 只在单个对象时需要。
 */
async function paintMetaspriteCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-metasprite]")]
    .filter(canvas => canvas.dataset.metaspritePainted !== '1' && canvas.isConnected);
  if (!canvases.length) return;
  const contexts = new Map();
  await Promise.all(canvases.map(canvas => paintMetaspriteCanvas(canvas, contexts)));
}

async function paintMetaspriteCanvas(canvas, contexts) {
  if (canvas.dataset.metaspritePainted === '1' || !canvas.isConnected) return;
  const pending = canvasPaints.get(canvas);
  if (pending) return pending;
  const painting = (async () => {
    try {
      const banks = String(canvas.dataset.metaspriteBanks || "")
        .split(",").filter(Boolean).map(Number);
      if (!banks.length) throw new TypeError("缺少 metasprite 图案表 bank 顺序");
      const palettes = String(canvas.dataset.metaspritePalettes || "")
        .split(",").filter(Boolean).map(Number);
      const key = JSON.stringify([banks, palettes]);
      if (!contexts.has(key)) contexts.set(key, metaspriteContextSources(
        banks, palettes.length ? palettes : null));
      const sources = await contexts.get(key);
      if (!canvas.isConnected) return;
      const kind = canvas.dataset.metaspriteKind || "generic-sheet";
      let raster;
      if (kind === "generic-sheet") {
        raster = genericSheetImage(sources, sources.recipe.genericObjects);
      } else if (kind === "direct-sheet") {
        raster = genericSheetImage(sources, sources.recipe.directFrames);
      } else {
        const id = Number(canvas.dataset.metaspriteId);
        const list = kind === "direct-frame"
          ? sources.recipe.directFrames : sources.recipe.genericObjects;
        const item = list.find(entry => entry.id === id);
        if (!item) throw new TypeError(`metasprite ${kind} ${id} 不存在`);
        raster = metaspriteObjectImage(sources, item, {
          size: Number(canvas.dataset.metaspriteSize || 192),
        });
      }
      blitRaster(canvas, raster);
      canvas.dataset.metaspritePainted = "1";
      delete canvas.dataset.metaspriteError;
    } catch (error) {
      canvas.dataset.metaspriteError = String(error?.message || error);
    }
  })();
  canvasPaints.set(canvas, painting);
  try {await painting;}
  finally {if (canvasPaints.get(canvas) === painting) canvasPaints.delete(canvas);}
}

// 剧情舞台的 metasprite 精灵表：一格 64 px 的透明画布，横向复制 6 列、纵向 4 行，
// 好让 `background-position` 那套定位方式对所有精灵一致。以前是包内
// `playback/sprites/{generic,direct}-*.png`——而它们其实早就没生成了（见
// `mm_story._playback_metasprite_recipe` 的注释）。
const stageSheetCaches = new WeakMap();

async function metaspriteStageOamCells(recipe) {
  const source = await metaspriteRecipe();
  const list = recipe.kind === "direct-frame" ? source.directFrames : source.genericObjects;
  const item = list.find(entry => entry.id === Number(recipe.id));
  const origin = Number(recipe.cell_size || 64) >> 1;
  // PRG $027093 跳过直接帧的零图块；通用组合图的透明图块仍提交 OAM。
  return (item?.sprites || []).filter(sprite => !sprite.transparentTile)
    .map(sprite => ({x: origin + sprite.x, y: origin + sprite.y + 1}));
}

/** 把一条 `metalmaxcn.metasprite-render-recipe` 画成舞台精灵表 data URL。 */
async function metaspriteStageSheetUrl(recipe) {
  const banks = Array.isArray(recipe?.chr_banks) ? recipe.chr_banks.map(Number) : [];
  const id = Number(recipe?.id);
  const kind = String(recipe?.kind || "");
  if (!banks.length || !Number.isInteger(id) || !kind) return null;
  const chrDocument = await db.getDocument("shared-chr-bank", null);
  const actorDocument = await db.getDocument("actor-visual", null);
  const fieldPalettes = [...(actorDocument?.field_sprite_palettes || [])]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .flatMap(record => record.colors || []);
  if (fieldPalettes.length !== 16) {
    throw new TypeError("actor-visual 缺少四组场景精灵调色板");
  }
  const sources = await metaspriteContextSources(banks, fieldPalettes);
  let cache = stageSheetCaches.get(chrDocument);
  if (!cache || cache.recipe !== sources.recipe
      || cache.actorDocument !== actorDocument) {
    cache = {recipe: sources.recipe, actorDocument, urls: new Map()};
    stageSheetCaches.set(chrDocument, cache);
  }
  const key = `${kind}:${id}:${banks.join(",")}:${recipe?.palette_override ?? ""}`;
  if (cache.urls.has(key)) return cache.urls.get(key);

  const list = kind === "direct-frame"
    ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = list.find(entry => entry.id === id);
  if (!item) return null;
  const cellSize = Number(recipe?.cell_size || 64);
  const origin = cellSize >> 1;
  const override = recipe?.palette_override;
  // 真 alpha：色号 0 完全不落笔，黑色轮廓照样盖住背景，和 OAM 一致。
  const cellRaster = createRaster(cellSize, cellSize, null);
  for (const sprite of item.sprites) {
    if (sprite.transparentTile) continue;
    const paletteId = override === null || override === undefined
      ? sprite.palette : Number(override);
    // OAM 纵坐标指向显示行的前一行。
    paintChrTile(
      cellRaster.data, cellSize,
      origin + sprite.x, origin + sprite.y + 1,
      sources.tiles[sprite.tile],
      sources.palettes.slice(paletteId * 4, paletteId * 4 + 4),
      {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip,
        background: null});
  }
  const canvas = document.createElement("canvas");
  canvas.width = cellSize * 6;
  canvas.height = cellSize * 4;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingEnabled = false;
  const cell = document.createElement("canvas");
  blitRaster(cell, cellRaster);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      context.drawImage(cell, column * cellSize, row * cellSize);
    }
  }
  const url = canvas.toDataURL("image/png");
  cache.urls.set(key, url);
  return url;
}

/** 给消费方用的标记生成器。 */
function metaspriteCanvas({
  banks, kind = "generic-sheet", id = null, size = 0, palettes = null,
  className = "", label = "",
} = {}) {
  const attributes = [
    'data-metasprite=""',
    `data-metasprite-banks="${(banks || []).map(Number).join(",")}"`,
    `data-metasprite-kind="${kind}"`,
    id === null || id === undefined ? "" : `data-metasprite-id="${Number(id)}"`,
    size ? `data-metasprite-size="${Number(size)}"` : "",
    Array.isArray(palettes) && palettes.length
      ? `data-metasprite-palettes="${palettes.map(Number).join(",")}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

var metasprite = /*#__PURE__*/Object.freeze({
  __proto__: null,
  decodeDirectFrames: decodeDirectFrames,
  decodeGenericObjects: decodeGenericObjects,
  directMetaspriteFrame: directMetaspriteFrame,
  genericMetaspriteObject: genericMetaspriteObject,
  genericSheetImage: genericSheetImage,
  metaspriteCanvas: metaspriteCanvas,
  metaspriteContextSources: metaspriteContextSources,
  metaspriteObjectImage: metaspriteObjectImage,
  metaspriteProjectedSources: metaspriteProjectedSources,
  metaspriteStageOamCells: metaspriteStageOamCells,
  metaspriteStageSheetUrl: metaspriteStageSheetUrl,
  paintMetaspriteCanvases: paintMetaspriteCanvases
});

// @editor-module 三栏编辑页的骨架、预览排布与画布缩放。

let headerPlacement = null;

function restorePageHeader() {
  if (!headerPlacement) return;
  for (const {element, marker} of headerPlacement.moves.reverse()) marker.replaceWith(element);
  for (const group of headerPlacement.groups) group.classList.remove('page-header-group');
  headerPlacement.row.classList.remove('page-header-row');
  if (headerPlacement.created) {
    headerPlacement.row.remove();
    headerPlacement.workbench?.classList.remove('screen-workbench--with-toolbar');
  }
  if (headerPlacement.external) headerPlacement.workbench.classList.add('screen-workbench--with-toolbar');
  headerPlacement = null;
  delete document.body.dataset.compactPageHeader;
}

/** 页头容器独立于控件组，合并顺序不随分页骨架改变。 */
function compactPageHeader({content, head}) {
  restorePageHeader();
  const panels = '.workspace-tree, .workspace-stage, .workspace-inspector, .screen-workbench-bottom';
  const workbench = [...content.querySelectorAll('[data-screen-workbench]')]
    .find(element => !element.closest(panels)
      && (element.dataset.screenWorkbenchHeader === 'external' || element.getClientRects().length));
  const boundary = workbench || content.querySelector('table, .record-body');
  const groups = [...content.querySelectorAll('[data-page-variants], [data-story-page-io], .text-mode-tabs, .data-tabs, .data-editor-toolbar, .view-tabs')]
    .filter(element => !element.closest('[data-screen-workbench]')
      && element.getClientRects().length
      && (!boundary || element.compareDocumentPosition(boundary) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING));
  const toolbar = workbench?.querySelector(':scope > .screen-workbench-top');
  const external = Boolean(workbench?.dataset.screenWorkbenchHeader === 'external' && groups.length);
  let row = !external && toolbar ? toolbar : head;
  const created = Boolean(external || workbench && !toolbar || !workbench && groups.length);
  if (created) {
    row = document.createElement('header');
    if (workbench && !external) {
      row.className = 'screen-workbench-top';
      workbench.prepend(row);
      workbench.classList.add('screen-workbench--with-toolbar');
    } else {
      groups[0].before(row);
    }
  }
  if (external && toolbar) {
    groups.push(toolbar);
    workbench.classList.remove('screen-workbench--with-toolbar');
  }
  headerPlacement = {row, workbench, created, external, groups, moves: []};
  const relocate = (element, target, before = null) => {
    const marker = document.createComment('page-header');
    element.before(marker);
    target.insertBefore(element, before);
    headerPlacement.moves.push({element, marker});
  };
  const move = (element, before = null) => {
    if (element !== row) relocate(element, row, before);
  };
  if (!workbench && row !== head && row.parentElement !== content) {
    let container = row.closest('form') || row.parentElement;
    while (container.parentElement !== content && !container.matches('form')) container = container.parentElement;
    relocate(row, container, container.firstChild);
  }
  const first = row.firstChild;
  move(head, first);
  for (const group of groups) {
    group.classList.add('page-header-group');
    move(group, first);
  }
  row.classList.add('page-header-row');
  for (const value of row.querySelectorAll('h1, p, .record-title')) value.title ||= value.textContent.trim();
  document.body.dataset.compactPageHeader = 'true';
}

const attributesMarkup$1 = attributes => Object.entries(attributes || {}).map(([name, value]) =>
  value === false || value == null ? '' : ` ${esc(name)}="${esc(value === true ? '' : value)}"`).join('');

function workbenchRoot(namespace, root = document) {
  const selector = `[data-screen-workbench="${CSS.escape(String(namespace || ""))}"]`;
  return root?.matches?.(selector) ? root : root?.querySelector?.(selector) || null;
}

function workbenchCanvas(namespace, root = document) {
  const workbench = workbenchRoot(namespace, root);
  return [...(workbench?.querySelectorAll(".screen-workbench-canvas-box canvas") || [])]
    .find(canvas => canvas.closest('[data-screen-workbench]') === workbench) || null;
}

/** 顶部工具栏与页面标题共用单行。 */
function bindScreenWorkbenchPageHeader({namespace, root = document} = {}) {
  const workbench = workbenchRoot(namespace, root);
  const toolbar = workbench?.querySelector(':scope > .screen-workbench-top');
  const heading = document.querySelector('.page-head');
  if (!toolbar || !heading) return;
  toolbar.dataset.screenWorkbenchPageHeader = namespace;
  if (toolbar.contains(heading)) return;
  heading.insertBefore(toolbar, heading.querySelector('.head-actions'));
  workbench.classList.remove('screen-workbench--with-toolbar');
}

/** 共用三栏骨架；bottomMarkup 是三栏下方可选的通栏操作区。 */
function screenWorkbench({
  namespace,
  className = "",
  id = "",
  attributes = {},
  heightMode = "page",
  balancedPanels = false,
  toolbarMarkup = "",
  treeTitle = "UI 树",
  treeMarkup = "",
  treeClassName = "",
  treeAttributes = {},
  treeScroll = "panel",
  stageMarkup = "",
  stageToolbarMarkup = "",
  inspectorTitle = "属性",
  inspectorMarkup = "",
  inspectorClassName = "",
  inspectorAttributes = {},
  inspectorScroll = "panel",
  bottomMarkup = "",
  bottomScroll = "panel",
  bottomSize = "content",
  bottomFit = false,
} = {}) {
  return `<div${id ? ` id="${esc(id)}"` : ""}
    class="workspace screen-workbench${
      bottomMarkup ? " screen-workbench--with-bottom" : ""
    }${toolbarMarkup ? " screen-workbench--with-toolbar" : ""
    }${heightMode === 'timeline' ? ' screen-workbench--with-timeline' : ''
    }${heightMode === 'fill' || bottomMarkup && bottomFit ? ' screen-workbench--fill-space' : ''
    }${heightMode === 'embedded' ? ' screen-workbench--embedded' : ''
    }${bottomMarkup && bottomSize === 'compact' ? ' screen-workbench--compact-bottom' : ''
    }${bottomMarkup && bottomSize === 'resizable' ? ' screen-workbench--resizable-bottom' : ''
    }${bottomFit ? ' screen-workbench--fit-bottom' : ''
    }${stageMarkup ? "" : " screen-workbench--no-stage"
    }${balancedPanels ? " screen-workbench--balanced-panels" : ""
    }${className ? ` ${esc(className)}` : ""}"
    data-screen-workbench="${esc(namespace)}"${attributesMarkup$1(attributes)}>
    ${toolbarMarkup ? `<header class="screen-workbench-top">${toolbarMarkup}</header>` : ''}
    <aside class="workspace-tree${treeScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${treeClassName ? ` ${esc(treeClassName)}` : ''}"${attributesMarkup$1(treeAttributes)}>
      ${treeTitle == null ? '' : `<h3>${esc(treeTitle)}</h3>`}
      ${treeMarkup}
    </aside>
    ${stageMarkup ? `<div class="workspace-stage">${stageToolbarMarkup ? `<div class="screen-workbench-stage-toolbar">${stageToolbarMarkup}</div>` : ''}${stageMarkup}</div>` : ""}
    <aside class="workspace-inspector${inspectorScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${
      inspectorClassName ? ` ${esc(inspectorClassName)}` : ""
    }"${attributesMarkup$1(inspectorAttributes)}>
      ${inspectorTitle == null ? '' : `<h3>${esc(inspectorTitle)}</h3>`}
      ${inspectorMarkup}
    </aside>
    ${bottomMarkup ? `<section class="screen-workbench-bottom${bottomScroll === 'body' ? ' screen-workbench-bottom--body-scroll' : ''}">
      ${bottomSize === 'resizable' ? '<div class="screen-workbench-bottom-grip" data-workbench-bottom-grip role="separator" aria-label="调整状态机通栏高度" aria-orientation="horizontal" tabindex="0"></div>' : ''}
      ${bottomMarkup}
    </section>` : ""}
  </div>`;
}

/** 画面正文由调用方提供。 */
function screenWorkbenchCanvasStage({
  namespace,
  canvasMarkup = "",
  toolbarMarkup = "",
  zoomStatusMarkup = "",
  footerMarkup = "",
  className = "",
  attributes = {},
  viewportClassName = "",
  viewportAttributes = {},
  zoomMarkup = canvasViewportControls(),
  sizing = "compact",
} = {}) {
  return `<div class="screen-workbench-preview screen-workbench-preview--${esc(sizing)}${
    className ? ` ${esc(className)}` : ""
  }"${attributesMarkup$1(attributes)}>
    ${toolbarMarkup || zoomMarkup ? `<div class="screen-workbench-toolbar">
      ${toolbarMarkup}
      ${zoomMarkup ? `<div class="screen-workbench-zoom">${zoomMarkup}${zoomStatusMarkup}</div>` : ''}
    </div>` : ""}
    <div class="screen-workbench-canvas-box${viewportClassName ? ` ${esc(viewportClassName)}` : ''}"
      data-screen-workbench-canvas-box="${esc(namespace)}"${attributesMarkup$1(viewportAttributes)}>
      ${canvasMarkup}
    </div>
    ${footerMarkup}
  </div>`;
}

function bindScreenWorkbenchZoom({namespace, zoom = "fit", onChange = () => {},
  canPan = () => true, root = document, canvasRoot = null, bindViewport = bindCanvasViewport} = {}) {
  const workbench = workbenchRoot(namespace, root);
  const canvas = canvasRoot ? canvasRoot.querySelector('.screen-workbench-canvas-box canvas')
    : workbenchCanvas(namespace, root);
  const viewport = canvas?.closest(".screen-workbench-canvas-box");
  if (!viewport) return null;
  const zoomControls = (canvasRoot || workbench).querySelector('.screen-workbench-zoom');
  const toolbar = workbench.querySelector('.workspace-stage > .screen-workbench-stage-toolbar');
  const previewToolbar = zoomControls?.closest('.screen-workbench-toolbar');
  if (!canvasRoot && toolbar && previewToolbar?.children.length === 1) {
    toolbar.append(zoomControls);
    previewToolbar.remove();
  }
  const updateAspectRatio = () => {
    viewport.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  };
  updateAspectRatio();
  let surface = viewport.querySelector("[data-canvas-viewport-stack]");
  if (!surface) {
    surface = document.createElement("div");
    surface.dataset.canvasViewportStack = "";
    surface.append(...viewport.childNodes);
    viewport.append(surface);
  }
  viewport.tabIndex = 0;
  viewport.title = '滚轮或＋／−缩放；左键或中键拖动、方向键平移';
  return bindViewport({viewport, surface, canvas, controls: zoomControls, zoom, onChange,
    onLayout: updateAspectRatio,
    key: `screen:${namespace}:${new URL(location.href).searchParams.get("view") || ""}`,
    size: () => canvas, sizeElement: canvas, canPan});
}

/** 填满工作台的附属面板放入检查器，通栏高度只在图与预览间分配。 */
function bindScreenWorkbenchBottomResize({namespace, root = document, height = null,
  minCanvasHeight = 120, fitWorkbench = true, initialRatio = .5, storageKey = `workbench-bottom:${namespace}`,
  onChange = () => {}} = {}) {
  const workbench = workbenchRoot(namespace, root), grip = workbench?.querySelector('[data-workbench-bottom-grip]');
  if (!grip) return;
  if (fitWorkbench) {
    const inspector = workbench.querySelector('.workspace-inspector');
    const containers = new Set([workbench.parentElement, workbench.closest('#content')].filter(Boolean));
    for (const panel of [...containers].flatMap(container => [...container.children]))
      if (panel.matches('.page-module-editors, [data-scene-destination-users]')) inspector.append(panel);
  }
  const stage = workbench.querySelector('.workspace-stage');
  const viewport = workbench.querySelector('.screen-workbench-canvas-box');
  let requestedHeight = height;
  if (storageKey) {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved > 0) requestedHeight = saved;
    } catch { /* 浏览者存储不可用时使用初值。 */ }
  }
  let drag = null;
  const available = () => workbench.clientHeight - (workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0) - 1;
  const stageChrome = () => viewport?.querySelector('canvas')
    ? Math.max(0, stage.offsetHeight - viewport.clientHeight)
    : stage.querySelector('.screen-workbench-stage-toolbar')?.offsetHeight || 0;
  const limits = () => ({min: 120, max: fitWorkbench
    ? Math.max(120, available() - stageChrome() - minCanvasHeight)
    : Math.max(160, Math.round(window.innerHeight * .8))});
  const resize = (next, remember = false) => {
    const {min, max} = limits();
    height = Math.max(min, Math.min(max, Math.round(next)));
    workbench.style.setProperty('--workbench-bottom-height', `${height}px`);
    grip.setAttribute('aria-valuemin', min); grip.setAttribute('aria-valuemax', max);
    grip.setAttribute('aria-valuenow', height); grip.setAttribute('aria-valuetext', `${height} 像素`);
    if (remember) {
      requestedHeight = height;
      if (storageKey) {
        try {localStorage.setItem(storageKey, String(height));} catch { /* 页内高度继续有效。 */ }
      }
    }
    onChange(height);
  };
  const minimum = () => {
    const chrome = stageChrome();
    workbench.style.setProperty('--workbench-stage-min-height', `${Math.ceil(chrome + minCanvasHeight)}px`);
    workbench.style.setProperty('--workbench-toolbar-height', `${workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0}px`);
  };
  minimum(); resize(requestedHeight ?? available() * initialRatio);
  let resizeFrame = null;
  const observer = new ResizeObserver(() => {
    if (!workbench.isConnected) {
      observer.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
      return;
    }
    if (resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!workbench.isConnected) {observer.disconnect(); return;}
      minimum();
      if (fitWorkbench) resize(requestedHeight ?? available() * initialRatio);
    });
  });
  observer.observe(stage);
  if (fitWorkbench) observer.observe(workbench);
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = {id: event.pointerId, y: event.clientY, height};
    grip.setPointerCapture(event.pointerId); grip.classList.add('dragging');
  });
  grip.addEventListener('pointermove', event => {
    if (event.pointerId === drag?.id) resize(drag.height + drag.y - event.clientY, true);
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    drag = null; grip.classList.remove('dragging');
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(type, release);
  grip.addEventListener('keydown', event => {
    const {min, max} = limits();
    const next = {ArrowUp: height + 40, ArrowDown: height - 40, Home: min, End: max}[event.key];
    if (next == null) return;
    event.preventDefault(); resize(next, true);
  });
}

// @editor-module 选择布局的字段引用供控件与交换范围共用。
const key = (handle, fieldName) => JSON.stringify([handle, fieldName]);
const tableField = (name, index, label) => ({handle: `selection-layout:${name}`,
  fieldName: `value${index}`, label});

function profileLayoutFields(document, source) {
  if (!document.layout_tables) return [];
  const selector = document.selectors.find(row => row.selector === source.selector);
  const profile = document.profiles[selector?.profile];
  if (!profile) throw new TypeError('选择器缺少布局预设');
  return [tableField('selector-profiles', source.selector / 2, '布局预设'),
    tableField('profile-geometries', profile.index, '行列布局'),
    tableField('columns', profile.geometry, '列数'),
    tableField('movement-pointers', profile.geometry, '方向序列'),
    tableField('profile-rows', profile.index, '行坐标索引'),
    tableField('profile-columns', profile.index, '列坐标索引'),
    tableField('coordinate-pointers', profile.row_index, '行坐标起点'),
    tableField('coordinate-pointers', 15 + profile.column_index, '列坐标起点')];
}

function selectionLayoutFieldReferences(document, source) {
  const rows = profileLayoutFields(document, source);
  if (source.update_policy === 'retained' && Number.isInteger(source.selection_profile_selector))
    rows.push(...profileLayoutFields(document, {...source, selector: source.selection_profile_selector})
      .map(row => ({...row, label: `列表${row.label}`})));
  const selectors = [source.selection_profile_selector ?? source.selector];
  for (const value of selectors) {
    const selector = document.selectors.find(row => row.selector === value);
    const profile = document.profiles[selector?.profile];
    if (profile) rows.push(...Array.from({length: profile.capacity}, (_, index) => ({
      resourceId: 'code-module', handle: 'code-module:code-module.fixed-ui-table-core-a',
      fieldName: `value${5 + profile.movement_offset + index}`, label: `移动 ${index + 1}`})));
  }
  const seen = new Set();
  return rows.filter(row => {
    const id = key(row.handle, row.fieldName);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function selectionHighlightFields(document, preview) {
  const selector = document.selectors.find(row => row.selector === preview.menu_highlight?.selector);
  const profile = document.profiles[selector?.profile];
  return profile ? document.highlights.x_fields.slice(0, profile.columns) : [];
}

// @editor-module 按发布的分片与填充值装配构建基线。

async function assembleBaseline(definition, readBinary, onProgress = () => {}) {
  const sections = definition.assembly?.sections;
  if (!Array.isArray(sections) || !sections.length ||
      !Number.isSafeInteger(definition.file_bytes) || definition.file_bytes <= 0) {
    throw new Error("基线装配声明不完整");
  }
  let end = 0;
  for (const section of sections) {
    if (section.file_offset !== end || !Number.isSafeInteger(section.length) || section.length <= 0 ||
        (section.path === undefined
          ? !Number.isInteger(section.fill) || section.fill < 0 || section.fill > 255
          : typeof section.path !== "string" || !section.path || section.fill !== undefined ||
            !/^[0-9a-f]{64}$/.test(section.sha256))) {
      throw new Error("基线装配分片不连续或声明无效");
    }
    end += section.length;
  }
  if (end !== definition.file_bytes) throw new Error("基线装配总长度不符");
  const baseline = new Uint8Array(end);
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < sections.length) {
      const section = sections[cursor++];
      if (section.path === undefined) {
        baseline.fill(section.fill, section.file_offset, section.file_offset + section.length);
      } else {
        const bytes = await readBinary(section.path);
        if (!(bytes instanceof Uint8Array) || bytes.length !== section.length ||
            await sha256Hex(bytes) !== section.sha256) {
          throw new Error(`${section.path}: 基线分片长度或 SHA-256 不符`);
        }
        baseline.set(bytes, section.file_offset);
      }
      onProgress({message: "装配基线", progress_current: ++completed, progress_total: sections.length});
    }
  };
  await Promise.all(Array.from({length: Math.min(12, sections.length)}, worker));
  if (await sha256Hex(baseline) !== definition.sha256) throw new Error("装配基线 SHA-256 不符");
  return baseline;
}

var baselineAssembly = /*#__PURE__*/Object.freeze({
  __proto__: null,
  assembleBaseline: assembleBaseline
});

// @editor-module 剧情指令与单人战角色选择构成战斗入口投影。

async function prepareStoryBattleEntry(sequenceId, story, repository = db) {
  try {
    const sequence = story?.browser_vm?.sequences?.find(row => row.id === sequenceId);
    if (!sequence) throw new TypeError(`缺少剧情序列 ${sequenceId}`);
    const [actors, scripts, metasprites, fields] = await Promise.all([
      repository.getDocument('scene-actor', null),
      repository.getResourceDraft('story-autonomous-script'),
      repository.getDocument('metasprite-record', null),
      renderCodeFields(['scripted-party-role'], source =>
        repository.getField(source.resource_id, source.entity_handle, source.field)),
    ]);
    const records = (actors?.records || []).filter(row => row.entry_id === sequence.entry_variant_id);
    const document = await prepareStorySceneActions(records, scripts, story, repository);
    const entries = records.flatMap(actor => {
      const actions = storySceneActions(actor, document, story);
      return actions.filter(action => action.operation === 'start-scripted-encounter'
        && actions.some(row => row.cursor < action.cursor && row.operation === 'refresh-field-state'))
        .map(action => ({actor, action, actions}));
    });
    if (entries.length !== 1) throw new TypeError(`剧情序列 ${sequenceId} 缺少唯一战斗入口`);
    const {actor, action} = entries[0];
    const partyRole = fields['scripted-party-role'];
    const selector = () => battleRoleSelector(metasprites, partyRole.value);
    selector();
    if (!Number.isInteger(action.operands[0])) throw new TypeError('剧情战斗编队缺失');
    return {actorHandle: actor.uid, commandHandle: action.handle, operandFields: action.operandFields,
      get formationId() {return action.operands[0];},
      get victoryFlag() {return action.operands[1];},
      get partyRoleId() {return selector().party_role_id;},
      partyRoleField: partyRole};
  } catch (error) {
    return {missing: error.message};
  }
}

var storyBattleEntry = /*#__PURE__*/Object.freeze({
  __proto__: null,
  prepareStoryBattleEntry: prepareStoryBattleEntry
});

// @editor-module 剧情候选字段通过已发布 owner 引用读取与修改自主脚本。

const STORY_AUTONOMOUS_RESOURCE_ID = "story-autonomous-script";
const scriptIndexes = new WeakMap();

function storyScriptIndex(scripts, resourceId) {
  if (!scripts) return undefined;
  let cached = scriptIndexes.get(scripts);
  let index = cached?.indexes.get(resourceId);
  if (!cached || cached.length !== scripts.length || scripts[index]?.resource_id !== resourceId) {
    const indexes = new Map();
    scripts.forEach((script, position) => {
      if (!indexes.has(script.resource_id)) indexes.set(script.resource_id, position);
    });
    cached = {length: scripts.length, indexes};
    scriptIndexes.set(scripts, cached);
    index = indexes.get(resourceId) ?? -1;
  }
  return index;
}

function storyOperandPath(asset, field) {
  const ref = field?.owner_ref;
  if (ref?.resource_id !== STORY_AUTONOMOUS_RESOURCE_ID) {
    throw new Error(`${field?.id}: 缺少自主脚本 owner 引用`);
  }
  const index = storyScriptIndex(asset?.scripts, ref.script_resource_id);
  const offset = ref.byte_index;
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(offset)
      || offset < 0 || offset >= (projectFieldDraftOrigin(asset) || asset).scripts[index].bytecode.length) {
    throw new Error(`${field.id}: 自主脚本字段引用不存在`);
  }
  return ["scripts", index, "bytecode", offset];
}

function setStoryOperand(asset, field, value) {
  if (!Number.isInteger(value) || value < field.min || value > field.max) {
    throw new Error(`${field.id}: 操作数超出发布域`);
  }
  const [, index, , offset] = storyOperandPath(asset, field);
  asset.scripts[index].bytecode[offset] = value;
}

// The legacy segments are a disposable rendering projection, never saved.
// Owner identity comes from publication, not address arithmetic in the view.
function projectStoryOperands(document, asset) {
  const segments = new Map(document.segments.map(segment => [segment.id, segment]));
  const scripts = new Map(asset.scripts.map(script => [script.resource_id, script]));
  for (const field of document.editable_fields) {
    if (field.kind !== "script-operand") continue;
    const script = scripts.get(field.owner_ref?.script_resource_id);
    if (!script) throw new Error(`${field.id}: 自主脚本字段引用不存在`);
    Object.defineProperty(segments.get(field.segment).bytes, field.offset, {
      enumerable: true, configurable: true,
      get: () => script.bytecode[field.owner_ref.byte_index],
      set: value => {script.bytecode[field.owner_ref.byte_index] = value;},
    });
  }
  return document;
}

var storyFieldRouting = /*#__PURE__*/Object.freeze({
  __proto__: null,
  STORY_AUTONOMOUS_RESOURCE_ID: STORY_AUTONOMOUS_RESOURCE_ID,
  projectStoryOperands: projectStoryOperands,
  setStoryOperand: setStoryOperand,
  storyOperandPath: storyOperandPath
});

// @editor-module 武器攻击特效的浏览器视觉脚本 VM 与帧回放
//
// 配方权威是已发布的视觉脚本命令流（`clean_animations` 之外的 `scripts.primary`
// / `scripts.auxiliary`）与战斗对象动作布局；像素权威是 `shared-chr-bank`。
//
// **为什么必须在浏览器里跑 VM**：逐帧状态（每帧每个对象槽的动作码与坐标）不在
// 包里，它是 `mm_weapon_effects._clean_animation_states` 在提取期算出来的。要么
// 把 states 也发进 JSON（等于又造一份派生表，正是要消除的东西），要么把 VM 搬过
// 来。选后者。见 shiftboss/plans/archive/docs-history/metalmaxcn_base_assets_and_references.md §5.2 E5-b。
//
// 与 Python 侧的对应（逐帧必须完全一致）：
//   `expandAttackCommands`  ← `_expand_attack_commands`（内联调用与 repeat 块）
//   `cleanAnimationStates`  ← `_clean_animation_states`（对象槽 VM）
//   `paintBattleAction`     ← `_paint_battle_action`
//   `battleActionPlacements`← `_battle_action_tile_placements`


// 干净舞台的归一锚点。刻意不是战场坐标——预览要的是可比较的固定构图。
const ACTOR_ANCHOR = Object.freeze([42.0, 76.0]);
const TARGET_ANCHOR = Object.freeze([210.0, 56.0]);
// `RenderBattleObject` 看 $0314 bit 0；干净舞台把角色放左边，因此所有效果对象
// 都走渲染器的镜像分支。
const CLEAN_STAGE_FLIP_X = true;
const MAX_FRAMES = 360;
const MAX_COMMANDS = 2500;
const CLEAN_CANVAS = Object.freeze({width: 256, height: 240});
// 干净舞台的背景色。它是「舞台」，不是 NES 颜色。
const STAGE_BACKGROUND = Object.freeze([7, 10, 12]);

const signedByte = value => (value < 0x80 ? value : value - 0x100);

/** `_command_operand` 的镜像：命令的 operands 是 `[{name, value}]`。 */
function operand(command, name) {
  for (const item of command?.operands || []) {
    if (String(item?.name) === name) {
      const value = Number(item.value);
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

/** `_expand_attack_commands` 的镜像：把调用与 repeat 块内联成一条命令流。 */
function expandAttackCommands(rootVisual, primary, auxiliary) {
  const expanded = [];

  const appendScript = (namespace, scriptId, stack) => {
    const node = `${namespace}:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;
    if (stack.includes(node) || expanded.length >= MAX_COMMANDS) return;
    const script = namespace === "visual"
      ? primary.get(scriptId) : auxiliary.get(scriptId);
    if (!script) return;
    const commands = script.commands || [];

    const replay = (command, currentNode, sourceCommandIndex) => {
      const name = String(command.name);
      if (name === "call_visual_script") {
        const target = operand(command, "visual_code");
        if (target !== null && primary.has(target)) {
          appendScript("visual", target, [...stack, currentNode]);
        }
      } else if (name === "call_aux_script") {
        const target = operand(command, "script_id");
        if (target !== null && auxiliary.has(target)) {
          appendScript("aux", target, [...stack, currentNode]);
        }
      } else if (!command.marker) {
        expanded.push({
          ...command,
          source_node: currentNode,
          source_command_index: Number(sourceCommandIndex),
        });
      }
    };

    let index = 0;
    while (index < commands.length && expanded.length < MAX_COMMANDS) {
      const command = commands[index];
      const name = String(command.name);
      if (name === "end_record") break;
      if (name === "end_repeat_block") {
        index += 1;
        continue;
      }
      if (name === "repeat_command_block") {
        const blockStart = index + 1;
        let blockEnd = blockStart;
        let depth = 1;
        while (blockEnd < commands.length) {
          const blockName = String(commands[blockEnd].name);
          if (blockName === "repeat_command_block") depth += 1;
          else if (blockName === "end_repeat_block") {
            depth -= 1;
            if (depth === 0) break;
          }
          blockEnd += 1;
        }
        const count = Math.min(Math.max(operand(command, "repeat_count") ?? 1, 1), 16);
        for (let pass = 0; pass < count; pass += 1) {
          for (let cursor = blockStart; cursor < blockEnd; cursor += 1) {
            replay(commands[cursor], node, cursor);
            if (expanded.length >= MAX_COMMANDS) break;
          }
          if (expanded.length >= MAX_COMMANDS) break;
        }
        index = Math.min(blockEnd + 1, commands.length);
        continue;
      }
      replay(command, node, index);
      index += 1;
    }
  };

  appendScript("visual", rootVisual, []);
  return expanded;
}

/** `_clean_animation_states` 的镜像：对象槽 VM，产出逐帧状态。 */
function cleanAnimationStates(closure, commands, actionById, {
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank,
} = {}) {
  if (!Number.isInteger(initialEffectBank) || initialEffectBank < 0 || initialEffectBank > 255)
    throw new TypeError('缺少攻击初始 CHR 上下文');
  let effectBank = initialEffectBank;
  let spritePaletteSelector = null;
  let actorStateDelta = 0;
  let actorXDeltaNormal = 0;
  let actorXDeltaAlternate = 0;
  const objects = new Map();
  const frames = [];

  const packedSlot = command => {
    const packed = command?.packed_object_delay;
    if (!packed) return [0, 0];
    return [Number(packed.object_slot), Math.min(Number(packed.delay), 0x0f)];
  };

  // Python 的 `state_signature()` 首元素永远是 chr_effect_bank，所以它**永不为
  // 空**——`if not signature: return` 那道门实际上从不生效，对象为零时同样会记一帧
  // （objects 为空数组）。这里必须照样记，否则每条剪辑都会少掉那些空帧。
  const snapshot = (command, hold = 1, commandIndex = commands.length) => {
    if (hold <= 0) return;
    const event = typeof command === "string"
      ? command : String(command?.name || "");
    const sourceNode = typeof command === "string"
      ? "" : String(command?.source_node || "");
    const copies = [...objects.keys()].sort((a, b) => a - b).map(slot => {
      const item = objects.get(slot);
      return {
        slot,
        action: item.action,
        x: item.x,
        y: item.y,
        flipX: item.flipX,
        spawnAnchor: item.spawnAnchor,
        spawnAction: item.spawnAction,
        spawnSourceNode: item.spawnSourceNode,
        spawnSourceCommandIndex: item.spawnSourceCommandIndex,
      };
    });
    const repeat = Math.min(hold, Math.max(0, MAX_FRAMES - frames.length));
    for (let step = 0; step < repeat; step += 1) {
      frames.push({
        event,
        commandIndex,
        sourceNode,
        effectBank,
        spritePaletteSelector,
        chrContext: attackChrContextReference(effectBank),
        actorStateDelta,
        actorXDeltaNormal,
        actorXDeltaAlternate,
        objects: copies,
      });
    }
  };

  const available = value =>
    actionById.has(value) && Boolean(actionById.get(value).available);

  for (const [commandIndex, command] of commands.entries()) {
    const name = String(command.name);
    const [slot, hold] = packedSlot(command);
    const actionValue = operand(command, "action");
    if (name === "set_frame_mode_and_wait") {
      const mode = operand(command, "mode");
      if (mode !== null) effectBank = mode;
      // opcode $04 直接尾调 WaitForNextFrame，不走常规 packed delay 字段。
      snapshot(command, 1, commandIndex);
    } else if (name === "set_battle_sprite_palette") {
      spritePaletteSelector = operand(command, "palette_offset");
      if (spritePaletteSelector === null) {
        throw new TypeError("set_battle_sprite_palette 缺少调色板选择器");
      }
    } else if (name === "increment_actor_state"
        || name === "decrement_actor_state") {
      actorStateDelta += name === "increment_actor_state" ? 1 : -1;
      snapshot(command, operand(command, "delay") ?? 0, commandIndex);
    } else if (name === "move_actor_x_or_skip"
        || name === "skip_or_move_actor_x") {
      const delta = signedByte(operand(command, "delta_x") ?? 0);
      if (name === "move_actor_x_or_skip") actorXDeltaNormal += delta;
      else actorXDeltaAlternate += delta;
    } else if (name === "spawn_object_at_actor" || name === "spawn_object_at_target") {
      const anchor = name === "spawn_object_at_actor" ? actorAnchor : targetAnchor;
      if (actionValue !== null) {
        objects.set(slot, {
          action: actionValue,
          x: anchor[0],
          y: anchor[1],
          flipX: CLEAN_STAGE_FLIP_X,
          spawnAnchor: name === "spawn_object_at_actor" ? "actor" : "target",
          spawnAction: actionValue,
          spawnSourceNode: String(command.source_node || ""),
          spawnSourceCommandIndex: Number(command.source_command_index),
        });
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "set_object_action") {
      if (objects.has(slot) && actionValue !== null) {
        objects.get(slot).action = actionValue;
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "increment_object_action" || name === "decrement_object_action") {
      if (objects.has(slot)) {
        const delta = name.startsWith("increment") ? 1 : -1;
        const candidate = (objects.get(slot).action + delta) & 0xff;
        if (available(candidate)) {
          objects.get(slot).action = candidate;
          snapshot(command, hold, commandIndex);
        }
      }
    } else if (name === "move_object_x" || name === "move_object_xy") {
      if (objects.has(slot)) {
        const item = objects.get(slot);
        item.x += signedByte(operand(command, "delta_x") ?? 0);
        if (name === "move_object_xy") {
          item.y += signedByte(operand(command, "delta_y") ?? 0);
        }
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "clear_object_set_delay") {
      objects.delete(slot);
      snapshot(command, hold, commandIndex);
    } else if (name === "clear_effect_objects" || name === "clear_object0_y") {
      if (name === "clear_effect_objects") objects.clear();
      else objects.delete(0);
    } else if (name.startsWith("animate_")) {
      // 六个路径 handler 都把对象 0 硬编码在 $0337/$0347。
      const pathSlot = 0;
      if (!objects.has(pathSlot)) {
        const fallback = (closure.object_actions || [])
          .map(Number).find(value => available(value));
        if (fallback === undefined) continue;
        objects.set(pathSlot, {
          action: fallback, x: actorAnchor[0], y: actorAnchor[1],
          flipX: CLEAN_STAGE_FLIP_X, spawnAnchor: "actor",
          spawnAction: null,
          spawnSourceNode: "",
          spawnSourceCommandIndex: null,
        });
      }
      const item = objects.get(pathSlot);
      const startX = item.x;
      const startY = item.y;
      const [endX, endY] = targetAnchor;
      const duration = operand(command, "duration");
      const parameter = Math.max(1, operand(command, "path_parameter") ?? 1);
      // InitAttackPathFromActorAnchor 用「水平距离 / path_parameter」当 $D7；
      // opcode $18/$19 再用自己的 duration 字节替换它，并不每次都插值到终点。
      const fullSteps = Math.max(1, Math.floor(Math.abs(endX - startX) / parameter));
      const steps = duration !== null ? Math.max(1, duration) : fullSteps;
      const stepX = endX >= actorAnchor[0] ? parameter : -parameter;
      const stepY = (endY - startY) / fullSteps;
      const pathYStep = Math.floor(Math.abs(stepY) * 256);
      const signedPathYStep = stepY < 0 ? -pathYStep - 1 : pathYStep;
      const trailCount = operand(command, "trail_object_count") ?? 0;
      const toggled = name.includes("toggled");
      for (let step = 0; step < steps; step += 1) {
        // CopyAttackPathPositionHistory 按降序把真实槽坐标从 N-1 拷到 N。
        // 拖尾是有自己动作码的实心 metasprite，不是合成的半透明残影。
        for (let trailSlot = trailCount; trailSlot > 0; trailSlot -= 1) {
          const previous = objects.get(trailSlot - 1);
          const follower = objects.get(trailSlot);
          if (!previous || !follower) continue;
          follower.x = previous.x;
          follower.y = previous.y;
        }
        if (toggled) {
          const candidate = item.action ^ 1;
          if (available(candidate)) item.action = candidate;
        }
        item.x += stepX;
        item.y = gamePath
          ? Math.floor(startY + signedPathYStep * (step + 1) / 256)
          : item.y + stepY;
        snapshot(command, 1, commandIndex);
      }
    } else if (name === "set_delay") {
      snapshot(command, operand(command, "frames") ?? 0, commandIndex);
    }
    if (frames.length >= MAX_FRAMES) break;
  }

  if (!frames.length) {
    for (const action of (closure.object_actions || []).map(Number)) {
      if (!available(action)) continue;
      objects.clear();
      objects.set(0, {
        action, x: 128.0, y: 64.0, flipX: CLEAN_STAGE_FLIP_X,
        spawnAction: null,
        spawnSourceNode: "",
        spawnSourceCommandIndex: null,
      });
      snapshot("action_fallback", 3);
    }
  }
  return frames;
}

/**
 * 找出完整攻击里可按目标重播的受击段起点。
 *
 * 攻击脚本通常先用 `$13` 从攻击者锚点生成发射物，弹道结束后清空对象，再用
 * `$12` 从目标锚点进入命中特效。少数脚本（例如 `$02`）不在两段之间清空，
 * 因此以“最后一个攻击者对象之后的第一个目标对象”为硬边界；清空命令只用于把
 * 紧邻命中特效的空白/换 CHR 帧一并纳入。没有 `$12` 的震屏类命中段则退回到最后
 * 一次清空之后。无法识别时返回 `frames.length`，宁可不追加也不重播整次攻击。
 */
function attackImpactCommandStart(commands, frames) {
  const nameAt = index => String(commands[index]?.name || "");
  let lastActorSpawn = -1;
  for (let index = 0; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_actor") lastActorSpawn = index;
  }

  let targetSpawn = -1;
  for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_target") {
      targetSpawn = index;
      break;
    }
  }

  let boundaryCommand = targetSpawn;
  if (targetSpawn >= 0) {
    for (let index = lastActorSpawn + 1; index < targetSpawn; index += 1) {
      if (nameAt(index) === "clear_effect_objects") boundaryCommand = index + 1;
    }
  } else {
    for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
      if (nameAt(index) !== "clear_effect_objects") continue;
      if (frames.some(frame => Number(frame.commandIndex) > index)) {
        boundaryCommand = index + 1;
      }
    }
  }
  return boundaryCommand < 0 ? commands.length : boundaryCommand;
}

function attackImpactFrameStart(commands, frames) {
  if (!frames.length) return 0;
  const boundaryCommand = attackImpactCommandStart(commands, frames);
  if (boundaryCommand >= commands.length) return frames.length;
  const frameIndex = frames.findIndex(
    frame => Number(frame.commandIndex) >= boundaryCommand,
  );
  return frameIndex < 0 ? frames.length : frameIndex;
}

/**
 * 把完整攻击按 VM 的真实命令边界切成发射、弹道、击中三段。
 *
 * 发射段从脚本开头持续到第一个对象位移/路径命令；弹道段从该位移开始，到
 * `attackImpactFrameStart` 找出的目标对象边界；击中段则保留余下所有目标效果。
 * 没有位移命令的近战、枪口闪光等攻击自然得到 0 帧弹道，而不是硬按帧数三等分。
 */
function attackAnimationSegments(commands, frames) {
  const fullEnd = frames.length;
  const impactStart = Math.min(
    Math.max(attackImpactFrameStart(commands, frames), 0),
    fullEnd,
  );
  const trajectoryIndex = frames.findIndex((frame, index) => {
    if (index >= impactStart) return false;
    const event = String(frame.event || "");
    return event.startsWith("animate_") ||
      event === "move_object_x" || event === "move_object_xy";
  });
  const trajectoryStart = trajectoryIndex < 0 ? impactStart : trajectoryIndex;
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, fullEnd),
    full: range(0, fullEnd),
  };
}

/**
 * 给 owner 命令定位到与逐帧切分一致的语义段。
 *
 * 范围使用 VM 展开后的命令序号；消费方只需拿 `source_node` 与
 * `source_command_index` 对照 owner 命令，不需要看字节偏移。一个 repeat 中的同一条
 * owner 命令可能跨段执行，因此调用方应保留它命中的全部段。
 */
function attackAnimationCommandSegments(commands, frames, segments = null) {
  const frameSegments = segments || attackAnimationSegments(commands, frames);
  const impactStart = Math.min(
    Math.max(attackImpactCommandStart(commands, frames), 0),
    commands.length,
  );
  const firstTrajectoryFrame = frameSegments.trajectory.count > 0
    ? frames[frameSegments.trajectory.start] : null;
  const trajectoryStart = Math.min(
    Math.max(
      firstTrajectoryFrame == null
        ? impactStart : Number(firstTrajectoryFrame.commandIndex),
      0,
    ),
    impactStart,
  );
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, commands.length),
    full: range(0, commands.length),
  };
}

/**
 * `_battle_action_tile_placements` 的镜像。
 *
 * 打包的 `origin` **不是视觉中心**：高/低 nibble 分别是 X/Y 的四分之一图块锚点
 * 偏移。镜像路径反转 X 步长，并给每个发出的图块置上 OAM 水平翻转位。
 */
function battleActionPlacements(action, flipX = false) {
  if (!action?.available) return [];
  const origin = Number(action.origin);
  const originX = (origin >> 4) * 4;
  const originY = (origin & 0x0f) * 4;
  const startX = flipX ? originX : -originX - 1;
  const startY = -originY - 1;
  const stepX = flipX ? -8 : 8;
  const columns = Number(action.columns);
  const placements = [];
  (action.tiles || []).forEach((tileId, index) => {
    placements.push([
      Number(tileId),
      startX + (index % columns) * stepX,
      startY + Math.floor(index / columns) * 8,
      flipX,
    ]);
  });
  return placements;
}

/** `_paint_battle_action` 的镜像。`gameAnchor` 时坐标就是对象锚点。 */
function paintBattleAction(
  raster, action, tiles, palettes, x, y,
  {scale = 1, gameAnchor = false, flipX = false, tileVisible = null} = {},
) {
  if (!action?.available) return;
  const placements = battleActionPlacements(action, flipX);
  if (!placements.length) return;
  let offsetX = x;
  let offsetY = y;
  if (!gameAnchor) {
    const xs = placements.map(item => item[1]);
    const ys = placements.map(item => item[2]);
    const minimumX = Math.min(...xs);
    const maximumX = Math.max(...xs) + 8;
    const minimumY = Math.min(...ys);
    const maximumY = Math.max(...ys) + 8;
    offsetX = Math.round(x - (minimumX + maximumX) * scale / 2);
    offsetY = Math.round(y - (minimumY + maximumY) * scale / 2);
  }
  const paletteId = Number(action.palette_id);
  const palette = palettes.slice(paletteId * 4, paletteId * 4 + 4);
  for (const [tileId, relativeX, relativeY, tileFlipX] of placements) {
    if (tileId === 0) continue;
    const tileX = offsetX + relativeX * scale;
    // OAM 的 Y 是图块首行前一条扫描线。
    const tileY = offsetY + (relativeY + (gameAnchor ? 1 : 0)) * scale;
    if (tileVisible && !tileVisible(tileX, tileY)) continue;
    paintChrTile(
      raster.data, raster.width,
      tileX, tileY,
      tiles[tileId], palette,
      {hflip: tileFlipX, scale, background: null});
  }
}

/** 把一帧状态画成干净舞台画面。 */
function paintCleanFrame(frame, {tilesByBank, actionById, palettes}) {
  const raster = createRaster(
    CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects) {
    const action = actionById.get(item.action);
    if (!action?.available) continue;
    paintBattleAction(
      raster, action, tiles, attackFramePalettes(frame, palettes),
      Math.round(item.x), Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX});
  }
  return raster;
}

// ---------------------------------------------------------------------------
// 数据装配

const sourceCaches = new WeakMap();
const attackVisualPlaybacks = new WeakMap();
let attackVisualObserver = null;

function observeAttackVisualPlayback(canvas, start, stop) {
  attackVisualPlaybacks.set(canvas, {start, stop});
  if (typeof IntersectionObserver !== "function") {
    start();
    return;
  }
  attackVisualObserver ||= new IntersectionObserver(entries => {
    for (const entry of entries) {
      const playback = attackVisualPlaybacks.get(entry.target);
      if (!playback) continue;
      if (entry.isIntersecting) playback.start();
      else playback.stop();
    }
  }, {rootMargin: "160px 0px"});
  attackVisualObserver.observe(canvas);
}

/** 自定义缩略图选择器显隐时，立即启停已建立的 VM 时钟。 */
function setWeaponEffectPreviewPlayback(root, active) {
  if (!root) return;
  const canvases = [];
  if (root.matches?.("canvas[data-attack-visual], canvas[data-effect-object-motion]")) {
    canvases.push(root);
  }
  canvases.push(...(root.querySelectorAll?.(
    "canvas[data-attack-visual], canvas[data-effect-object-motion]",
  ) || []));
  canvases.forEach(canvas => {
    const playback = attackVisualPlaybacks.get(canvas);
    if (!playback) return;
    if (active) playback.start();
    else playback.stop();
  });
}

/** 战斗特效图案表：固定对 + 效果对，按 `chr_effect_bank` 选。 */
function battleEffectChrBanks(effectBank) {
  return resolveAttackChrPatternBanks(attackChrContextReference(effectBank));
}

const projectedOwnerAssets = new WeakMap();

async function effectiveBattleObjectAssets(assets) {
  if (!assets || typeof assets !== "object") return assets;
  if (isBattleObjectOwnerProjection(assets)) return assets;
  const [actionDocument, layoutDocument, metaspriteDocument] = await Promise.all([
    db.getResourceDocument("battle-action", null),
    db.getResourceDocument("battle-object-layout", null),
    db.getDocument(VISUAL_METASPRITES_RESOURCE_ID, null),
  ]);
  if (!actionDocument || !layoutDocument || !metaspriteDocument) {
    throw new TypeError("战斗预览缺少当前 battle-action / battle-object-layout / metasprite-record 正文");
  }
  const revision = ["battle-action", "battle-object-layout", VISUAL_METASPRITES_RESOURCE_ID]
    .map(id => db.fieldRevision(id)).join("|");
  const cached = projectedOwnerAssets.get(assets);
  if (cached?.actionDocument === actionDocument
      && cached?.layoutDocument === layoutDocument
      && cached?.metaspriteDocument === metaspriteDocument && cached.revision === revision) return cached.value;
  const value = projectBattleObjectOwners(
    assets, actionDocument, layoutDocument, metaspriteDocument);
  projectedOwnerAssets.set(
    assets, {actionDocument, layoutDocument, metaspriteDocument, revision, value});
  return value;
}

async function weaponEffectSources(assets) {
  await prepareAttackChrEntryContext();
  const [chrDocument, spritePaletteDocument] = await Promise.all([
    db.getDocument("shared-chr-bank", null),
    db.getResourceDocument("sprite-palette", null),
  ]);
  const revision = ["shared-chr-bank", "sprite-palette"].map(id => db.fieldRevision(id)).join("|");
  let byAssets = sourceCaches.get(chrDocument);
  if (!byAssets) {
    byAssets = new WeakMap();
    sourceCaches.set(chrDocument, byAssets);
  }
  let cache = byAssets.get(assets);
  if (!cache || cache.spritePaletteDocument !== spritePaletteDocument || cache.revision !== revision) {
    cache = {
      assets,
      spritePaletteDocument,
      revision,
      tilesByBank: new Map(),
      tileRequests: new Map(),
      states: new Map(),
      objectMotions: new Map(),
    };
    byAssets.set(assets, cache);
  }
  return cache;
}

async function effectTiles(cache, effectBank) {
  if (cache.tilesByBank.has(effectBank)) return;
  if (!cache.tileRequests.has(effectBank)) {
    const request = composeChrPatternTable(battleEffectChrBanks(effectBank))
      .then(table => {cache.tilesByBank.set(effectBank, decodeChrTiles(table));})
      .finally(() => {cache.tileRequests.delete(effectBank);});
    cache.tileRequests.set(effectBank, request);
  }
  await cache.tileRequests.get(effectBank);
}

function resolveFramePalettes(animation, documentValue) {
  const palettesBySelector = new Map();
  for (const frame of animation.frames) {
    const selector = frame.spritePaletteSelector;
    if (selector === null || selector === undefined) continue;
    if (!palettesBySelector.has(selector)) {
      palettesBySelector.set(selector,
        effectPaletteAfterCommand(animation.palettes, documentValue, selector));
    }
    frame.palettes = palettesBySelector.get(selector);
  }
}

function attackFramePalettes(frame, initialPalettes) {
  if (frame.spritePaletteSelector !== null && frame.spritePaletteSelector !== undefined) {
    if (!frame.palettes) throw new TypeError("攻击帧调色板尚未解析");
    return frame.palettes;
  }
  return initialPalettes;
}

/**
 * 解析一条视觉脚本的逐帧画面。
 *
 * `assets` 是 `clean_animations` 所在的武器特效资产文档。
 */
function attackAnimationState(assets, visualCode, {
  spawnActionOverride = null,
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank = attackInitialEffectBank(),
} = {}) {
  const scripts = assets.scripts || {};
  const primary = new Map(
    (scripts.primary || []).map(item => [Number(item.id), item]));
  const auxiliary = new Map(
    (scripts.auxiliary || []).map(item => [Number(item.id), item]));
  const actionById = new Map(
    (assets.battle_objects?.actions || [])
      .map(item => [Number(item.id), item]));
  const closure = (assets.dependency_closures || []).find(
    item => Number(item.visual_code) === Number(visualCode)) || {};
  const script = primary.get(Number(visualCode));
  if (!script || String(script.decode_status) !== "decoded") return null;

  let commands = expandAttackCommands(Number(visualCode), primary, auxiliary);
  if (spawnActionOverride) {
    const sourceNode = `visual:${Number(visualCode)
      .toString(16).toUpperCase().padStart(2, "0")}`;
    const sourceCommandIndex = Number(spawnActionOverride.sourceCommandIndex);
    const actionId = Number(spawnActionOverride.actionId);
    commands = commands.map(command => {
      if (command.source_node !== sourceNode
          || Number(command.source_command_index) !== sourceCommandIndex
          || !["spawn_object_at_actor", "spawn_object_at_target"].includes(
            String(command.name),
          )) return command;
      return {
        ...command,
        operands: (command.operands || []).map(item => item?.name === "action"
          ? {...item, value: actionId}
          : item),
      };
    });
  }
  const frames = cleanAnimationStates(closure, commands, actionById,
    {actorAnchor, targetAnchor, gamePath, initialEffectBank});
  const segments = attackAnimationSegments(commands, frames);
  const commandSegments = attackAnimationCommandSegments(commands, frames, segments);
  const impactFrameStart = segments.impact.start;
  const palettes = Uint8Array.from(
    (assets.clean_animations?.palette?.values || []).map(Number));
  return {
    commands,
    actorAnchor,
    targetAnchor,
    frames,
    segments,
    commandSegments,
    impactFrameStart,
    impactFrameCount: Math.max(0, frames.length - impactFrameStart),
    impactUsesTargetObjects: frames.slice(impactFrameStart).some(frame =>
      (frame.objects || []).some(item => item.spawnAnchor === "target")
    ),
    actionById,
    palettes,
  };
}

function realSpawnIdentity(item) {
  if (!String(item?.spawnSourceNode || "")
      || !Number.isInteger(Number(item?.spawnSourceCommandIndex))) return "";
  return [
    item.spawnSourceNode,
    Number(item.spawnSourceCommandIndex),
    Number(item.slot),
  ].join(":");
}

function spawnedObjectFrames(animation, matchesObject, projectObject = item => item) {
  if (!animation?.frames?.length) return [];
  const projected = [];
  for (const frame of animation.frames) {
    const objects = (frame.objects || []).filter(item =>
      realSpawnIdentity(item) && matchesObject(item)
    ).map(projectObject);
    if (objects.length) projected.push({...frame, objects});
  }
  return projected;
}

/**
 * 物品“核心效果对象”预览。游戏的六种路径 handler 都硬编码推进效果对象槽 0
 * （$0337/$0347）；拖尾只把该坐标复制给其它槽。因此这里从真实 spawn 中选择第一条
 * 确实移动过的槽 0 载体，只借它的逐帧坐标，再用 equipment flags 选出的独立核心
 * action 重绘。VM 的 action_fallback、其它对象、背景均不进入结果。
 */
function coreEffectMotionState(assets, visualCode, actionId) {
  if (actionId === null || actionId === undefined || actionId === ""
      || !Number.isInteger(Number(actionId))) return null;
  const animation = attackAnimationState(assets, visualCode);
  if (!animation) return null;
  const wantedAction = Number(actionId);
  const carriers = new Map();
  for (const frame of animation.frames) {
    for (const item of frame.objects || []) {
      const identity = realSpawnIdentity(item);
      if (!identity || Number(item.slot) !== 0) continue;
      let carrier = carriers.get(identity);
      if (!carrier) {
        carrier = {
          identity,
          sourceNode: item.spawnSourceNode,
          sourceCommandIndex: Number(item.spawnSourceCommandIndex),
          spawnAction: Number(item.spawnAction),
          positions: new Set(),
        };
        carriers.set(identity, carrier);
      }
      carrier.positions.add(
        `${Number(item.x).toFixed(4)},${Number(item.y).toFixed(4)}`,
      );
    }
  }
  const carrier = [...carriers.values()].find(item => item.positions.size > 1);
  const frames = carrier ? spawnedObjectFrames(
    animation,
    item => realSpawnIdentity(item) === carrier.identity,
    item => ({...item, sourceAction: item.action, action: wantedAction}),
  ) : [];
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: wantedAction,
    projectedSourceCommandIndex: carrier?.sourceCommandIndex ?? null,
    carrierSpawnAction: carrier?.spawnAction ?? null,
  };
}

/**
 * 分段 battle-action 候选预览：把指定 owner spawn 的 action 临时替换成候选，
 * 再跑同一套 VM，只投影该 spawn 产生的对象。它不修改 Working 草稿。
 */
function attackActionCandidateMotionState(
  assets,
  visualCode,
  sourceCommandIndex,
  actionId,
) {
  const commandIndex = Number(sourceCommandIndex);
  const candidate = Number(actionId);
  if (!Number.isInteger(commandIndex) || !Number.isInteger(candidate)) return null;
  const animation = attackAnimationState(assets, visualCode, {
    spawnActionOverride: {sourceCommandIndex: commandIndex, actionId: candidate},
  });
  if (!animation) return null;
  const sourceNode = `visual:${Number(visualCode)
    .toString(16).toUpperCase().padStart(2, "0")}`;
  const frames = spawnedObjectFrames(animation, item =>
    item.spawnSourceNode === sourceNode
      && Number(item.spawnSourceCommandIndex) === commandIndex
      && Number(item.spawnAction) === candidate
  );
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: candidate,
    projectedSourceCommandIndex: commandIndex,
  };
}

async function cleanAnimationFrames(assets, visualCode, options = {}) {
  const document_ = await effectiveBattleObjectAssets(assets);
  const cache = await weaponEffectSources(document_);
  return animationFrames(document_, cache, visualCode, options);
}

async function animationFrames(document_, cache, visualCode, options = {}) {
  const currentOptions = {initialEffectBank: attackInitialEffectBank(), ...options};
  const key = JSON.stringify([visualCode, currentOptions]);
  if (cache.states.has(key)) return cache.states.get(key);

  const animation = attackAnimationState(document_, visualCode, currentOptions);
  if (!animation) return null;
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {
    ...animation,
    tilesByBank: cache.tilesByBank,
  };
  cache.states.set(key, result);
  return result;
}

async function objectMotionFrames(cache, key, createState) {
  if (cache.objectMotions.has(key)) return cache.objectMotions.get(key);
  const animation = createState();
  if (!animation) {
    cache.objectMotions.set(key, null);
    return null;
  }
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {...animation, tilesByBank: cache.tilesByBank};
  cache.objectMotions.set(key, result);
  return result;
}

/**
 * 渲染后统一扫一遍 `[data-attack-visual]` 并批量画。
 *
 * 一条剪辑有几十帧。各画布先画所选分段的第一帧，需要动画的地方用
 * `data-attack-visual-play`；每个 VM 状态就是一个 NES 帧，实际步进速度由
 * `data-attack-visual-standard` 的 PAL / NTSC 制式决定。
 */
async function paintAttackVisualCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-attack-visual]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  // 同一批画布共用当前字段快照与 VM，取数不按画布重复。
  const resolvedByCode = new Map();
  const firstFrames = new Map();
  let emptyFrame;
  const resolveVisual = visualCode => {
    if (!resolvedByCode.has(visualCode)) {
      resolvedByCode.set(
        visualCode,
        animationFrames(document_, cache, visualCode),
      );
    }
    return resolvedByCode.get(visualCode);
  };
  for (const canvas of canvases) {
    if (canvas.dataset.attackVisualPainted === "1" || !canvas.isConnected) continue;
    try {
      const resolved = await resolveVisual(Number(canvas.dataset.attackVisual));
      if (!resolved?.frames.length) {
        canvas.dataset.attackVisualError = "该视觉脚本没有可解码帧";
        continue;
      }
      const context = canvas.getContext("2d");
      if (!context) continue;
      canvas.width = CLEAN_CANVAS.width;
      canvas.height = CLEAN_CANVAS.height;
      context.imageSmoothingEnabled = false;
      const segmentId = String(canvas.dataset.attackVisualSegment || "full");
      const segment = resolved.segments?.[segmentId];
      if (!segment) throw new TypeError(`未知攻击特效分段：${segmentId}`);
      canvas.dataset.attackVisualSegment = segmentId;
      canvas.dataset.attackVisualSegmentStart = String(segment.start);
      canvas.dataset.attackVisualSegmentEnd = String(segment.end);
      canvas.dataset.attackVisualFrames = String(segment.count);
      canvas.dataset.attackVisualComputedFrames = String(segment.count);
      canvas.dataset.attackVisualRenderedFrames = "0";
      canvas.dataset.attackVisualTotalFrames = String(resolved.frames.length);
      const status = canvas.closest("[data-attack-visual-segment-card]")
        ?.querySelector("[data-attack-visual-status]");
      if (status) {
        status.textContent = segment.count ? `${segment.count} 帧` : "";
      }
      const renderedFrames = new Set();
      const draw = index => {
        let image;
        if (!renderedFrames.size) {
          let frames = firstFrames.get(resolved);
          if (!frames) firstFrames.set(resolved, frames = new Map());
          image = frames.get(index);
          if (!image) {
            const raster = paintCleanFrame(resolved.frames[index], resolved);
            image = new ImageData(raster.data, raster.width, raster.height);
            frames.set(index, image);
          }
        } else {
          const raster = paintCleanFrame(resolved.frames[index], resolved);
          image = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(image, 0, 0);
        if (index >= segment.start && index < segment.end) {
          renderedFrames.add(index - segment.start);
          canvas.dataset.attackVisualRenderedFrames = String(renderedFrames.size);
        }
      };
      if (segment.count) {
        draw(segment.start + Math.min(
          Number(canvas.dataset.attackVisualFrame || 0),
          segment.count - 1));
        delete canvas.dataset.attackVisualEmpty;
      } else {
        if (!emptyFrame) {
          const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
          emptyFrame = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(emptyFrame, 0, 0);
        canvas.dataset.attackVisualEmpty = "1";
      }
      canvas.dataset.attackVisualPainted = "1";
      const video = nesVideoStandard(canvas.dataset.attackVisualStandard);
      canvas.dataset.attackVisualStandard = video.key;
      canvas.dataset.attackVisualPlaybackHz = video.hz.toFixed(5);
      canvas.dataset.attackVisualFrameDurationMs = nesFrameDurationMs(video.key)
        .toFixed(4);
      delete canvas.dataset.attackVisualError;
      if (canvas.dataset.attackVisualPlay === "1" && segment.count) {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.attackVisualTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: segment.count,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: index => draw(segment.start + index),
          });
          canvas.dataset.attackVisualTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      canvas.dataset.attackVisualError = String(error?.message || error);
    }
  }
  firstFrames.clear();
}

function paintEffectObjectMotionFrame(frame, {
  tilesByBank,
  actionById,
  palettes,
}) {
  const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, null);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects || []) {
    const action = actionById.get(Number(item.action));
    if (!action?.available) continue;
    paintBattleAction(
      raster,
      action,
      tiles,
      attackFramePalettes(frame, palettes),
      Math.round(item.x),
      Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX},
    );
  }
  return raster;
}

/**
 * 核心效果与 battle-action 候选共用的“单个真实 spawn 对象”画布。核心模式没有
 * 真实槽 0 运动时保持透明，并把现算/渲染帧数都置为 0。
 */
async function paintEffectObjectMotionCanvases(
  root = document,
  assets = null,
) {
  const canvases = [...root.querySelectorAll("canvas[data-effect-object-motion]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  for (const canvas of canvases) {
    if (canvas.dataset.effectObjectMotionPainted === "1" || !canvas.isConnected) continue;
    const visualText = canvas.getAttribute("data-effect-object-visual");
    const visualCode = visualText === null || visualText === ""
      ? null : Number(visualText);
    const actionText = canvas.getAttribute("data-effect-object-action");
    const actionId = actionText === null || actionText === ""
      ? null : Number(actionText);
    const sourceText = canvas.getAttribute("data-effect-object-source-command");
    const sourceCommandIndex = sourceText === null || sourceText === ""
      ? null : Number(sourceText);
    const context = canvas.getContext("2d");
    if (!context) continue;
    canvas.width = CLEAN_CANVAS.width;
    canvas.height = CLEAN_CANVAS.height;
    context.imageSmoothingEnabled = false;
    const status = canvas.closest("[data-effect-object-motion-card]")
      ?.querySelector("[data-effect-object-motion-status]");
    const paintEmpty = () => {
      context.clearRect(0, 0, CLEAN_CANVAS.width, CLEAN_CANVAS.height);
      canvas.dataset.effectObjectMotionComputedFrames = "0";
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionEmpty = "1";
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = sourceCommandIndex === null
          ? "这个核心效果没有可播的运动"
          : "这个候选没有可播的帧";
      }
    };
    try {
      if (!Number.isInteger(visualCode) || !Number.isInteger(actionId)) {
        paintEmpty();
        continue;
      }
      const key = sourceCommandIndex === null
        ? `core:${visualCode}:${actionId}`
        : `candidate:${visualCode}:${sourceCommandIndex}:${actionId}`;
      const resolved = await objectMotionFrames(cache, key, () =>
        sourceCommandIndex === null
          ? coreEffectMotionState(document_, visualCode, actionId)
          : attackActionCandidateMotionState(
              document_, visualCode, sourceCommandIndex, actionId,
            )
      );
      if (!resolved?.frames?.length) {
        paintEmpty();
        continue;
      }
      const renderedFrames = new Set();
      const draw = index => {
        const raster = paintEffectObjectMotionFrame(resolved.frames[index], resolved);
        context.putImageData(
          new ImageData(raster.data, raster.width, raster.height),
          0,
          0,
        );
        renderedFrames.add(index);
        canvas.dataset.effectObjectMotionRenderedFrames = String(
          renderedFrames.size,
        );
      };
      const computed = resolved.frames.length;
      canvas.dataset.effectObjectMotionComputedFrames = String(computed);
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionSourceFrames = String(
        resolved.sourceFrameCount,
      );
      canvas.dataset.effectObjectMotionMaxObjects = String(Math.max(
        0,
        ...resolved.frames.map(frame => frame.objects?.length || 0),
      ));
      canvas.dataset.effectObjectMotionSpawnActions = [...new Set(
        resolved.frames.flatMap(frame =>
          (frame.objects || []).map(item => Number(item.spawnAction))
        ),
      )].join(",");
      if (resolved.projectedSourceCommandIndex !== null
          && resolved.projectedSourceCommandIndex !== undefined) {
        canvas.dataset.effectObjectMotionCarrierCommand = String(
          resolved.projectedSourceCommandIndex,
        );
      }
      if (resolved.carrierSpawnAction !== null
          && resolved.carrierSpawnAction !== undefined) {
        canvas.dataset.effectObjectMotionCarrierSpawnAction = String(
          resolved.carrierSpawnAction,
        );
      }
      draw(Math.min(
        Number(canvas.dataset.effectObjectMotionFrame || 0),
        computed - 1,
      ));
      delete canvas.dataset.effectObjectMotionEmpty;
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = status.hasAttribute("data-effect-object-motion-compact-status")
          ? `${computed} 帧`
          : `${computed} 帧 · 只播放核心效果对象`;
      }
      const video = nesVideoStandard(canvas.dataset.effectObjectMotionStandard);
      canvas.dataset.effectObjectMotionStandard = video.key;
      canvas.dataset.effectObjectMotionPlaybackHz = video.hz.toFixed(5);
      delete canvas.dataset.effectObjectMotionError;
      if (canvas.dataset.effectObjectMotionPlay === "1") {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.effectObjectMotionTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: computed,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: draw,
          });
          canvas.dataset.effectObjectMotionTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      paintEmpty();
      canvas.dataset.effectObjectMotionError = String(error?.message || error);
    }
  }
}

/**
 * 单个「CHR 模式 / 动作码」的对照格。
 *
 * 取代 `previews/clean/action-atlases/*.png` 与那张总图 `action-atlas.png`：
 * 图集本来就是把同一个动作在不同 opcode-$04 模式下各画一格，现画之后按格渲染，
 * 不需要预先拼成一张大图。
 */
async function paintBattleActionCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-action]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const actionById = new Map(
    (document_.battle_objects?.actions || []).map(item => [Number(item.id), item]));
  const palettes = Uint8Array.from(
    (document_.clean_animations?.palette?.values || []).map(Number));
  const cache = await weaponEffectSources(document_);
  const cell = 64;
  for (const canvas of canvases) {
    if (canvas.dataset.battleActionPainted === "1" || !canvas.isConnected) continue;
    try {
      const effectBank = Number(canvas.dataset.battleActionBank);
      const action = actionById.get(Number(canvas.dataset.battleAction));
      if (!action) throw new TypeError("动作码不存在");
      await effectTiles(cache, effectBank);
      const raster = createRaster(cell, cell, STAGE_BACKGROUND);
      paintBattleAction(
        raster, action, cache.tilesByBank.get(effectBank), palettes,
        cell / 2, cell / 2 + 5, {scale: 1});
      canvas.width = cell;
      canvas.height = cell;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.imageSmoothingEnabled = false;
      context.putImageData(new ImageData(raster.data, cell, cell), 0, 0);
      canvas.dataset.battleActionPainted = "1";
      delete canvas.dataset.battleActionError;
    } catch (error) {
      canvas.dataset.battleActionError = String(error?.message || error);
    }
  }
}

/** 单个真实 spawn 对象运动预览的标记生成器。 */
function effectObjectMotionCanvas({
  visualCode,
  action,
  sourceCommandIndex = null,
  frame = 0,
  play = false,
  className = "",
  label = "",
} = {}) {
  const attributes = [
    "data-effect-object-motion",
    `data-effect-object-visual="${visualCode === null || visualCode === undefined
      ? "" : Number(visualCode)}"`,
    `data-effect-object-action="${action === null || action === undefined
      ? "" : Number(action)}"`,
    sourceCommandIndex === null || sourceCommandIndex === undefined
      ? "" : `data-effect-object-source-command="${Number(sourceCommandIndex)}"`,
    frame ? `data-effect-object-motion-frame="${Number(frame)}"` : "",
    play ? 'data-effect-object-motion-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

/** 动作对照格的标记生成器。 */
function battleActionCanvas({effectBank, action, className = "", label = ""} = {}) {
  const attributes = [
    `data-battle-action="${Number(action)}"`,
    `data-battle-action-bank="${Number(effectBank)}"`,
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

var weaponEffectVm = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ACTOR_ANCHOR: ACTOR_ANCHOR,
  CLEAN_CANVAS: CLEAN_CANVAS,
  attackAnimationCommandSegments: attackAnimationCommandSegments,
  attackAnimationState: attackAnimationState,
  attackFramePalettes: attackFramePalettes,
  attackVisualCanvas: attackVisualCanvas,
  battleActionCanvas: battleActionCanvas,
  battleActionPlacements: battleActionPlacements,
  battleEffectChrBanks: battleEffectChrBanks,
  cleanAnimationFrames: cleanAnimationFrames,
  cleanAnimationStates: cleanAnimationStates,
  effectObjectMotionCanvas: effectObjectMotionCanvas,
  expandAttackCommands: expandAttackCommands,
  paintAttackVisualCanvases: paintAttackVisualCanvases,
  paintBattleAction: paintBattleAction,
  paintBattleActionCanvases: paintBattleActionCanvases,
  paintCleanFrame: paintCleanFrame,
  paintEffectObjectMotionCanvases: paintEffectObjectMotionCanvases,
  setWeaponEffectPreviewPlayback: setWeaponEffectPreviewPlayback
});

// @editor-module 字段写入许可的紧凑状态标记。

const ROM_WRITE_PENDING_HINT = "已保存，构建的 ROM 不含此改动";

function writeAccessMarker(access, {fields = []} = {}) {
  if (access.writebackMissing) {
    const hint = `${ROM_WRITE_PENDING_HINT}${fields.length ? `：${fields.join('、')}` : ''}`;
    return `<span class="module-editor-access-mark module-editor-unwritable"
      role="img" tabindex="0" aria-label="${esc(hint)}"
      data-tooltip="${esc(hint)}">↛</span>`;
  }
  if (access.readOnly) {
    const symbol = access.policy === "immutable" ? "🔒"
      : access.semanticStatus === "partial" ? "◐" : "↗";
    const title = access.reason;
    return `<span class="module-editor-access-mark module-editor-readonly"
      role="img" aria-label="${esc(title)}" title="${esc(title)}">${symbol}</span>`;
  }
  return "";
}

// @editor-module 怪物战斗图形的浏览器现画
//
// 像素权威是 `shared-chr-bank` 的 2bpp 位面，配方权威是可编辑的 `monster-visual-layout`
// 正文。这里不消费任何预渲染 PNG，也不读 `game/visuals/index.json` 那份提取期
// 派生视图——派生视图已经把 bank_code/dimension 展开成 chr_banks/width/height/
// tiles，改了原始字段它不会跟着变。
//
// 与 Python 侧 `mm_visual._render_monster` 的对应关系（两边必须逐像素一致）：
//   bank 选择   `_monster_bank_set`
//   流长度      `_monster_stream_length`
//   布局解码    `decode_monster_layout`（$02FEBE-$02FFBA 建的 nametable 矩阵）
//   双调色板    `_monster_dual_palette_layouts`（$17:$BED6 的 $FF 分隔属性图）
//   取图块      `_monster_tile`
//   上色        `_paint_tile`（色号 0 = 透明衬底）


// 与 Python 预览一致的显示衬底色。它只是「透明」的可见表示，不是 NES 颜色。
const FIGURE_MATTE = Object.freeze([11, 14, 16]);

const paintedMonsterCanvases = new WeakSet();

async function monsterRecipes() {
  const document_ = await db.getDocument("monster-visual-layout", null);
  if (!document_) throw new TypeError("monster-visual-layout 配方正文不可用");
  return monsterVisualRecipes(document_);
}

/** `_monster_tile`：把 tile 号解成 8×8 的 4 色索引。 */
function decodeTile(banks, tileId, sequential) {
  let bankIndex;
  let local;
  if (sequential && banks.length === 1) {
    bankIndex = 0;
    local = tileId & 0x3f;
  } else {
    bankIndex = Math.floor(tileId / 0x40);
    local = tileId % 0x40;
  }
  if (bankIndex >= banks.length) {
    throw new TypeError(`怪物图块 ${tileId.toString(16)} 超出已映射的 CHR 页`);
  }
  const bank = banks[bankIndex];
  const start = local * 16;
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = bank[start + row];
    const high = bank[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] =
        ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/**
 * 解析一个怪物图形的完整绘制输入。
 *
 * `enemyId` 决定调色板（同一图形不同敌人可以换色）；不给就用该图形的第一个敌人。
 */
async function monsterFigureSources({
  graphicId, enemyId = null, paletteIds = null,
}) {
  const {byGraphic, byEnemy, palettes} = await monsterRecipes();
  let figure = null;
  let enemy = null;
  if (enemyId !== null && enemyId !== undefined && enemyId !== "") {
    enemy = byEnemy.get(Number(enemyId)) || null;
    if (enemy) figure = byGraphic.get(enemy.graphicId) || null;
  }
  if (!figure) {
    const id = Number(graphicId ?? enemy?.graphicId);
    figure = byGraphic.get(id) || null;
    if (!enemy) {
      for (const candidate of byEnemy.values()) {
        if (candidate.graphicId === id) {
          enemy = candidate;
          break;
        }
      }
    }
  }
  if (!figure) throw new TypeError(`怪物图形 ${graphicId} 不在 monster-visual-layout 里`);
  // **显式调色板优先。** 「这个图形换成那组色是什么样」是选色时唯一要回答的问题；
  // 没有这条覆盖，就只能拿某只怪物现有的配色去预览，等于看不到候选。
  const effectivePaletteIds = Array.isArray(paletteIds) && paletteIds.length
    ? paletteIds.map(Number)
    : (enemy?.paletteIds?.length ? enemy.paletteIds : [0]);
  const resolved = effectivePaletteIds.map(id => {
    const palette = palettes.get(Number(id));
    if (!palette) throw new TypeError(`怪物调色板 ${id} 缺失`);
    return palette;
  });
  // 直接 tilemap 会故意指向尚未分配的战斗槽；游戏在 $BFC0 装页之前把它们初始化
  // 成共享战斗页 $13，这里照做，否则会误报「超出已映射的 CHR 页」。
  const bankIds = [...figure.banks];
  if (figure.id >= MONSTER_SEQUENTIAL_GRAPHICS) {
    while (bankIds.length < 4) bankIds.push(0x13);
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  return {figure, banks, palettes: resolved};
}

/**
 * 按 `_render_monster` 的几何算出 RGBA 像素。
 *
 * 刻意不碰 DOM：返回裸缓冲区，`ImageData` 只在真正要画到 canvas 时才构造。
 * 对拍合同就是直接调它，Node 里没有 `ImageData` 也能跑。
 *
 * `scale` 是逻辑像素倍率，四周留 4 个逻辑像素的边——和 Python 预览完全一致，
 * 这样两边才能逐像素比。
 */
function monsterFigureImage(
  {figure, banks, palettes}, scale = 4,
  {background = FIGURE_MATTE} = {},
) {
  const padding = 4;
  const width = (figure.widthTiles * 8 + padding * 2) * scale;
  const height = (figure.heightTiles * 8 + padding * 2) * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [matteR, matteG, matteB] = background;
    for (let index = 0; index < data.length; index += 4) {
      data[index] = matteR;
      data[index + 1] = matteG;
      data[index + 2] = matteB;
      data[index + 3] = 255;
    }
  }
  const attributeWidth = Math.max(1, figure.widthTiles >> 1);
  const cells = figure.dual && palettes.length > 1 ? figure.dual.cells : null;
  const sequential = figure.id < MONSTER_SEQUENTIAL_GRAPHICS;
  figure.tiles.forEach((tileId, index) => {
    if (tileId === null) return;
    const tile = decodeTile(banks, tileId, sequential);
    const originX = (padding + (index % figure.widthTiles) * 8) * scale;
    const originY = (padding
      + Math.floor(index / figure.widthTiles) * 8) * scale;
    let component = 0;
    if (cells) {
      const attributeIndex =
        Math.floor(Math.floor(index / figure.widthTiles) / 2) * attributeWidth
        + Math.floor((index % figure.widthTiles) / 2);
      if (attributeIndex < cells.length) component = cells[attributeIndex];
    }
    const palette = palettes[component] || palettes[0];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const colorIndex = tile[y * 8 + x];
        if (colorIndex === 0) continue;   // 色号 0 是透明，保留衬底
        const [red, green, blue] = nesPalette[palette[colorIndex] & 0x3f];
        for (let sy = 0; sy < scale; sy += 1) {
          const rowStart = ((originY + y * scale + sy) * width) * 4;
          for (let sx = 0; sx < scale; sx += 1) {
            const target = rowStart + (originX + x * scale + sx) * 4;
            data[target] = red;
            data[target + 1] = green;
            data[target + 2] = blue;
            data[target + 3] = 255;
          }
        }
      }
    }
  });
  return {width, height, data};
}

/**
 * 把一个怪物图形画进 canvas。
 *
 * `box` 给定时画成固定见方画布并居中（取代原来 320×320 的 thumbnail PNG），
 * 否则按 `scale` 画成原始尺寸（取代 previews PNG）。
 */
async function paintMonsterFigure(canvas, {
  graphicId, enemyId, scale = 4, box = 0, paletteIds = null,
}) {
  const sources = await monsterFigureSources({graphicId, enemyId, paletteIds});
  const {figure} = sources;
  let effectiveScale = scale;
  if (box) {
    const logicalWidth = figure.widthTiles * 8 + 8;
    const logicalHeight = figure.heightTiles * 8 + 8;
    effectiveScale = Math.max(1, Math.min(
      5,
      Math.floor(box / logicalWidth),
      Math.floor(box / logicalHeight)));
  }
  const {width, height, data} = monsterFigureImage(sources, effectiveScale);
  const context = canvas.getContext("2d", {willReadFrequently: false});
  if (!context) return;
  const image = new ImageData(data, width, height);
  if (box) {
    // **`box` 是下限不是上限。** 整数缩放最小就是 1 倍，79 个怪物图形里有 13 个
    // 那时仍然超出方框（最大 104×136）——按 box 裁掉，画面上就只剩中间一截。
    // 画布取 box 与内容的较大者，整只怪物一定在里面；显示尺寸交给 CSS 去收。
    const canvasWidth = Math.max(box, width);
    const canvasHeight = Math.max(box, height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.fillStyle = `rgb(${FIGURE_MATTE.join(",")})`;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.putImageData(
      image,
      Math.floor((canvasWidth - width) / 2),
      Math.floor((canvasHeight - height) / 2));
  } else {
    canvas.width = width;
    canvas.height = height;
    context.putImageData(image, 0, 0);
  }
  canvas.dataset.monsterFigurePainted = "1";
  paintedMonsterCanvases.add(canvas);
}

/**
 * 渲染后统一扫一遍 `[data-monster-figure]` 并批量画。
 *
 * 与 `paintUiConstructionCanvases` 同一形状：共享正文只取一次，没有目标就直接
 * 返回，绝不为一张缩略图单独拉一次配方。
 */
async function paintMonsterFigureCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-monster-figure]")];
  if (!canvases.length) return;
  try {
    await monsterRecipes();
  } catch (error) {
    canvases.forEach(canvas => {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    });
    return;
  }
  await Promise.all(canvases.map(async canvas => {
    if (paintedMonsterCanvases.has(canvas)) return;
    try {
      await paintMonsterFigure(canvas, {
        graphicId: canvas.dataset.monsterFigure === ""
          ? null : Number(canvas.dataset.monsterFigure),
        enemyId: canvas.dataset.monsterFigureEnemy === undefined
          ? null : Number(canvas.dataset.monsterFigureEnemy),
        scale: Number(canvas.dataset.monsterFigureScale || 4),
        box: Number(canvas.dataset.monsterFigureBox || 0),
        paletteIds: canvas.dataset.monsterFigurePalettes
          ? canvas.dataset.monsterFigurePalettes.split(",").map(Number) : null,
      });
      delete canvas.dataset.monsterFigureError;
    } catch (error) {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    }
  }));
}

/** 给消费方用的标记生成器，避免每个视图各拼一遍 dataset。 */
function monsterFigureCanvas({
  graphicId = null, enemyId = null, box = 0, scale = 4, className = "", label = "",
  paletteIds = null,
} = {}) {
  const attributes = [
    `data-monster-figure="${graphicId === null ? "" : Number(graphicId)}"`,
    Array.isArray(paletteIds) && paletteIds.length
      ? `data-monster-figure-palettes="${paletteIds.map(Number).join(",")}"` : "",
    enemyId === null || enemyId === undefined
      ? "" : `data-monster-figure-enemy="${Number(enemyId)}"`,
    box ? `data-monster-figure-box="${Number(box)}"` : "",
    scale !== 4 ? `data-monster-figure-scale="${Number(scale)}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

var monsterFigure = /*#__PURE__*/Object.freeze({
  __proto__: null,
  monsterFigureCanvas: monsterFigureCanvas,
  monsterFigureImage: monsterFigureImage,
  monsterFigureSources: monsterFigureSources,
  paintMonsterFigureCanvases: paintMonsterFigureCanvases
});

// @editor-module 详情页共用的物理位置折叠区。


function physicalLocationMarkup({uid = null, rows = [], content = ""} = {}) {
  const entries = [...(uid
    ? resourcePhysicalAddressSummary(uid).ranges.map((address, index) => ({
      label: address.role || `片段 ${index + 1}`, address,
    })) : []), ...rows].map(row => {
      const source = row.address?.offset == null && row.address?.prg_offset != null
        ? {...row.address, space: row.address.space || "prg",
          offset: Number(row.address.prg_offset)} : row.address;
      return {...row, address: source};
    }).filter(row => row.address?.offset != null
      && Number.isInteger(Number(row.address.offset)));
  if (!entries.length) return "";
  const singleResource = uid && rows.length === 0 && entries.length === 1;
  return `<details class="physical-location" data-physical-location>
    <summary>物理位置</summary>
    <div class="table-wrap"><table><thead><tr><th>字段</th><th>地址</th><th>字节数</th></tr></thead>
      <tbody>${entries.map(row => `<tr><th>${esc(row.label || row.key || "片段")}</th>
        <td>${singleResource ? compactResourceAddress(uid)
          : row.address.prg_offset != null ? physicalAddressLink(row.address)
            : directPhysicalAddress(row.address)}</td>
        <td>${Number.isInteger(Number(row.length ?? row.address?.length))
          ? esc(String(row.length ?? row.address.length)) : "—"}</td></tr>`).join("")}</tbody>
    </table></div>${content}
  </details>`;
}

// @editor-module 预览会话隔离上下文、临时字段、窗口与完整快照。
function interfacePreviewState({context = {}, entry = null, node = entry, control = null,
  pause = null, fields = {}, windows = [], selections = {}, returnStack = [],
  domainResults = {}, randomInputs = [], view = {}, execution = null} = {}) {
  return structuredClone({context, entry, node, control, pause, fields, windows, selections,
    returnStack, domainResults, randomInputs, view, execution});
}

class InterfacePreviewSession {
  constructor(initial = {}) {this.reset(initial);}
  reset(initial) {
    this.state = interfacePreviewState(initial);
    this.snapshots = []; this.position = -1;
    return this.capture(this.state);
  }
  capture(state) {
    this.state = interfacePreviewState(state);
    this.snapshots.splice(this.position + 1);
    this.snapshots.push(structuredClone(this.state));
    this.position = this.snapshots.length - 1;
    return structuredClone(this.state);
  }
  restore(position) {
    if (!Number.isInteger(position) || position < 0 || position >= this.snapshots.length) return null;
    this.position = position;
    this.state = structuredClone(this.snapshots[position]);
    return structuredClone(this.state);
  }
  previous() {return this.restore(this.position - 1);}
  next() {return this.restore(this.position + 1);}
  advance(input, adapter) {
    const next = adapter.advance(structuredClone(this.state), input);
    return this.capture(next);
  }
  project(projection) {
    Object.assign(this.state, structuredClone(projection));
    this.snapshots[this.position] = structuredClone(this.state);
  }
}

// @editor-module 跨视图共用的可选元素树
//
// 调用方把本域数据摊成带 id/kind/label/detail/depth 的顺序节点；本模块只负责
// 树容器与节点行。beforeNode/afterNode 是行两侧的插槽，供某一页放可见性开关、
// 跳转或地址等附加件，不把这些域知识带进共用行。重绘交互统一走文件末尾的入口，
// 由它恢复树的观察位置、选中节点可见性和被替换按钮的焦点。


// 字形只有这一份。调用方仍负责把自己的 kind 登记到哪一种字形和哪一个类型名。
const ELEMENT_TREE_ICONS = Object.freeze({
  group: "▣",
  layer: "▧",
  text: "T",
  target: "⌖",
  actor: "♟",
  layout: "▤",
  list: "☷",
  item: "○",
  action: "→",
  overlay: "◇",
  component: "◫",
  preview: "▶",
  fallback: "·",
});

// 同一概念在不同页面沿用各自原有措辞；页面只把 kind 登记到这些既有显示词。
const ELEMENT_TREE_LABELS = Object.freeze({
  interface: "界面",
  previewBackdrop: "预览背景",
  layout: "布局",
  writing: "文字",
  options: "选项列表",
  option: "选项",
  action: "行为",
  overlay: "叠加层",
  component: "组件",
  runtimePreview: "运行预览",
  screen: "画面",
  image: "图像",
  text: "文本",
  presentation: "演出",
  shot: "幕",
  camera: "镜头",
  actor: "角色",
  fallback: "节点",
});

/** 建立本页的 kind → {icon, label} 词表。 */
function defineElementTreeTypes(entries) {
  return Object.freeze(Object.fromEntries(
    Object.entries(entries || {}).map(([kind, entry]) => [
      kind,
      Object.freeze({...entry}),
    ]),
  ));
}

function elementTreeTypeLabel(
  types,
  kind,
  fallback = ELEMENT_TREE_LABELS.fallback,
) {
  return types?.[kind]?.label || kind || fallback;
}

function attributesMarkup(attributes) {
  return Object.entries(attributes || {}).map(([name, value]) => {
    if (value === undefined || value === null || value === false) return "";
    if (value === true) return ` ${esc(name)}`;
    return ` ${esc(name)}="${esc(value)}"`;
  }).join("");
}

/** 只画节点行；供局部重建树内容时复用，行结构仍只有这一份。 */
function elementTreeRows({
  nodes = [],
  types = {},
  selectedId = null,
  rowAttributes = () => ({}),
  buttonAttributes = () => ({}),
  iconAttributes = () => ({}),
  showIcons = true,
  beforeNode = () => "",
  afterNode = () => "",
} = {}) {
  return nodes.map(node => {
    const selected = node.id === selectedId;
    const type = types?.[node.kind] || {};
    const depth = Number.isFinite(Number(node.depth)) ? Number(node.depth) : 0;
    return `<div class="element-tree-node${selected ? " is-selected" : ""}"
      style="--element-tree-depth:${depth}"${
        attributesMarkup(rowAttributes(node, selected))}>
      ${beforeNode(node, selected)}
      <button type="button" class="element-tree-node-button"${
        attributesMarkup(buttonAttributes(node, selected))}>
        ${showIcons ? `<span class="element-tree-node-icon"${
          attributesMarkup(iconAttributes(node, selected))}>${
          esc(type.icon || ELEMENT_TREE_ICONS.fallback)}</span>` : ""}
        <span class="element-tree-node-copy"><b>${node.labelMarkup ?? esc(node.label)}</b>${
          node.detailMarkup || node.detail ? `<small>${node.detailMarkup ?? esc(node.detail)}</small>` : ""}</span>
      </button>
      ${afterNode(node, selected)}
    </div>`;
  }).join("");
}

/** 画完整树；className 只给页面自己的布局壳追加类名。 */
function elementTree({
  className = "",
  attributes = {},
  empty = "",
  ...rowOptions
} = {}) {
  const rows = elementTreeRows(rowOptions);
  return `<div class="element-tree${className ? ` ${esc(className)}` : ""}"${
    attributesMarkup(attributes)}>${rows || empty}</div>`;
}

function verticalScrollContainer(tree) {
  const ownerDocument = tree?.ownerDocument;
  const view = ownerDocument?.defaultView;
  for (let node = tree; node && node !== ownerDocument?.body
      && node !== ownerDocument?.documentElement; node = node.parentElement) {
    const overflow = view?.getComputedStyle(node)?.overflowY || "";
    if (/^(auto|scroll|overlay)$/.test(overflow)
        && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function visibleVerticalBounds(scroller, tree) {
  const bounds = scroller.getBoundingClientRect();
  let top = bounds.top + scroller.clientTop;
  let bottom = top + scroller.clientHeight;
  if (scroller === tree) return {top, bottom};

  // screen-workbench 的标题黏在滚动栏顶部。它不是树的一部分，但会盖住滚到
  // 最上沿的节点；这里按实际几何扣掉这类黏性兄弟，不把页面或域布局写进组件。
  for (const child of scroller.children) {
    if (child === tree
        || tree.contains(child)
        || getComputedStyle(child).position !== "sticky") continue;
    const childBounds = child.getBoundingClientRect();
    if (childBounds.top <= top && childBounds.bottom > top) {
      top = Math.min(bottom, childBounds.bottom);
    } else if (childBounds.top < bottom && childBounds.bottom >= bottom) {
      bottom = Math.max(top, childBounds.top);
    }
  }
  return {top, bottom};
}

function revealSelectedElementTreeNode(tree, scroller) {
  const selected = tree?.querySelector(
    ".element-tree-node.is-selected > .element-tree-node-button",
  );
  if (!selected || !scroller) return selected;
  const row = selected.closest(".element-tree-node") || selected;
  const {top, bottom} = visibleVerticalBounds(scroller, tree);
  const bounds = row.getBoundingClientRect();
  if (bounds.top < top) scroller.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) scroller.scrollTop += bounds.bottom - bottom;
  return selected;
}

/**
 * 执行一次会重建树 DOM 的更新，并让新树里的选中节点仍可见。
 *
 * 旧 scrollTop 只作为新树的观察起点：选中节点若因筛选或结构变化移出视口，
 * 会再滚到最近边缘。滚动只写树自身或最近的非页面滚动容器。只有触发按钮原本
 * 持有焦点时，才把焦点放回新按钮，并用 preventScroll 避免牵动整页。
 */
async function rerenderElementTreeKeepingSelectionVisible(
  trigger,
  rerender,
) {
  const tree = trigger?.closest?.(".element-tree") || null;
  const root = tree?.getRootNode?.() || null;
  const trees = root?.querySelectorAll ? [...root.querySelectorAll(".element-tree")] : [];
  const treeIndex = trees.indexOf(tree);
  const scroller = verticalScrollContainer(tree);
  const scrollTop = scroller?.scrollTop || 0;
  const restoreFocus = trigger === trigger?.ownerDocument?.activeElement;

  await rerender();
  if (!tree) return null;

  const nextTrees = root?.querySelectorAll
    ? [...root.querySelectorAll(".element-tree")] : [];
  const nextTree = tree.isConnected ? tree : nextTrees[treeIndex] || null;
  const nextScroller = verticalScrollContainer(nextTree);
  if (nextScroller) nextScroller.scrollTop = scrollTop;
  const selected = revealSelectedElementTreeNode(nextTree, nextScroller);
  if (restoreFocus) selected?.focus({preventScroll: true});
  return selected;
}

export { $, ACTOR_ANCHOR, CLEAN_CANVAS, ELEMENT_TREE_ICONS, ELEMENT_TREE_LABELS, InterfacePreviewSession, STORY_AUTONOMOUS_RESOURCE_ID, applyFacilityConfigurationProjection, applySceneTownNames, applyTeleportDestinationNames, attackAnimationCommandSegments, attackAnimationState, attackFramePalettes, attackVisualCanvas, audioCommandLabel, baselineAssembly, battleActionCanvas, battleActionPlacements, bindCanvasViewport, bindScreenWorkbenchBottomResize, bindScreenWorkbenchPageHeader, bindScreenWorkbenchZoom, bindStoryPageRecovery, bindTextInputEvents, blitRaster, byteRecords, bytes, canvasViewportControls, canvasViewportPoint, chrPatternByteSource, cleanAnimationFrames, compactPageHeader, composeChrPatternTable, composeCorePatternTable, createRaster, currentTextChoiceLabel, currentTextRecordCard, currentTextReference, currentTextReferenceLink, decodeChrTile, decodeChrTiles, decodeWebByteArray, defineElementTreeTypes, directMetaspriteFrame, editorErrorMarkup, effectObjectMotionCanvas, elementTree, elementTreeRows, elementTreeTypeLabel, esc, expandResourceByteRangeSlots, flushCanvasViewportLayouts, genericMetaspriteObject, hiddenTeleportDestination, hiddenTeleportFlags, hiddenTeleportGate, hydrateModuleComponents, indexedByteSource, indexedResource, interfacePreviewState, itemResourceUid, listChrBankIds, loadChrBankBytes, metasprite, metaspriteCanvas, metaspriteContextSources, metaspriteObjectImage, metaspriteProjectedSources, metaspriteStageOamCells, metaspriteStageSheetUrl, moduleComponentDefinition, monsterFigure, monsterFigureCanvas, monsterFigureImage, monsterFigureSources, nesPalette, paintAttackVisualCanvases, paintBattleAction, paintBattleActionCanvases, paintChrTile, paintCleanFrame, paintEffectObjectMotionCanvases, paintMetaspriteCanvases, paintMonsterFigureCanvases, physicalLocationMarkup, plainTextRecordReferences, prepareHiddenTeleportDestination, prepareModuleComponent, prepareStorySceneActions, projectAssetSelectionStates, projectAssetSelectionsDirty, projectData, projectFieldsForSelectors, projectStoryOperands, recordUid, registerModuleComponent, registerModuleComponentFallback, renderModuleComponent, requireBrowserProjectRepository, rerenderElementTreeKeepingSelectionVisible, resetProjectFields, resetProjectFieldsAtPaths, resourceByteRanges, resourceDomain, resourceFieldByteRanges, resourceForwardReferenceCell, resourceLabel, resourcePhysicalAddressSummary, resourcePrimaryAddress, restorePageHeader, romMapAddressHref, sceneActorStateObjects, sceneRemapItems, screenWorkbench, screenWorkbenchCanvasStage, selectionHighlightFields, selectionLayoutFieldReferences, setProjectField, setProjectFields, setStoryOperand, setWeaponEffectPreviewPlayback, showEditorError, storyActorCondition, storyBattleEntry, storyFieldRouting, storyOperandPath, storyPageRecoveryButton, storySceneActionPresentation, storySceneActions, storySceneDialogueReferences, syncModuleComponents, tableValueStack, textCharacterResourceUid, textRecordDisplayText, textRecordReferenceCell, uiBlankCanvas, uiHexBytes, uiPaintPattern, uiPaintResolvedMetasprite, uiPaintRomNametable, uiPaintRomTileGrid, uiPaintTileFill, uiPaintTileWrites, uiPutRgb, weaponEffectVm, writeAccessMarker };
