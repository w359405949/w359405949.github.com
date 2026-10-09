import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { db, TEXT_RECORDS_RESOURCE_ID, recomputeCharacterMapCandidates, createTextRecordEncoding, applyTextRecordsToCatalog, refreshTextCatalogFromCharacterMap, characterMapCandidateSourcesAvailable, decodeFixedTextRecord, textFillDetails, createAutoSave, CHARACTER_MAP_RESOURCE_ID, characterMapFieldStates, flushAllAutoSaves, trackAutoSavePreparation, saveCharacterMapChanges, requireCharacterMapAsset, applyCurrentTextReferencesToProject, applyTextCatalogToStoryProject } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { bindResourceQueries, bindWideTableWheelScrolling, loadWritebackCapabilities } from './preview-sound-DsPhxRYS.js';
import { textCatalogCache, uiConstructionModel, uiJsRenderSources, uiPaintInterfaceScript, bindGlyphField, paintGlyphBitmap, charsetMapCache, uiPaintFontAtlas, uiGlyphId } from './ui-construction-preview-C97hIjGW.js';
import { runtimeEditorMarkup, bindRuntimeEditor, updateTableRowWindow, resetToOriginalButton, bindFieldResetToOriginalButtons, applyResetToOriginalStates } from './pattern-pixel-editor-B8puYQ8A.js';
import { currentTextRecordCard, esc, $, uiHexBytes, currentTextReference, textRecordDisplayText, physicalLocationMarkup, uiBlankCanvas, textRecordReferenceCell, requireBrowserProjectRepository, textCharacterResourceUid, bindTextInputEvents } from './element-tree-DsgOBeTK.js';
import { handleMarkup } from './preview-DMSrQMyk.js';
import { replaceHistoryUrl, currentViewUrl, render } from './ui-editor-nodes-CtPdwTyu.js';

// @editor-module 展示当前文本记录目录，解析文本引用并绘制记录预览。

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

