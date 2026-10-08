// @editor-module 展示当前文本记录目录，解析文本引用并绘制记录预览。
import {editorLog} from "../../core/editor-log.js";
import {bindResourceQueries, bindWideTableWheelScrolling, render} from "../../main.js";
import {
  characterMapCandidateSourcesAvailable,
  recomputeCharacterMapCandidates,
  refreshTextCatalogFromCharacterMap,
} from "../../core/character-map-project.js";
import {db} from "../../core/project-db.js";
import {$, esc} from "../../core/dom.js";
import {fileUrl} from "../../core/package-io.js";
import {currentTextReference, currentTextRecordCard, textRecordDisplayText, textRecordReferenceCell} from "../../core/resource-index.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {handleMarkup} from "../../ui/handle.js";
import {currentViewUrl, replaceHistoryUrl} from "../../core/router.js";
import {state} from "../../core/state.js";
import {
  applyTextRecordsToCatalog,
  createTextRecordEncoding,
  decodeFixedTextRecord,
  textFillDetails,
  TEXT_RECORDS_RESOURCE_ID,
} from "../../core/text-record-project.js";
import {uiBlankCanvas, uiHexBytes} from "../../render/nes.js";
import {textCatalogCache, uiConstructionModel, uiJsRenderSources, uiPaintInterfaceScript} from "../../modules/visual/ui-construction-preview.js";
import {bindRuntimeEditor, runtimeEditorMarkup} from "../../ui/text-runtime-editor.js";

// 只有本模块的 paintTextRecordCanvases 用得到它，所以就放在本模块。
// 曾经是 ui-paint.js 的 `export let`，但 import 进来的是只读绑定：下面那句
// 赋值会抛 TypeError: Assignment to constant variable，整张文本记录表因此
// 一行都渲染不出来。
let textCanvasObserver = null;
let textCatalogWindowCleanup = null;

function uiLayoutTextRecordIds(model = uiConstructionModel()) {
  return new Set(
    (model.static_assets?.layouts || []).map(layout => layout.id),
  );
}

function textRegionLayoutCount(model = uiConstructionModel()) {
  return (model.static_assets?.layouts || []).filter(layout => (
    state.textRegion === "all" || layout.region_hex === state.textRegion
  )).length;
}

function updateTextLayoutNotice() {
  const notice = document.querySelector("[data-text-layout-notice]");
  if (!notice) return;
  const count = textRegionLayoutCount();
  notice.dataset.uiLayoutRegionCount = String(count);
  const message = notice.querySelector("span");
  if (message) {
    message.textContent = `${count} 条图块布局`;
  }
}











//
// 来源：拆分前 engine/editor/app.js 第 7169-7233;7927-8010;8405-8641 行。