function renderText() {
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

const textClassLabels = {
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

async function textCatalogDocument() {
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

function invalidateTextCatalogDocument() {
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

async function textCatalogRecordSource(recordId) {
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

async function loadCurrentTextRecordDisplays(root = document) {
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

const CHARSET_PAGE_SIZE = 96;
function bindTextModeTabs() {
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
  const canvases = [...root.querySelectorAll("[data-text-record]")]
    .filter(canvas => canvas.dataset.painted !== "1");
  if (!canvases.length) return;
  const {model, patterns, corePatterns, glyphs} = await uiJsRenderSources();
  const paint = async canvas => {
    if (renderToken !== state.textRenderToken || !canvas.isConnected) return;
    const record = canvas.dataset.textRecord;
    const source = await textCatalogRecordSource(record);
    if (renderToken !== state.textRenderToken || !canvas.isConnected || canvas.dataset.painted === "1") return;
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
  const spacer = pixels => `<tr class="virtual-table-spacer" aria-hidden="true"><td colspan="8" style="height:${pixels}px;padding:0;border:0;line-height:0"></td></tr>`
    ;
  const mountedRows = new Map();
  const spacers = body.ownerDocument.createElement('template');
  spacers.innerHTML = spacer(1) + spacer(1);
  const [topSpacer, bottomSpacer] = spacers.content.children;
  const setSpacer = (row, pixels) => {
    row.hidden = pixels === 0;
    row.firstElementChild.style.height = `${pixels}px`;
  };
  body.append(topSpacer, bottomSpacer);
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
    setSpacer(topSpacer, offset(first));
    setSpacer(bottomSpacer, offset(records.length) - offset(end));
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
    updateTableRowWindow(body, mountedRows, {
      first, end, before: bottomSpacer,
      rowHtml: index => textCatalogRow(records[index], index),
    });
    setSpacer(topSpacer, offset(first));
    setSpacer(bottomSpacer, offset(records.length) - offset(end));
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

async function loadNpcCurrentTexts() {
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

async function loadTextCatalog() {
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

var catalog = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CHARSET_PAGE_SIZE: CHARSET_PAGE_SIZE,
  bindTextModeTabs: bindTextModeTabs,
  invalidateTextCatalogDocument: invalidateTextCatalogDocument,
  loadCurrentTextRecordDisplays: loadCurrentTextRecordDisplays,
  loadNpcCurrentTexts: loadNpcCurrentTexts,
  loadTextCatalog: loadTextCatalog,
  renderText: renderText,
  textCatalogDocument: textCatalogDocument,
  textCatalogRecordSource: textCatalogRecordSource,
  textClassLabels: textClassLabels
});

// @editor-module 字符集中的 12×12 正文字形像素编辑，自动保存到 char。

async function openGlyphEditor(handle) {
  const repository = state.projectRepository;
  const field = await db.getField("char", handle, "narrative_glyph_bitmap");
  const capabilities = await loadWritebackCapabilities(repository,
    state.browserPackageManifest || state.browserProjectManifest);
  if (repository !== state.projectRepository) return;
  const dialog = document.createElement("dialog");
  dialog.className = "narrative-glyph-dialog";
  const title = document.createElement("h3");
  title.textContent = `字形 ${handle.replace("font-glyph:", "").replace(":", " ")}`;
  if (capabilities.byResource.get("char")?.state !== "bound") {
    const mark = document.createElement("small");
    mark.textContent = " ◇"; mark.title = "暂时不写进 ROM"; title.append(mark);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 12;
  canvas.style.cssText = "width:288px;height:288px;image-rendering:pixelated;cursor:crosshair;display:block";
  canvas.dataset.glyphEditor = handle;
  canvas.setAttribute("aria-label", "点击切换字形像素");
  const preview = document.createElement("canvas");
  preview.width = preview.height = 12;
  preview.style.cssText = "width:36px;height:36px;image-rendering:pixelated;margin:12px";
  const error = document.createElement("p"); error.setAttribute("role", "alert");
  const actions = document.createElement("div");
  actions.className = "glyph-editor-actions";
  actions.innerHTML = resetToOriginalButton(handle, {title: "重置这个字形；其他字形的编辑保留"});
  const reset = actions.querySelector("[data-reset-to-original]");
  const close = document.createElement("button"); close.textContent = "关闭"; close.dataset.glyphClose = "";
  close.className = "button ghost";
  let bitmap = [...field.value], version = field.version, busy = false, saving = false;
  const paint = () => {
    for (const target of [canvas, preview]) paintGlyphBitmap(target, bitmap);
    applyResetToOriginalStates(actions, new Map([[handle,
      bitmap.some((value, index) => value !== field.defaultValue[index])]]),
    {busy: busy || reset.dataset.resetPending === "true"});
  };
  const saver = createAutoSave(async bytes => {
    saving = true;
    try {
      await field.set(bytes, {expectedVersion: version});
      version = field.version;
    } finally {
      saving = false;
      if (saver.pending) paint();
    }
  }, {onError: e => {error.textContent = `保存失败：${e.message}`;}});
  canvas.addEventListener("click", event => {
    if (busy || reset.dataset.resetPending === "true" || repository !== state.projectRepository) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 12 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 12 / rect.height);
    if (x < 0 || x >= 12 || y < 0 || y >= 12) return;
    if (!saver.pending && !saving) {bitmap = [...field.value]; version = field.version;}
    bitmap[Math.floor(x / 4) * 6 + Math.floor(y / 2)] ^= 1 << (7 - x % 4 - (y % 2) * 4);
    paint(); error.textContent = ""; saver.commit(handle, [...bitmap]);
  });
  bindFieldResetToOriginalButtons(actions, new Map([[handle, field]]), {
    beforeReset: async () => {
      saver.cancel(handle); await saver.settled(); error.textContent = "";
    },
    onError: e => {error.textContent = `重置失败：${e.message}`;},
  });
  const finish = async () => {
    if (busy || reset.dataset.resetPending === "true") return;
    busy = true; close.disabled = reset.disabled = true;
    await saver.flush();
    if (error.textContent) {busy = false; close.disabled = false; paint(); return;}
    dialog.close(); dialog.remove();
  };
  close.addEventListener("click", finish);
  dialog.addEventListener("cancel", event => {event.preventDefault(); finish();});
  actions.prepend(preview);
  actions.append(close);
  dialog.append(title, canvas, error, actions);
  document.body.append(dialog); dialog.showModal();
  bindGlyphField(canvas, field); bindGlyphField(preview, field);
}

// @editor-module 字符集工作台

const charsetStatusLabels = {
  confirmed: "人工确认",
  "manual-candidate": "人工候选",
  candidate: "自动候选",
  conflict: "候选冲突",
  unidentified: "待识别",
  rejected: "已否决",
};

let charsetOriginalDirty = new Map();
let charsetOriginalStateRepository = null;
let charsetOriginalVersion = null;
let charsetCacheRepository = null;
let charsetOriginalStateGeneration = 0;
let charsetDocumentGeneration = 0;
let charsetWorkbenchLoadGeneration = 0;
let charsetWorkbenchRenderGeneration = 0;
let charsetMutationGeneration = 0;
let charsetSearchTimer = null;

function charsetResetIsDirty(encodedHex) {
  return Boolean(charsetOriginalDirty.get(encodedHex));
}

const CHARSET_RESET_ALL_KEY = "charset-map";

async function loadCharsetOriginalStates(document_, repository = null) {
  const activeRepository = repository || requireBrowserProjectRepository(state);
  const activeProject = state.project;
  const generation = ++charsetOriginalStateGeneration;
  if (charsetOriginalStateRepository !== activeRepository) {
    charsetOriginalStateRepository = activeRepository;
    charsetOriginalDirty = new Map();
    charsetOriginalVersion = null;
  }
  if (activeRepository !== state.projectRepository) return null;
  const snapshot = document_?.records?.length
    ? await characterMapFieldStates(db) : {states: {}, dirty: false};
  if (generation !== charsetOriginalStateGeneration
      || activeRepository !== state.projectRepository
      || activeProject !== state.project) return null;
  charsetOriginalDirty = new Map(Object.entries(snapshot.states));
  charsetOriginalVersion = snapshot.version ?? null;
  state.charsetWorkingDirty = Boolean(snapshot.dirty);
  return snapshot;
}

async function charsetDocument(force = false) {
  const repository = requireBrowserProjectRepository(state);
  const activeProject = state.project;
  const gameData = characterMapCandidateSourcesAvailable(activeProject?.game_data)
    ? activeProject.game_data
    : null;
  const itemSource = gameData?.items || null;
  const monsterSource = gameData?.monsters || null;
  const shellSource = gameData?.shells || null;
  if (charsetCacheRepository !== repository) {
    charsetCacheRepository = repository;
    charsetDocumentGeneration += 1;
    Object.assign(charsetMapCache, {
      repository,
      sourceDocument: null,
      textCatalog: null,
      itemSource: null,
      monsterSource: null,
      shellSource: null,
      promise: null,
      document: null,
    });
    textCatalogCache.promise = null;
    textCatalogCache.document = null;
    textCatalogCache.recordMap = null;
    textCatalogCache.recordsByNode = null;
    textCatalogCache.repository = repository;
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
  if (force) {
    charsetDocumentGeneration += 1;
    db.invalidate("text.character-map");
    charsetMapCache.promise = null;
    charsetMapCache.document = null;
    charsetMapCache.sourceDocument = null;
    charsetMapCache.textCatalog = null;
  }
  const sourceDocument = db.peekDocument("text.character-map", null);
  const sourceCatalog = db.peekDocument("project.text-catalog", null);
  if (charsetMapCache.document && sourceDocument &&
      charsetMapCache.repository === repository &&
      charsetMapCache.sourceDocument === sourceDocument &&
      charsetMapCache.itemSource === itemSource &&
      charsetMapCache.monsterSource === monsterSource &&
      charsetMapCache.shellSource === shellSource &&
      (!gameData || charsetMapCache.textCatalog === sourceCatalog)) {
    return charsetMapCache.document;
  }
  const generation = ++charsetDocumentGeneration;
  let pending = null;
  pending = Promise.all([
    db.getDocument("text.character-map", null),
    gameData ? db.getDocument("project.text-catalog", null) : Promise.resolve(null),
  ]).then(([document_, textCatalog]) => {
    if (!document_) throw new Error("当前项目缺少字符映射");
    if (gameData && !textCatalog) throw new Error("当前项目缺少发布文本目录");
    const currentGameData = state.project?.game_data;
    if (repository !== state.projectRepository || activeProject !== state.project ||
        db.peekDocument("text.character-map", null) !== document_ ||
        (gameData && db.peekDocument("project.text-catalog", null) !== textCatalog) ||
        itemSource !== (currentGameData?.items || null) ||
        monsterSource !== (currentGameData?.monsters || null) ||
        shellSource !== (currentGameData?.shells || null)) {
      return charsetDocument();
    }
    const current = gameData
      ? recomputeCharacterMapCandidates(document_, textCatalog, gameData)
      : document_;
    if (generation === charsetDocumentGeneration &&
        charsetMapCache.promise === pending) {
      state.charsetWorkingDirty = Boolean(
        db.metadata("text.character-map")?.dirty,
      );
      Object.assign(charsetMapCache, {
        repository,
        sourceDocument: document_,
        textCatalog,
        itemSource,
        monsterSource,
        shellSource,
        document: current,
      });
    }
    return current;
  }).catch(error => {
    if (generation === charsetDocumentGeneration &&
        charsetMapCache.promise === pending) {
      charsetMapCache.promise = null;
    }
    throw error;
  });
  charsetMapCache.promise = pending;
  return pending;
}

async function installCurrentCharacterMap(
  asset,
  repository = state.projectRepository,
) {
  const value = requireCharacterMapAsset(asset);
  const activeProject = state.project;
  const [sourceCatalog, currentTextCatalog] = await Promise.all([
    db.getDocument("project.text-catalog", null),
    textCatalogDocument(),
  ]);
  if (repository !== state.projectRepository || activeProject !== state.project) {
    return null;
  }
  if (!sourceCatalog) throw new Error("当前项目缺少发布文本目录");
  const gameData = characterMapCandidateSourcesAvailable(activeProject?.game_data)
    ? activeProject.game_data
    : null;
  const currentDocument = gameData
    ? recomputeCharacterMapCandidates(value.document, sourceCatalog, gameData)
    : value.document;
  const textCatalog = refreshTextCatalogFromCharacterMap(
    currentTextCatalog,
    currentDocument,
  );
  const sourceDocument = db.peekDocument("text.character-map", null) || value.document;
  charsetDocumentGeneration += 1;
  charsetCacheRepository = repository;
  Object.assign(charsetMapCache, {
    repository,
    sourceDocument,
    textCatalog: sourceCatalog,
    itemSource: gameData?.items || null,
    monsterSource: gameData?.monsters || null,
    shellSource: gameData?.shells || null,
    promise: Promise.resolve(currentDocument),
    document: currentDocument,
  });
  textCatalogCache.document = textCatalog;
  textCatalogCache.promise = Promise.resolve(textCatalog);
  textCatalogCache.repository = repository;
  textCatalogCache.sourceCatalog = db.peekDocument("project.text-catalog", null);
  textCatalogCache.characterMap = sourceDocument;
  textCatalogCache.textRecords = db.peekDocument(TEXT_RECORDS_RESOURCE_ID, null);
  textCatalogCache.candidateItems = gameData?.items || null;
  textCatalogCache.candidateMonsters = gameData?.monsters || null;
  textCatalogCache.candidateShells = gameData?.shells || null;
  textCatalogCache.requestSourceCatalog = textCatalogCache.sourceCatalog;
  textCatalogCache.requestCharacterMap = sourceDocument;
  textCatalogCache.requestTextRecords = textCatalogCache.textRecords;
  textCatalogCache.requestCandidateItems = textCatalogCache.candidateItems;
  textCatalogCache.requestCandidateMonsters = textCatalogCache.candidateMonsters;
  textCatalogCache.requestCandidateShells = textCatalogCache.candidateShells;
  textCatalogCache.recordMap = new Map(
    (textCatalog.records || []).map(record => [
      record.node_id,
      String(record.raw_hex || "").trim().split(/\s+/u)
        .filter(Boolean).map(part => Number.parseInt(part, 16)),
    ]),
  );
  textCatalogCache.recordsByNode = new Map(
    (textCatalog.records || []).map(record => [record.node_id, record]),
  );
  applyCurrentTextReferencesToProject(
    state.project,
    textCatalog,
    currentDocument,
  );
  applyTextCatalogToStoryProject(state.project, textCatalog);
  return textCatalog;
}

function charsetMutationIsCurrent(generation, repository, project) {
  return generation === charsetMutationGeneration
    && repository === state.projectRepository
    && project === state.project;
}

function applyCurrentCharsetResetStates() {
  const workbench = $("#charset-workbench");
  if (!workbench) return;
  const states = new Map(
    [...workbench.querySelectorAll("[data-reset-to-original]")]
      .filter(button => button.dataset.resetToOriginal !== CHARSET_RESET_ALL_KEY).map(button => [
      button.dataset.resetToOriginal,
      charsetResetIsDirty(button.dataset.resetToOriginal),
    ]),
  );
  applyResetToOriginalStates(workbench, states);
}

function beginCharsetMutation() {
  const context = {
    generation: ++charsetMutationGeneration,
    repository: requireBrowserProjectRepository(state),
    project: state.project,
    expectedVersion: charsetOriginalVersion,
  };
  clearTimeout(charsetSearchTimer);
  charsetSearchTimer = null;
  return context;
}

function currentCharsetMutation(context) {
  return charsetMutationIsCurrent(
    context.generation,
    context.repository,
    context.project,
  );
}

function finishCharsetMutation(context) {
  if (context.generation === charsetMutationGeneration) {
    if (context.repository === state.projectRepository
        && context.project === state.project) {
      applyCurrentCharsetResetStates();
    }
  }
}

async function refreshCharacterMapMutation(asset, context) {
  if (!currentCharsetMutation(context)) return null;
  const textCatalog = await installCurrentCharacterMap(
    asset,
    context.repository,
  );
  if (!textCatalog || !currentCharsetMutation(context)) return null;
  const originalStates = await loadCharsetOriginalStates(
    asset.document,
    context.repository,
  );
  if (!originalStates || !currentCharsetMutation(context)) return null;
  return {textCatalog, originalStates};
}

function refreshVisibleCharsetStates() {
  const workbench = $("#charset-workbench");
  if (!workbench) return;
  applyCurrentCharsetResetStates();
  for (const row of workbench.querySelectorAll("[data-charset-code]")) {
    row.classList.toggle(
      "dirty",
      charsetResetIsDirty(row.dataset.charsetCode),
    );
  }
  updateCharsetSaveControls();
}

async function writeCharsetChanges(payload) {
  const result = await saveCharacterMapChanges(
    db,
    payload.changes,
  );
  if (payload.repository !== state.projectRepository ||
      payload.project !== state.project) return;
  const textCatalog = await installCurrentCharacterMap(
    result.value,
    payload.repository,
  );
  if (!textCatalog || payload.repository !== state.projectRepository ||
      payload.project !== state.project) return;
  const originalStates = await loadCharsetOriginalStates(
    result.value.document,
    payload.repository,
  );
  if (!originalStates || payload.repository !== state.projectRepository ||
      payload.project !== state.project) return;
  state.charsetMessage = "";
  refreshVisibleCharsetStates();
}

function commitCharsetChanges(mappingDocument, changes = []) {
  try {
    const repository = requireBrowserProjectRepository(state);
    if (!changes.length) return;
    state.charsetMessage = "";
    trackAutoSavePreparation(writeCharsetChanges({
      repository,
      project: state.project,
      changes: changes.map(change => {
        if (change.status !== "auto") return change;
        const record = (mappingDocument.records || []).find(
          item => item.encoded_hex === change.encoded_hex,
        );
        return {
          ...change,
          candidates: (record?.candidates || []).map(candidate => ({
            unicode: candidate.unicode,
          })),
        };
      }),
    }).catch(error => {
      editorLog.error("文字", `操作失败：${error?.message || error}`, error);
      if (repository === state.projectRepository)
        updateCharsetSaveControls(`保存失败：${error?.message || error}`);
    }));
    updateCharsetSaveControls();
  } catch (error) {
    editorLog.error("文字", `操作失败：${error?.message || error}`, error);
    updateCharsetSaveControls(`保存失败：${error?.message || error}`);
  }
}

function charsetBaseDraft(record) {
  return {
    encoded_hex: record.encoded_hex,
    unicode: record.unicode || "",
    status: ["confirmed", "manual-candidate", "rejected"].includes(record.status)
      ? record.status : "auto",
    notes: record.notes || "",
    glyph_sha256: record.glyph_sha256,
  };
}

function charsetDraft(record) {
  return charsetBaseDraft(record);
}

function charsetFilteredRecords(document) {
  const query = state.charsetSearch.trim().toLowerCase();
  return (document.records || []).filter(record => {
    const draft = charsetDraft(record);
    const effectiveStatus = draft.status === "auto" ? record.status : draft.status;
    if (state.charsetStatus === "used" && !record.usage_count) return false;
    if (state.charsetStatus === "review"
        && !["candidate", "conflict", "manual-candidate"].includes(effectiveStatus)) return false;
    if (!["all", "used", "review"].includes(state.charsetStatus)
        && effectiveStatus !== state.charsetStatus) return false;
    if (!query) return true;
    return [
      record.encoded_hex,
      record.id,
      textCharacterResourceUid(record),
      draft.unicode,
      effectiveStatus,
      charsetStatusLabels[effectiveStatus],
      (record.candidates || []).map(candidate => candidate.unicode).join(" "),
      draft.notes,
      (record.usage_samples || []).join(" "),
      record.prg_offset_hex,
      record.file_offset_hex,
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
  });
}

function charsetRow(record) {
  const draft = charsetDraft(record);
  const effectiveStatus = draft.status === "auto" ? record.status : draft.status;
  const candidates = (record.candidates || []).map(candidate =>
    `${candidate.unicode} ×${candidate.evidence_count}`
  );
  const originalDirty = Boolean(charsetOriginalDirty.get(record.encoded_hex));
  const resetDirty = originalDirty;
  return `<tr class="charset-row charset-${esc(effectiveStatus)} ${resetDirty ? "dirty" : ""}" data-charset-code="${esc(record.encoded_hex)}" data-resource-uid="${esc(textCharacterResourceUid(record))}">
    <td><button type="button" data-edit-glyph="${esc(record.encoded_hex)}" title="编辑字形位图"><canvas class="charset-glyph" data-charset-glyph="${record.id}" width="12" height="12" aria-label="字形 ${esc(record.encoded_hex)}"></canvas></button></td>
    <td class="mono">${handleMarkup(textCharacterResourceUid(record))}<button type="button" class="resource-inline-link"
      data-charset-physical-select="${esc(record.encoded_hex)}">${esc(record.encoded_hex)}</button>
      <small>#${record.id} · 图集 ${record.atlas_column},${record.atlas_row}</small></td>
    <td><input class="charset-unicode-input" data-charset-field="unicode" value="${esc(draft.unicode)}" maxlength="2" spellcheck="false" aria-label="${esc(record.encoded_hex)} Unicode 字符"></td>
    <td><select data-charset-field="status" aria-label="${esc(record.encoded_hex)} 映射状态">
      <option value="auto" ${draft.status === "auto" ? "selected" : ""}>自动推断 · ${esc(charsetStatusLabels[record.status] || record.status)}</option>
      <option value="confirmed" ${draft.status === "confirmed" ? "selected" : ""}>人工确认</option>
      <option value="manual-candidate" ${draft.status === "manual-candidate" ? "selected" : ""}>人工候选</option>
      <option value="rejected" ${draft.status === "rejected" ? "selected" : ""}>否决并清空</option>
    </select></td>
    <td>${candidates.length ? `<div class="charset-candidates">${candidates.map(value => `<span>${esc(value)}</span>`).join("")}</div>` : ""}</td>
    <td><b>${Number(record.usage_count || 0).toLocaleString()}</b><small>${(record.usage_samples || []).slice(0, 3).map(esc).join(" · ")}</small></td>
    <td><input data-charset-field="notes" value="${esc(draft.notes)}" placeholder="辨形依据、简繁说明…" spellcheck="false"></td>
    <td><div class="table-cell-actions">
      ${resetToOriginalButton(record.encoded_hex, {
        title: "只恢复这个字符映射到导入值；其他字符编辑保留",
        dirty: resetDirty,
      })}
    </div></td>
  </tr>`;
}

async function paintCharsetGlyphs() {
  const {model, glyphs, glyphFields} = await uiJsRenderSources(null, {fullAtlas: true});
  const fieldsByHandle = new Map(glyphFields.map(field => [field.entityHandle, field]));
  for (const canvas of document.querySelectorAll("[data-ui-font-atlas]")) {
    uiPaintFontAtlas(canvas, model, glyphs);
    for (const field of glyphFields) {
      bindGlyphField(canvas, field, {model, glyphId: uiGlyphId(model, field.lead, field.selector)});
    }
  }
  for (const button of document.querySelectorAll("[data-edit-glyph]")) {
    const handle = `font-glyph:${button.dataset.editGlyph.replaceAll(" ", ":")}`;
    const field = fieldsByHandle.get(handle);
    if (!field) throw new TypeError(`未发布的正文字形 ${handle}`);
    bindGlyphField(button.querySelector("canvas"), field);
    button.onclick = () => openGlyphEditor(handle).catch(error => {editorLog.error("文字", `操作失败：${error?.message || error}`, error); return updateCharsetSaveControls(error.message);});
  }
}

function charsetSaveStatus(message = state.charsetMessage) {
  return message || "";
}

function charsetBulkText(mappingDocument) {
  return (mappingDocument.records || []).map(record =>
    charsetDraft(record).unicode || "□"
  ).join("");
}

function charsetBulkDisplayText(value) {
  const characters = Array.from(value);
  const rows = [];
  for (let offset = 0; offset < characters.length; offset += 64) {
    rows.push(characters.slice(offset, offset + 64).join(""));
  }
  return rows.join("\n");
}

function charsetBulkCharacters(value) {
  return Array.from(String(value || "").replace(/[\r\n]/g, ""));
}

function updateCharsetSaveControls(message = "") {
  if (message) state.charsetMessage = message;
  const status = $("#charset-save-state");
  if (status) {
    status.textContent = charsetSaveStatus();
    status.hidden = !state.charsetMessage;
  }
  const reset = $('[data-reset-to-original="charset-map"]');
  if (reset) {
    reset.disabled = reset.dataset.originalDirty !== "true" || reset.dataset.resetPending === "true";
  }
}

let charsetPhysicalSelection = "";

function charsetPhysicalDetailMarkup(record) {
  if (!record) return "";
  return `<section class="panel charset-physical-detail"><header><h3>字形 ${esc(record.encoded_hex)}</h3>
    <span>${esc(record.unicode || "未映射")}</span></header>${physicalLocationMarkup({
      uid: textCharacterResourceUid(record),
    })}</section>`;
}

async function renderCharsetWorkbench(document) {
  const target = $("#charset-workbench");
  if (!target) return;
  clearTimeout(charsetSearchTimer);
  charsetSearchTimer = null;
  const renderGeneration = ++charsetWorkbenchRenderGeneration;
  const records = charsetFilteredRecords(document);
  const pageCount = Math.max(1, Math.ceil(records.length / CHARSET_PAGE_SIZE));
  state.charsetPage = Math.min(state.charsetPage, pageCount - 1);
  const first = state.charsetPage * CHARSET_PAGE_SIZE;
  const pageRecords = records.slice(first, first + CHARSET_PAGE_SIZE);
  const selectedPhysical = pageRecords.find(record => record.encoded_hex === charsetPhysicalSelection)
    || pageRecords[0] || null;
  charsetPhysicalSelection = selectedPhysical?.encoded_hex || "";
  const statusCounts = document.summary?.status_counts || {};
  const editorTabs = `<nav class="charset-editor-tabs">
    <button type="button" data-charset-editor="bulk" class="${state.charsetEditorMode === "bulk" ? "active" : ""}">批量映射</button>
    <button type="button" data-charset-editor="rows" class="${state.charsetEditorMode === "rows" ? "active" : ""}">逐字校对</button>
    ${resetToOriginalButton(CHARSET_RESET_ALL_KEY, {title: "重置全部字符映射；字形像素编辑保留"})}
  </nav>`;
  const saveBar = `<p class="charset-savebar" id="charset-save-state"
    ${state.charsetMessage ? "" : "hidden"}>${esc(charsetSaveStatus())}</p>`;
  if (state.charsetEditorMode === "bulk") {
    const bulkText = charsetBulkText(document);
    target.innerHTML = `${editorTabs}<section class="charset-bulk-editor">
      <header><div><b>批量映射</b><span>按字形 ID 升序排列 · 每 64 个字符对应字形图集的一行 · □ 表示暂不处理</span></div><div><b>${Array.from(bulkText).length}</b><span>/ ${document.records.length} 槽位</span></div></header>
      <textarea id="charset-bulk-text" rows="28" cols="64" wrap="off" spellcheck="false" aria-label="完整字符映射文本">${esc(charsetBulkDisplayText(bulkText))}</textarea>
      <footer><label>新映射状态<select id="charset-bulk-status"><option value="manual-candidate" selected>人工候选（推荐）</option><option value="confirmed">人工确认</option></select></label><span id="charset-bulk-count">${Array.from(bulkText).length} / ${document.records.length} 字符</span><button type="button" class="button primary" id="charset-bulk-apply">应用批量映射</button></footer>
    </section>${saveBar}`;
    await bindCharsetWorkbench(document, renderGeneration);
    return;
  }
  target.innerHTML = `${editorTabs}<section class="charset-toolbar">
    <div><b>字符映射</b></div>
    <label>状态<select id="charset-status-filter">
      ${[
        ["all", "全部字形"], ["review", "候选与冲突"], ["used", "已引用"],
        ["confirmed", "人工确认"], ["candidate", "自动候选"],
        ["conflict", "候选冲突"], ["unidentified", "待识别"],
        ["manual-candidate", "人工候选"], ["rejected", "已否决"],
      ].map(([value, label]) => `<option value="${value}" ${state.charsetStatus === value ? "selected" : ""}>${label}</option>`).join("")}
    </select></label>
    <label class="charset-search">搜索<input id="charset-search" value="${esc(state.charsetSearch)}" placeholder="24 00 / 眼 / record:05…" spellcheck="false"></label>
    <div class="charset-counts"><b>${records.length.toLocaleString()}</b><span>匹配</span><small>${Number(statusCounts.confirmed || 0)} 确认 · ${Number(statusCounts.conflict || 0)} 冲突</small></div>
  </section>${saveBar}
  <div class="table-wrap charset-table"><table><thead><tr><th>ROM 字形</th><th>编码</th><th>字符</th><th>确认状态</th><th>反推候选</th><th>引用</th><th>校正备注</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead><tbody>
    ${pageRecords.map(charsetRow).join("")}
  </tbody></table></div>
  <nav class="charset-pagination"><button type="button" class="button ghost" id="charset-prev" ${state.charsetPage ? "" : "disabled"}>← 上一页</button><span>${records.length ? `${first + 1}-${Math.min(first + CHARSET_PAGE_SIZE, records.length)}` : "0"} / ${records.length} · 第 ${state.charsetPage + 1}/${pageCount} 页</span><button type="button" class="button ghost" id="charset-next" ${state.charsetPage + 1 < pageCount ? "" : "disabled"}>下一页 →</button></nav>
  <div id="charset-record-detail">${charsetPhysicalDetailMarkup(selectedPhysical)}</div>`;
  await bindCharsetWorkbench(document, renderGeneration);
  await paintCharsetGlyphs();
}

async function bindCharsetWorkbench(
  mappingDocument,
  renderGeneration = charsetWorkbenchRenderGeneration,
  workbench = $("#charset-workbench"),
) {
  if (!workbench) return;
  const find = selector => workbench.querySelector(selector);
  const findAll = selector => workbench.querySelectorAll(selector);
  const byCode = new Map((mappingDocument.records || []).map(record => [record.encoded_hex, record]));
  findAll("[data-charset-physical-select]").forEach(button =>
    button.addEventListener("click", () => {
      charsetPhysicalSelection = button.dataset.charsetPhysicalSelect;
      const detail = find("#charset-record-detail");
      if (detail) detail.innerHTML = charsetPhysicalDetailMarkup(byCode.get(charsetPhysicalSelection));
    })
  );
  const fields = await db.getFields(CHARACTER_MAP_RESOURCE_ID);
  const fieldsByCode = new Map();
  for (const field of fields) {
    if (!fieldsByCode.has(field.encodedHex)) fieldsByCode.set(field.encodedHex, []);
    fieldsByCode.get(field.encodedHex).push(field);
  }
  const controlValue = (field, value) => field.fieldName === "status"
    && !["confirmed", "manual-candidate", "rejected"].includes(value) ? "auto" : value;
  for (const row of findAll("[data-charset-code]")) {
    const members = fieldsByCode.get(row.dataset.charsetCode);
    if (!members) throw new TypeError(`未发布的字符映射 ${row.dataset.charsetCode}`);
    for (const field of members) {
      const input = row.querySelector(`[data-charset-field="${field.fieldName}"]`);
      if (!input) continue;
      let previous = controlValue(field, field.value);
      field.bind(input, (target, value) => {
        const current = controlValue(field, value);
        if (target.value === previous || target.value === current) target.value = current;
        previous = current;
        if (field.fieldName === "status") {
          const status = byCode.get(row.dataset.charsetCode).status;
          for (const name of Object.keys(charsetStatusLabels)) row.classList.toggle(`charset-${name}`, name === status);
          target.querySelector('[value="auto"]').textContent = `自动推断 · ${charsetStatusLabels[status] || status}`;
        }
        const dirty = members.some(member => member.hasOverride || row.querySelector(
          `[data-charset-field="${member.fieldName}"]`)?.value !== controlValue(member, member.value));
        row.classList.toggle("dirty", dirty);
        applyResetToOriginalStates(row, new Map([[row.dataset.charsetCode, dirty]]));
      });
    }
  }
  const counts = find(".charset-counts small");
  if (counts) {
    let version;
    for (const field of fields.filter(field => field.fieldName === "status")) field.bind(counts, target => {
      if (version === field.version) return;
      version = field.version;
      const summary = mappingDocument.summary?.status_counts || {};
      target.textContent = `${Number(summary.confirmed || 0)} 确认 · ${Number(summary.conflict || 0)} 冲突`;
    });
  }
  findAll("[data-charset-editor]").forEach(button =>
    button.addEventListener("click", () => {
      state.charsetEditorMode = button.dataset.charsetEditor;
      replaceHistoryUrl(currentViewUrl());
      renderCharsetWorkbench(mappingDocument);
    })
  );
  const bulkText = find("#charset-bulk-text");
  if (bulkText) {
    const currentBulk = () => charsetBulkDisplayText(mappingDocument.records.map(record => record.unicode || "□").join(""));
    let previous = currentBulk();
    let version = fields[0]?.version, current = previous;
    for (const field of fields.filter(field => field.fieldName !== "notes")) field.bind(bulkText, target => {
      if (version !== field.version) {
        version = field.version;
        current = currentBulk();
      }
      if (target.value === previous || target.value === current) target.value = current;
      previous = current;
    });
  }
  const updateBulkCount = () => {
    if (!bulkText) return;
    const count = charsetBulkCharacters(bulkText.value).length;
    const target = find("#charset-bulk-count");
    if (target) {
      target.textContent = `${count} / ${mappingDocument.records.length} 字符`;
      target.classList.toggle("invalid", count !== mappingDocument.records.length);
    }
  };
  bulkText?.addEventListener("input", updateBulkCount);
  find("#charset-bulk-apply")?.addEventListener("click", () => {
    const characters = charsetBulkCharacters(bulkText?.value);
    if (characters.length !== mappingDocument.records.length) {
      state.charsetMessage = `无法切分：当前 ${characters.length} 个字符，应为 ${mappingDocument.records.length} 个；换行不计入。`;
      updateCharsetSaveControls();
      updateBulkCount();
      return;
    }
    const status = find("#charset-bulk-status")?.value || "manual-candidate";
    let applied = 0;
    const changes = [];
    mappingDocument.records.forEach((record, index) => {
      const character = characters[index];
      if (character === "□") return;
      const draft = {...charsetDraft(record)};
      if (draft.unicode === character) return;
      draft.unicode = character;
      draft.status = status;
      changes.push(draft);
      applied += 1;
    });
    state.charsetMessage = applied ? "" : "文本内容没有发生变化。";
    if (changes.length) commitCharsetChanges(mappingDocument, changes);
    renderCharsetWorkbench(mappingDocument);
  });
  find("#charset-status-filter")?.addEventListener("change", event => {
    state.charsetStatus = event.target.value;
    state.charsetPage = 0;
    replaceHistoryUrl(currentViewUrl());
    renderCharsetWorkbench(mappingDocument);
  });
  find("#charset-search")?.addEventListener("input", event => {
    state.charsetSearch = event.target.value;
    state.charsetPage = 0;
    clearTimeout(charsetSearchTimer);
    charsetSearchTimer = setTimeout(() => {
      if (renderGeneration !== charsetWorkbenchRenderGeneration) return;
      replaceHistoryUrl(currentViewUrl());
      renderCharsetWorkbench(mappingDocument);
    }, 100);
  });
  findAll("[data-charset-field]").forEach(input => {
    bindTextInputEvents(input, {onInput: event => {
      const row = event.target.closest("[data-charset-code]");
      const record = byCode.get(row?.dataset.charsetCode);
      if (!record) return;
      const draft = {...charsetDraft(record)};
      draft[event.target.dataset.charsetField] = event.target.value;
      if (event.target.dataset.charsetField === "unicode"
          && ["auto", "rejected"].includes(draft.status)) {
        draft.status = "manual-candidate";
        row.querySelector('[data-charset-field="status"]').value = draft.status;
      }
      if (event.target.dataset.charsetField === "status" && draft.status === "rejected") {
        draft.unicode = "";
        row.querySelector('[data-charset-field="unicode"]').value = "";
      }
      if (["confirmed", "manual-candidate"].includes(draft.status)
          && Array.from(draft.unicode).length !== 1) {
        event.target.value = charsetDraft(record)[event.target.dataset.charsetField];
        updateCharsetSaveControls("输入无效：人工映射须为一个 Unicode 字符");
        return;
      }
      row.classList.toggle(
        "dirty",
        charsetResetIsDirty(record.encoded_hex),
      );
      applyResetToOriginalStates(row, new Map([[
        record.encoded_hex,
        charsetResetIsDirty(record.encoded_hex),
      ]]));
      state.charsetMessage = "";
      updateCharsetSaveControls();
      commitCharsetChanges(mappingDocument, [draft]);
    }});
    if (input.tagName === "SELECT") {
      input.addEventListener("change", event => event.target.dispatchEvent(new Event("input")));
    }
  });
  findAll('.charset-unicode-input').forEach((input, index, inputs) => {
    input.addEventListener("focus", event => event.target.select());
    input.addEventListener("keydown", async event => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const targetIndex = index + direction;
      if (targetIndex >= 0 && targetIndex < inputs.length) {
        inputs[targetIndex].focus();
        return;
      }
      const filteredCount = charsetFilteredRecords(mappingDocument).length;
      const pageCount = Math.max(1, Math.ceil(filteredCount / CHARSET_PAGE_SIZE));
      const nextPage = state.charsetPage + direction;
      if (nextPage < 0 || nextPage >= pageCount) return;
      state.charsetPage = nextPage;
      replaceHistoryUrl(currentViewUrl());
      await renderCharsetWorkbench(mappingDocument);
      const nextInputs = [...workbench.querySelectorAll('.charset-unicode-input')];
      const nextInput = direction > 0 ? nextInputs[0] : nextInputs.at(-1);
      nextInput?.focus();
    });
  });
  const resetFields = new Map(fieldsByCode);
  resetFields.set(CHARSET_RESET_ALL_KEY, fields);
  bindFieldResetToOriginalButtons(workbench, resetFields, {
    database: db,
    confirmMessage: key => key === CHARSET_RESET_ALL_KEY ? null :
      `恢复 ${key} 的 Original / 导入值？其他字符映射编辑会保留。`,
    beforeReset: async selection => {
      await flushAllAutoSaves();
      const context = beginCharsetMutation();
      context.codes = new Set(selection.map(field => field.encodedHex));
      if (!currentCharsetMutation(context)) throw new Error("字符映射会话已改变");
      context.expectedVersion = selection[0].version;
      return context;
    },
    afterReset: async (_selection, context) => {
      if (!currentCharsetMutation(context)) return;
      const resolved = await db.readResource(CHARACTER_MAP_RESOURCE_ID);
      if (!await refreshCharacterMapMutation(resolved.value, context)) return;
      state.charsetMessage = context.codes.size === mappingDocument.records.length
        ? "已重置字符映射，重新使用导入值。"
        : `${[...context.codes].join("、")} 已重置；其他字符映射编辑保留。`;
      finishCharsetMutation(context);
      refreshVisibleCharsetStates();
    },
    onError: error => {
      if (workbench.isConnected) updateCharsetSaveControls(`重置失败：${error.message}`);
    },
  });
  workbench.dataset.charsetFieldsReady = "true";
  find("#charset-prev")?.addEventListener("click", () => {
    state.charsetPage = Math.max(0, state.charsetPage - 1);
    replaceHistoryUrl(currentViewUrl());
    renderCharsetWorkbench(mappingDocument);
  });
  find("#charset-next")?.addEventListener("click", () => {
    state.charsetPage += 1;
    replaceHistoryUrl(currentViewUrl());
    renderCharsetWorkbench(mappingDocument);
  });
}

async function loadCharsetWorkbench() {
  const target = $("#charset-workbench");
  if (!target) return;
  const generation = ++charsetWorkbenchLoadGeneration;
  let invalidOwner = CHARACTER_MAP_RESOURCE_ID;
  try {
    await db.getFields(invalidOwner);
    invalidOwner = "char";
    await db.getFields(invalidOwner);
    invalidOwner = null;
    const document_ = await charsetDocument();
    const snapshot = await loadCharsetOriginalStates(document_);
    if (!snapshot || generation !== charsetWorkbenchLoadGeneration
        || target !== $("#charset-workbench")) return;
    await renderCharsetWorkbench(document_);
  } catch (error) {
    editorLog.error("文字", `操作失败：${error?.message || error}`, error);
    if (generation === charsetWorkbenchLoadGeneration
        && target === $("#charset-workbench")) {
      target.innerHTML = `<div class="empty"><b>读取字库失败</b><span>${esc(error.message)}</span>
        }</div>`;
    }
  }
}

var charset = /*#__PURE__*/Object.freeze({
  __proto__: null,
  loadCharsetWorkbench: loadCharsetWorkbench
});

export { catalog, charset, invalidateTextCatalogDocument, loadCurrentTextRecordDisplays, loadNpcCurrentTexts, textCatalogDocument, textCatalogRecordSource, textClassLabels };