export function renderText() {
  const model = uiConstructionModel();
  const layouts = model.static_assets?.layouts || [];
  const font = model.font || {};
  const coreFont = model.static_assets?.chr?.core_pattern_table || {};
  const coreGlyphs = coreFont.identified_text_glyphs || [];
  const staticGlyphs = model.static_assets?.chr?.identified_static_text_glyphs || [];
  const fixedGlyphs = [...coreGlyphs, ...staticGlyphs];
  const catalog = model.script_catalog?.text_catalog || {};
  const summary = catalog.summary || model.script_catalog?.summary || {};
  const regions = model.script_catalog?.regions || [];
  if (!regions.length || !catalog.path) {
    return ``;
  }
  const classCounts = summary.classifications || {};
  const characterMapping = font.character_mapping || {};
  const mappingCounts = characterMapping.status_counts || {};
  const textContentCount = Number(summary.text_content_records || (
    (classCounts.sentence || 0) + (classCounts.name || 0)
      + (classCounts.label || 0) + (classCounts.template || 0)
  ));
  const kindOptions = [
    ["text", "全部文字内容", textContentCount],
    ["all", "全部文本与控制记录", Math.max(0, Number(summary.records || 0) - layouts.length)],
    ["sentence", "句子与消息", classCounts.sentence || 0],
    ["name", "名称", classCounts.name || 0],
    ["label", "短标签", classCounts.label || 0],
    ["template", "动态与引用模板", classCounts.template || 0],
    ["fragment", "界面拼装片段", classCounts.fragment || 0],
    ["control", "控制记录", classCounts.control || 0],
  ];
  const modeTabs = `<nav class="text-mode-tabs">
    <button type="button" data-text-mode="records" class="${state.textMode === "records" ? "active" : ""}">文本记录</button>
    <button type="button" data-text-mode="charset" class="${state.textMode === "charset" ? "active" : ""}">字符映射</button>
  </nav>`;
  const recordToolbar = `<div class="text-catalog-toolbar">
      <label><span>文本区</span><select id="text-region-select">
        <option value="all" ${state.textRegion === "all" ? "selected" : ""}>全部 22 个文本区</option>
        ${regions.map(region => `<option value="${esc(region.id_hex)}" ${state.textRegion === region.id_hex ? "selected" : ""}>${esc(region.id_hex)} · ${esc(region.name)} · ${Number(region.record_count).toLocaleString()} 条</option>`).join("")}
      </select></label>
      <label><span>记录类型</span><select id="text-kind-select">${kindOptions.map(
        ([value, label, count]) => `<option value="${value}" ${state.textKind === value ? "selected" : ""}>${esc(label)} · ${Number(count).toLocaleString()}</option>`
      ).join("")}</select></label>
      <label class="text-catalog-search"><span>筛选 ID、文本区、已知名称或原始字节</span><input id="text-catalog-search" value="${esc(state.textSearch)}" placeholder="05:000 / 主对话 / 战狗 / 24 00…" spellcheck="false"></label>
      <div class="text-catalog-summary"><b>${textContentCount.toLocaleString()}</b><span>文字内容</span><small>${Number(summary.records || 0).toLocaleString()} 条记录 · ${Number(summary.source_bytes || 0).toLocaleString()} B</small></div>
    </div>`;
  const regionLayoutCount = textRegionLayoutCount(model);
  const layoutNotice = `<aside class="text-layout-notice" data-text-layout-notice data-ui-layout-region-count="${regionLayoutCount}">
    <span>${regionLayoutCount} 条图块布局</span>
  </aside>`;
  const fontPanel = `<section class="text-font-catalog">
      <header><div><b>本地化 12×12 字库</b><span>${Number(font.glyph_count || 0).toLocaleString()} 个有效字形 · ${Number(font.pages?.length || 0)} 个编码页 · Unicode 映射保存在当前项目</span></div></header>
      <div class="text-font-atlas"><canvas data-ui-font-atlas aria-label="Metal Max CN ROM character set"></canvas></div>
      <footer><span>${esc(font.encoding?.regular_lead_range || "$24-$2E")} + selector</span><span>${Number(mappingCounts.confirmed || 0)} 已确认 · ${Number(mappingCounts.candidate || 0)} 自动候选 · ${Number(mappingCounts.conflict || 0)} 冲突 · ${Number(mappingCounts.unidentified || 0)} 待识别</span></footer>
    </section>`;
  const coreFontPanel = fixedGlyphs.length ? `<section class="text-core-font-catalog">
      <header><div><b>固定 8×8 字形 · 数字、大写英文与标点</b><span>${fixedGlyphs.length} 个已确认字符</span></div></header>
      <div class="text-core-font-grid">${fixedGlyphs.map(glyph => `<a title="${esc(glyph.unicode === " " ? "空格" : glyph.unicode)} · token/tile $${esc(glyph.tile_id_hex)} · 引用 ${Number(glyph.usage_count || 0)}">
        <canvas data-ui-core-font-tile="${Number(glyph.tile_id)}" width="8" height="8"></canvas><b>${esc(glyph.unicode === " " ? "␠" : glyph.unicode)}</b><small>$${esc(glyph.tile_id_hex)}</small>
      </a>`).join("")}</div>
    </section>` : "";
  if (state.textMode === "charset") {
    return `${modeTabs}${coreFontPanel}${fontPanel}<div id="charset-workbench"><div class="loading"><span></span>读取 ${Number(font.glyph_count || 0).toLocaleString()} 个字符映射…</div></div>`;
  }
  return `${modeTabs}${recordToolbar}${layoutNotice}${coreFontPanel}${fontPanel}
    <div id="text-catalog-results"><div class="loading"><span></span>读取 ${Number(summary.records || 0).toLocaleString()} 条 ROM 文本记录…</div></div>`;
}

export const textClassLabels = {
  sentence: "句子与消息",
  name: "名称",
  label: "短标签",
  template: "动态与引用模板",
  fragment: "界面拼装片段",
  layout: "图块布局",
  control: "控制记录",
};

function textKnownLabel(record) {
  const mapping = record.unicode_mapping || {};
  const preview = String(record.formatted_text || record.unicode_preview || "");
  return mapping.complete && mapping.total_glyphs && preview && !preview.includes("□")
    ? preview : "";
}

const runtimeFillTokens = new Set([0xE2, 0xE8, 0xE9, 0xEA, 0xEC,
  0xF2, 0xF3, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD]);

const publishedProviderLabels = Object.freeze({
  "characters.name_initialization.preset_sets.0.role_names.0.source": "人物名",
  "characters.rom_initial.gold.value": "金钱",
  "characters.rom_initial.roles.0.repair_skill": "修理技能",
  "characters.rom_initial.roles.0.battle_skill": "战斗技能",
  "characters.rom_initial.roles.0.vitality": "体力",
  "characters.rom_initial.roles.0.speed": "速度",
  "characters.rom_initial.roles.0.intelligence": "智力",
  "characters.rom_initial.roles.0.strength": "力量",
  "characters.rom_initial.roles.0.experience": "经验",
  "characters.rom_initial.roles.0.current_hp": "当前 HP",
  "characters.rom_initial.roles.0.max_hp": "最大 HP",
  "characters.rom_initial.roles.0.attack": "攻击",
  "characters.rom_initial.roles.0.defense": "防御",
  "characters.rom_initial.roles.0.driving_skill": "驾驶技能",
});

function runtimeFillLabel(command, providerNames = {}) {
  const token = Number(command.token);
  if (!runtimeFillTokens.has(token)) return null;
  if (token === 0xE2) return "运行时数值";
  if (token === 0xE8) return "$051D 字符串";
  if (token === 0xE9) return "运行时记录";
  const provider = Number(command.provider_id);
  if (Number.isInteger(provider) && command.provider_id != null) {
    return publishedProviderLabels[providerNames[provider]]
      || providerNames[provider]
      || `提供器 $${provider.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return command.direct_target
    ? `引用 ${command.direct_target.replace("record:", "")}`
    : command.semantic || `控制码 $${token.toString(16).toUpperCase()}`;
}

function runtimeFillBadge(command, record, providerNames = {}) {
  const full = runtimeFillLabel(command, providerNames);
  if (!full) return null;
  const token = Number(command.token);
  const [short, detail, example] = textFillDetails(token, record.node_id);
  if (["价", "物"].includes(short)) return {short, full: detail, example};
  return {short, full, example};
}

function runtimeCommands(fixedRecord, encoding) {
  const bytes = fixedRecord?.bytes || [];
  return (fixedRecord ? decodeFixedTextRecord(fixedRecord, encoding).commands : [])
    .filter(range => range.kind === "command")
    .map(range => {
      const token = Number(range.token);
      const id = bytes[range.offset + 1];
      const region = token === 0xF7 ? bytes[range.offset + 2]
        : ({0xEA: 0x13, 0xEC: 0x14, 0xF2: 0x09, 0xF3: 0x11})[token];
      const directTarget = Number.isInteger(region) && Number.isInteger(id)
        ? `record:${region.toString(16).toUpperCase().padStart(2, "0")}:${String(id).padStart(3, "0")}`
        : null;
      return {...range,
        provider_id: [0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD].includes(token) ? id : null,
        direct_target: directTarget,
      };
    });
}

function runtimeTextPreview(record, providerNames = {}, markup = false) {
  const byOffset = new Map();
  for (const reference of [...(record.glyph_references || []),
    ...(record.literal_tile_references || [])]) {
    if (reference.unicode) byOffset.set(Number(reference.offset), {
      text: String(reference.unicode), length: String(reference.encoded_hex || "").split(" ").length || 1,
    });
  }
  for (const command of record.runtime_commands || []) {
    const badge = runtimeFillBadge(command, record, providerNames);
    if (badge) byOffset.set(Number(command.offset), {
      text: `〔${badge.short}〕`, length: command.length, badge,
    });
    else if (command.token === 0xE5) byOffset.set(Number(command.offset), {text: "\n", length: 1});
  }
  const byteCount = String(record.raw_hex || "").split(" ").length;
  let text = "";
  for (let offset = 0; offset < byteCount;) {
    const part = byOffset.get(offset);
    if (part) text += markup && part.badge
      ? `<span class="text-runtime-inline-token" title="${esc(`${part.badge.full} · 示例：${part.badge.example}`)}">${esc(part.text)}</span>`
      : markup ? esc(part.text) : part.text;
    offset += Math.max(1, part?.length || 1);
  }
  return text.trim();
}

function textCompositionPanel(document) {
  const records = new Map((document.records || []).map(record => [record.node_id, record]));
  const published = uiConstructionModel().compositions?.compositions || [];
  const entries = published.map(composition => ({
    id: composition.id,
    title: "人物状态组合",
    kind: "已发布组合",
    parts: composition.layers.map(layer => ({
      id: layer.record,
      detail: layer.kind === "layout" ? "布局" : "文字与运行时值",
      providerNames: Object.fromEntries([
        ...Object.entries(layer.provider_values || {}),
        ...Object.entries(layer.provider_scripts || {}),
        ...(layer.provider_record_sequence?.providers || [])
          .map(id => [id, "装备名"]),
      ]),
    })),
  }));
  const candidates = [];
  for (const id of ["record:02:089", "record:02:090"]) {
    const source = records.get(id);
    const references = (source?.runtime_commands || []).filter(command => command.direct_target);
    if (references.length < 2) continue;
    candidates.push({
      id,
      title: "脚本内直接引用",
      kind: "ROM 命令顺序",
      parts: references.map(command => ({id: command.direct_target,
        detail: `$${Number(command.token).toString(16).toUpperCase()} 引用`})),
    });
  }
  return `<section class="text-runtime-compositions"><div class="section-line"><h3>运行时分段拼接</h3><span>${entries.length} 组已发布组成</span></div>
    <div class="text-runtime-composition-grid">${entries.map(entry => {
      const preview = entry.parts.map(part => {
        const record = records.get(part.id);
        return record && part.detail !== "布局"
          ? runtimeTextPreview(record, part.providerNames, true) : "";
      }).filter(Boolean).join(" → ");
      return `<article class="text-runtime-composition"><b>${esc(entry.title)}</b><small>${esc(entry.kind)} · ${esc(entry.id)}</small>
        <ol>${entry.parts.map(part => {
          const record = records.get(part.id);
          const href = part.detail === "布局"
            ? `?view=bytemap-prg&romOffset=${Number(record?.prg_offset)}`
            : `?view=text&textKind=all&textSearch=${encodeURIComponent(part.id)}`;
          return `<li><a href="${esc(href)}">${esc(part.id)}</a><span>${esc(part.detail)}</span></li>`;
        }).join("")}</ol><div class="text-runtime-composition-preview">${preview || "仅含布局与控制命令"}</div></article>`;
    }).join("")}</div><details class="text-runtime-candidates"><summary>待核对候选 · ${candidates.length} 条直接引用示例；完整 567 条见清单</summary>
      <ul>${candidates.map(entry => `<li><b>${esc(entry.id)}</b>：${entry.parts.map(part =>
        `<a href="?view=text&textKind=all&textSearch=${encodeURIComponent(part.id)}">${esc(part.id)}</a>`).join(" → ")}</li>`).join("")}</ul>
    </details></section>`;
}

function candidateGameDataSources() {
  const gameData = characterMapCandidateSourcesAvailable(state.project?.game_data)
    ? state.project.game_data
    : null;
  return {
    gameData,
    items: gameData?.items || null,
    monsters: gameData?.monsters || null,
    shells: gameData?.shells || null,
  };
}

export async function textCatalogDocument() {
  const repository = state.projectRepository;
  const candidateSources = candidateGameDataSources();
  const sourcePeek = db.peekDocument("project.text-catalog", null);
  const characterMapPeek = db.peekDocument("text.character-map", null);
  const textRecordsPeek = db.peekDocument(TEXT_RECORDS_RESOURCE_ID, null);
  if (textCatalogCache.document && textCatalogCache.repository === repository &&
      textCatalogCache.sourceCatalog === sourcePeek &&
      textCatalogCache.characterMap === characterMapPeek &&
      textCatalogCache.textRecords === textRecordsPeek &&
      textCatalogCache.candidateItems === candidateSources.items &&
      textCatalogCache.candidateMonsters === candidateSources.monsters &&
      textCatalogCache.candidateShells === candidateSources.shells &&
      sourcePeek && characterMapPeek && textRecordsPeek) {
    return textCatalogCache.document;
  }
  if (textCatalogCache.promise && textCatalogCache.repository === repository &&
      textCatalogCache.requestSourceCatalog === sourcePeek &&
      textCatalogCache.requestCharacterMap === characterMapPeek &&
      textCatalogCache.requestTextRecords === textRecordsPeek &&
      textCatalogCache.requestCandidateItems === candidateSources.items &&
      textCatalogCache.requestCandidateMonsters === candidateSources.monsters &&
      textCatalogCache.requestCandidateShells === candidateSources.shells) {
    return textCatalogCache.promise;
  }
  // NPC 等页面只需要文本正文，不该为了找一条 path 指针先把整个 UI 域载入。
  // 两份来源都由统一 DB 缓存；这里只构造本页可安全修改的派生副本。
  textCatalogCache.repository = repository;
  textCatalogCache.sourceCatalog = null;
  textCatalogCache.characterMap = null;
  textCatalogCache.textRecords = null;
  textCatalogCache.candidateItems = null;
  textCatalogCache.candidateMonsters = null;
  textCatalogCache.candidateShells = null;
  textCatalogCache.document = null;
  textCatalogCache.recordMap = null;
  textCatalogCache.recordsByNode = null;
  textCatalogCache.requestSourceCatalog = sourcePeek;
  textCatalogCache.requestCharacterMap = characterMapPeek;
  textCatalogCache.requestTextRecords = textRecordsPeek;
  textCatalogCache.requestCandidateItems = candidateSources.items;
  textCatalogCache.requestCandidateMonsters = candidateSources.monsters;
  textCatalogCache.requestCandidateShells = candidateSources.shells;
  let pending = null;
  pending = Promise.all([
    db.getDocument("project.text-catalog", null),
    db.getDocument("text.character-map", null),
    db.getDocument(TEXT_RECORDS_RESOURCE_ID, null),
    db.getDocument("project.text-fonts", null),
  ]).then(([sourceCatalog, characterMap, textRecords, textFonts]) => {
    if (!sourceCatalog || !characterMap || !textRecords) {
      throw new Error("当前项目缺少文本目录、字符映射或定长文本记录");
    }
    if (state.projectRepository !== repository) {
      const error = new Error("文本预览请求已过期");
      error.name = "AbortError";
      throw error;
    }
    const currentCandidateSources = candidateGameDataSources();
    if (db.peekDocument("project.text-catalog", null) !== sourceCatalog ||
        db.peekDocument("text.character-map", null) !== characterMap ||
        db.peekDocument(TEXT_RECORDS_RESOURCE_ID, null) !== textRecords ||
        currentCandidateSources.items !== candidateSources.items ||
        currentCandidateSources.monsters !== candidateSources.monsters ||
        currentCandidateSources.shells !== candidateSources.shells) {
      if (textCatalogCache.promise === pending) textCatalogCache.promise = null;
      return textCatalogDocument();
    }
    const currentCharacterMap = candidateSources.gameData
      ? recomputeCharacterMapCandidates(
        characterMap,
        sourceCatalog,
        candidateSources.gameData,
      )
      : characterMap;
    const encoding = createTextRecordEncoding(currentCharacterMap, sourceCatalog, textFonts);
    textCatalogCache.runtimeEncoding = encoding;
    const document = applyTextRecordsToCatalog(
      refreshTextCatalogFromCharacterMap(sourceCatalog, currentCharacterMap),
      textRecords,
      encoding,
    );
    for (const record of document.records || []) {
      record.known_label = textKnownLabel(record);
      record.runtime_commands = runtimeCommands(textRecords.records?.[record.node_id], encoding);
    }
    textCatalogCache.recordMap = new Map(
      (document.records || []).map(record => [
        record.node_id,
        uiHexBytes(record.raw_hex),
      ])
    );
    textCatalogCache.recordsByNode = new Map(
      (document.records || []).map(record => [record.node_id, record])
    );
    textCatalogCache.repository = repository;
    textCatalogCache.sourceCatalog = sourceCatalog;
    textCatalogCache.characterMap = characterMap;
    textCatalogCache.textRecords = textRecords;
    textCatalogCache.candidateItems = candidateSources.items;
    textCatalogCache.candidateMonsters = candidateSources.monsters;
    textCatalogCache.candidateShells = candidateSources.shells;
    textCatalogCache.requestSourceCatalog = sourceCatalog;
    textCatalogCache.requestCharacterMap = characterMap;
    textCatalogCache.requestTextRecords = textRecords;
    textCatalogCache.requestCandidateItems = candidateSources.items;
    textCatalogCache.requestCandidateMonsters = candidateSources.monsters;
    textCatalogCache.requestCandidateShells = candidateSources.shells;
    textCatalogCache.document = document;
    return document;
  }).catch(error => {
    if (textCatalogCache.promise === pending) textCatalogCache.promise = null;
    throw error;
  });
  textCatalogCache.promise = pending;
  return pending;
}

export function invalidateTextCatalogDocument() {
  textCatalogCache.promise = null;
  textCatalogCache.document = null;
  textCatalogCache.recordMap = null;
  textCatalogCache.recordsByNode = null;
  textCatalogCache.sourceCatalog = null;
  textCatalogCache.characterMap = null;
  textCatalogCache.textRecords = null;
  textCatalogCache.candidateItems = null;
  textCatalogCache.candidateMonsters = null;
  textCatalogCache.candidateShells = null;
  textCatalogCache.requestSourceCatalog = null;
  textCatalogCache.requestCharacterMap = null;
  textCatalogCache.requestTextRecords = null;
  textCatalogCache.requestCandidateItems = null;
  textCatalogCache.requestCandidateMonsters = null;
  textCatalogCache.requestCandidateShells = null;
}

export async function textCatalogRecordSource(recordId) {
  await textCatalogDocument();
  const records = textCatalogCache.recordMap || new Map();
  const id = String(recordId ?? "");
  return Object.freeze({
    bytes: records.get(id) ?? null,
    records,
  });
}

function currentTextClosure(rootIds, recordsByNode) {
  const pending = [...rootIds];
  const visited = new Set();
  const visible = [];
  while (pending.length) {
    const nodeId = pending.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    const record = recordsByNode.get(nodeId);
    if (!record) continue;
    if (currentTextReference(nodeId).label || textRecordDisplayText(record)) visible.push(record);
    for (const target of record.direct_targets || []) pending.push(target);
  }
  return visible;
}

export async function loadCurrentTextRecordDisplays(root = document) {
  const targets = [...root.querySelectorAll("[data-current-text-record]")];
  if (!targets.length) return;
  try {
    await textCatalogDocument();
    const recordsByNode = textCatalogCache.recordsByNode || new Map();
    for (const target of targets) {
      if (!target.isConnected) continue;
      const rootIds = String(target.dataset.currentTextRecord || "")
        .split(",").filter(Boolean);
      const records = currentTextClosure(rootIds, recordsByNode);
      target.innerHTML = records.map(record =>
        currentTextRecordCard(record, {compact: target.dataset.compact === "1"})
      ).join("");
      bindResourceQueries(target);
    }
  } catch (error) {
    editorLog.error("文字", `操作失败：${error?.message || error}`, error);
    for (const target of targets) {
      if (!target.isConnected) continue;
      target.innerHTML = `<span class="warning">读取当前文字失败：${esc(error.message)}</span>`;
    }
  }
}

export const CHARSET_PAGE_SIZE = 96;
export function bindTextModeTabs() {
  document.querySelectorAll("[data-text-mode]").forEach(button =>
    button.addEventListener("click", async () => {
      state.textMode = button.dataset.textMode;
      replaceHistoryUrl(currentViewUrl());
      await render();
    })
  );
}

function textFilteredRecords(document) {
  const query = state.textSearch.trim().toLowerCase();
  const layoutRecordIds = uiLayoutTextRecordIds();
  return (document.records || []).filter(record => {
    if (layoutRecordIds.has(record.node_id)) return false;
    if (state.textRegion !== "all" && record.region_hex !== state.textRegion) {
      return false;
    }
    const kind = record.text_classification?.kind || "control";
    if (state.textKind === "text"
        && !["sentence", "name", "label", "template"].includes(kind)) {
      return false;
    }
    if (!["all", "text"].includes(state.textKind) && kind !== state.textKind) {
      return false;
    }
    if (!query) return true;
    return [
      record.node_id,
      `${record.region_hex}:${String(record.record).padStart(3, "0")}`,
      record.region_name,
      record.known_label,
      record.display_text,
      record.unicode_preview,
      kind,
      textClassLabels[kind],
      record.raw_hex,
      record.prg_offset_hex,
      record.file_offset_hex,
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
  });
}

function textCatalogRow(record, rowIndex) {
  const classification = record.text_classification || {};
  const pageCount = Math.max(1, Number(classification.page_count) || 1);
  const kind = classification.kind || "control";
  const dynamic = Number(classification.dynamic_slots || 0);
  const includes = Number(classification.direct_includes || 0);
  const structure = [
    `${record.glyph_tokens} 字形`,
    record.literal_tiles ? `${record.literal_tiles} 单字节` : "",
    dynamic ? `${dynamic} 动态槽` : "",
    includes ? `${includes} 引用` : "",
    pageCount > 1 ? `${pageCount} 页` : "",
    record.unicode_mapping?.mapped_glyphs
      ? `${record.unicode_mapping.mapped_glyphs}/${record.unicode_mapping.total_glyphs} 字形已有映射`
      : "",
  ].filter(Boolean);
  const chrPreview = kind === "fragment"
    ? `<span class="text-fragment-note" title="在完整界面中组合查看">片段</span>`
    : Array.from(
        {length: pageCount},
        (_, page) => `<canvas data-text-record="${esc(record.node_id)}" data-text-page="${page}" width="256" height="240" aria-label="${esc(record.node_id)} page ${page + 1}"></canvas>`,
      ).join("");
  const mappingStatus = record.unicode_mapping?.status || "unmapped";
  const displayText = textRecordDisplayText(record);
  const directText = displayText
    ? `<div class="text-current-value text-unicode-${esc(mappingStatus)}" title="${mappingStatus === "confirmed" ? "人工确认文字" : "完整字符映射"}"><span>${esc(displayText)}</span></div>`
    : "";
  const runtimePreview = runtimeTextPreview(record, {}, true);
  const runtimeText = (record.runtime_commands || []).some(command => runtimeFillTokens.has(Number(command.token)))
    ? `<div class="text-runtime-record-preview">${runtimePreview}</div>` : "";
  const resourceUid = `ui-script:${String(record.node_id).replace(/^record:/, "")}`;
  return `<tr class="text-record-row text-kind-${esc(kind)} ${record.decode_warnings ? "warning" : ""}" data-text-row-index="${rowIndex}" data-text-record-id="${esc(record.node_id)}" title="RAW ${esc(record.raw_hex)}">
    <td><button class="resource-uid" type="button" data-resource-query="${esc(resourceUid)}">${esc(resourceUid)}</button></td>
    <td><b>${esc(record.region_hex)}</b><small>${esc(record.region_name)}</small></td>
    <td><span class="text-kind-label">${esc(textClassLabels[kind] || kind)}</span></td>
    <td class="text-record-current">${directText}${runtimeText}</td>
    <td class="text-record-preview"><div>${chrPreview}</div></td>
    <td>${textRecordReferenceCell(record, resourceUid)}</td>
    <td><div class="table-cell-stack">${structure.map(value => `<span>${esc(value)}</span>`).join("")}${record.decode_warnings ? `<small class="warning">${record.decode_warnings} 解码警告</small>` : ""}</div></td>
  </tr>`;
}

async function paintTextRecordCanvases(renderToken, root = document, eager = true) {
  const canvases = [...root.querySelectorAll("[data-text-record]")];
  if (!canvases.length) return;
  const {model, patterns, corePatterns, glyphs} = await uiJsRenderSources();
  const paint = async canvas => {
    if (renderToken !== state.textRenderToken || !canvas.isConnected) return;
    const record = canvas.dataset.textRecord;
    const source = await textCatalogRecordSource(record);
    if (renderToken !== state.textRenderToken || !canvas.isConnected) return;
    const {context, image} = uiBlankCanvas(canvas);
    if (Array.isArray(source.bytes)) {
      uiPaintInterfaceScript(
        image,
        {
          kind: "script",
          record,
          cursor: 0,
          line_origin: 0,
          page_index: Number(canvas.dataset.textPage || 0),
        },
        model,
        patterns,
        corePatterns,
        glyphs,
        source.records,
      );
    }
    context.putImageData(image, 0, 0);
    canvas.dataset.painted = "1";
  };
  textCanvasObserver?.disconnect();
  if (!("IntersectionObserver" in window)) {
    await Promise.all(canvases.map(paint));
    return;
  }
  textCanvasObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      textCanvasObserver.unobserve(entry.target);
      void paint(entry.target);
    }
  }, {rootMargin: "720px 0px"});
  const eagerCount = eager ? Math.min(12, canvases.length) : 0;
  await Promise.all(canvases.slice(0, eagerCount).map(paint));
  for (const canvas of canvases.slice(eagerCount)) textCanvasObserver.observe(canvas);
}

function mountTextCatalogRows(target, records, renderToken) {
  const wrap = target.querySelector(".text-record-table");
  const body = wrap?.querySelector("tbody");
  const content = $("#content");
  if (!body || !content) return;
  const height = Array(records.length).fill(100);
  const rowIndexes = new Map(records.map((record, index) => [record.node_id.toLowerCase(), index]));
  const windowSize = 40;
  const overscan = 12;
  let first = 0;
  let end = 0;
  let frame = 0;
  const offset = index => {
    let total = 0;
    for (let i = 0; i < index; i += 1) total += height[i];
    return total;
  };
  const indexAt = position => {
    let total = 0;
    for (let i = 0; i < height.length; i += 1) {
      total += height[i];
      if (total > position) return i;
    }
    return Math.max(0, height.length - 1);
  };
  const spacer = pixels => pixels > 0
    ? `<tr class="virtual-table-spacer" aria-hidden="true"><td colspan="8" style="height:${pixels}px;padding:0;border:0;line-height:0"></td></tr>`
    : "";
  const tableTop = () => wrap.getBoundingClientRect().top
    - content.getBoundingClientRect().top + content.scrollTop
    + wrap.querySelector("thead").getBoundingClientRect().height;
  const visibleIndex = () => indexAt(Math.max(0, content.scrollTop - tableTop()));
  const selectedIndex = () => {
    for (const id of [state.resourceId, state.recordId]) {
      const requested = String(id || "").replace(/^ui-script:/u, "record:")
        .replace(/^([0-9A-F]{2}:[0-9]{3})$/iu, "record:$1").toLowerCase();
      if (rowIndexes.has(requested)) return rowIndexes.get(requested);
    }
    return -1;
  };
  const measure = () => {
    if (renderToken !== state.textRenderToken || !body.isConnected) return;
    let changed = false;
    for (const row of body.querySelectorAll("tr[data-text-record-id]")) {
      const index = Number(row.dataset.textRowIndex);
      const measured = row.getBoundingClientRect().height;
      if (measured > 0 && Math.abs(measured - height[index]) > 1) {
        height[index] = measured;
        changed = true;
      }
    }
    if (!changed) return;
    const anchor = body.querySelector(`tr[data-text-row-index="${visibleIndex()}"]`);
    const before = anchor?.getBoundingClientRect().top;
    const topSpacer = body.firstElementChild?.classList.contains("virtual-table-spacer")
      ? body.firstElementChild.firstElementChild : null;
    const bottomSpacer = body.lastElementChild?.classList.contains("virtual-table-spacer")
      ? body.lastElementChild.firstElementChild : null;
    if (topSpacer) topSpacer.style.height = `${offset(first)}px`;
    if (bottomSpacer) bottomSpacer.style.height = `${offset(records.length) - offset(end)}px`;
    if (anchor && before !== undefined) content.scrollTop += anchor.getBoundingClientRect().top - before;
    schedule();
  };
  const observer = new ResizeObserver(measure);
  const mount = (start, stop) => {
    if (start === first && stop === end) return;
    const hadRows = end > first;
    const anchor = body.querySelector(`tr[data-text-row-index="${visibleIndex()}"]`);
    const before = anchor?.getBoundingClientRect().top;
    first = start;
    end = stop;
    observer.disconnect();
    body.innerHTML = spacer(offset(first))
      + records.slice(first, end).map((record, index) =>
        textCatalogRow(record, first + index)).join("")
      + spacer(offset(records.length) - offset(end));
    const selection = selectedIndex();
    if (selection >= first && selection < end) {
      body.querySelector(`tr[data-text-row-index="${selection}"]`)?.classList.add("resource-target-focus");
    }
    for (const row of body.querySelectorAll("tr[data-text-record-id]")) observer.observe(row);
    if (anchor && before !== undefined) {
      const next = body.querySelector(`tr[data-text-row-index="${anchor.dataset.textRowIndex}"]`);
      if (next) content.scrollTop += next.getBoundingClientRect().top - before;
    }
    if (hadRows) void paintTextRecordCanvases(renderToken, body, false);
    requestAnimationFrame(measure);
  };
  const update = () => {
    frame = 0;
    if (renderToken !== state.textRenderToken || !body.isConnected) {
      observer.disconnect();
      content.removeEventListener("scroll", schedule);
      return;
    }
    const top = Math.max(0, content.scrollTop - tableTop());
    const visibleStart = indexAt(top);
    const visibleEnd = indexAt(top + content.clientHeight) + 1;
    if (visibleStart >= first + overscan / 2 && visibleEnd <= end - overscan / 2) return;
    const start = Math.max(0, visibleStart - overscan);
    mount(start, Math.min(records.length, Math.max(start + windowSize, visibleEnd + overscan)));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  content.addEventListener("scroll", schedule, {passive: true});
  const targetIndex = selectedIndex();
  const start = Math.max(0, targetIndex - overscan);
  mount(start, Math.min(records.length, start + windowSize));
  if (targetIndex >= 0 && !state.resourceId) {
    const row = body.querySelector(`tr[data-text-row-index="${targetIndex}"]`);
    row?.classList.add("resource-target-focus");
    row?.querySelector("[data-resource-query]")?.scrollIntoView({block: "center", inline: "nearest"});
  }
  schedule();
  return () => {
    observer.disconnect();
    content.removeEventListener("scroll", schedule);
    cancelAnimationFrame(frame);
  };
}

export async function loadNpcCurrentTexts() {
  const placeholders = [...document.querySelectorAll("[data-npc-text-reference]")];
  if (!placeholders.length) return;
  try {
    const documentData = await textCatalogDocument();
    const records = new Map(
      (documentData.records || []).map(record => [record.node_id, record])
    );
    for (const placeholder of placeholders) {
      if (!placeholder.isConnected) continue;
      const nodeId = placeholder.dataset.npcTextReference;
      const currentTarget = placeholder.querySelector("[data-npc-current-text]");
      const record = records.get(nodeId);
      if (!record) {
        if (currentTarget) currentTarget.innerHTML = `<span class="resource-empty">文本记录未找到</span>`;
        continue;
      }
      if (currentTarget) {
        currentTarget.innerHTML = currentTextRecordCard(record)
          || "";
        bindResourceQueries(currentTarget);
      }
    }
    await loadCurrentTextRecordDisplays();
  } catch (error) {
    editorLog.error("文字", `操作失败：${error?.message || error}`, error);
    for (const placeholder of placeholders) {
      if (!placeholder.isConnected) continue;
      const currentTarget = placeholder.querySelector("[data-npc-current-text]");
      if (currentTarget) currentTarget.innerHTML = `<span class="warning">读取当前文字失败：${esc(error.message)}</span>`;
    }
  }
}

async function renderTextCatalogResults(document) {
  const target = $("#text-catalog-results");
  if (!target) return;
  updateTextLayoutNotice();
  const records = textFilteredRecords(document);
  const focusedId = state.textSearch.trim().toUpperCase();
  const runtimeEditor = /^RECORD:[0-9A-F]{2}:[0-9]{3}$/u.test(focusedId)
    ? runtimeEditorMarkup(textCatalogCache.textRecords, focusedId.replace(/^RECORD:/u, "record:"), textCatalogCache.runtimeEncoding)
    : "";
  const focusedPhysicalLocation = runtimeEditor
    ? physicalLocationMarkup({uid: `ui-script:${focusedId.slice("RECORD:".length)}`}) : "";
  const renderToken = ++state.textRenderToken;
  textCatalogWindowCleanup?.();
  textCatalogWindowCleanup = null;
  const scrollTop = $("#content")?.scrollTop || 0;
  target.innerHTML = `${textCompositionPanel(document)}${runtimeEditor ? handleMarkup(`ui-script:${focusedId.slice("RECORD:".length)}`) : ""}${runtimeEditor}${runtimeEditor ? '<div data-text-record-fields></div>' : ''}${focusedPhysicalLocation}<div class="text-result-line"><b>${records.length.toLocaleString()} 条匹配</b><span>全部连续展开 · 无分页</span></div>
    ${records.length ? `<div class="table-wrap text-record-table"><table><thead><tr><th>资源 ID</th><th>文本区</th><th>类型</th><th>当前文字</th><th>ROM 原始渲染</th><th>字符编码与其他引用</th><th>结构</th></tr></thead><tbody></tbody></table></div>` : `<div class="empty"><b>没有匹配的文本记录</b></div>`}`;
  if (records.length) textCatalogWindowCleanup = mountTextCatalogRows(target, records, renderToken);
  if (!state.resourceId && !state.recordId) $("#content").scrollTop = scrollTop;
  bindResourceQueries(target, {delegate: true});
  bindWideTableWheelScrolling(target);
  bindRuntimeEditor(target.querySelector("[data-runtime-editor]"), {
    getDocument: () => textCatalogCache.textRecords,
    getEncoding: () => textCatalogCache.runtimeEncoding,
    onSaved: async () => renderTextCatalogResults(await textCatalogDocument()),
  });
  const fieldHost = target.querySelector('[data-text-record-fields]');
  if (fieldHost) {
    const id = focusedId.replace(/^RECORD:/u, 'record:');
    const object = (await db.getFieldObjects('text-record')).find(object => object.id === id);
    if (object && fieldHost.isConnected) await object.mount(fieldHost, {compactIdentity: true});
  }
  await paintTextRecordCanvases(renderToken, target, true);
}

export async function loadTextCatalog() {
  const target = $("#text-catalog-results");
  if (!target) return;
  try {
    const document = await textCatalogDocument();
    const update = () => {
      const url = new URL(location.href);
      url.searchParams.set("textRegion", state.textRegion);
      url.searchParams.set("textKind", state.textKind);
      if (state.textSearch) url.searchParams.set("textSearch", state.textSearch);
      else url.searchParams.delete("textSearch");
      url.searchParams.delete("textPage");
      replaceHistoryUrl(url);
      renderTextCatalogResults(document);
    };
    $("#text-region-select")?.addEventListener("change", event => {
      state.textRegion = event.target.value;
      update();
    });
    $("#text-kind-select")?.addEventListener("change", event => {
      state.textKind = event.target.value;
      update();
    });
    let searchTimer = null;
    $("#text-catalog-search")?.addEventListener("input", event => {
      state.textSearch = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(update, 100);
    });
    await renderTextCatalogResults(document);
  } catch (error) {
    editorLog.error("文字", `操作失败：${error?.message || error}`, error);
    target.innerHTML = `<div class="empty"><b>读取全量文本失败</b><span>${esc(error.message)}</span></div>`;
  }
}
