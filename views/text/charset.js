// @editor-module 字符集工作台
import {editorLog} from "../../core/editor-log.js";
import {render} from "../../main.js";
import {openGlyphEditor} from "./glyph-editor.js";
import {textCharacterResourceUid} from "../../core/resource-index.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {handleMarkup} from "../../ui/handle.js";
import {$, bindTextInputEvents, esc} from "../../core/dom.js";
import {flushAllAutoSaves, trackAutoSavePreparation} from "../../core/auto-save.js";
import {applyCurrentTextReferencesToProject, CHARACTER_MAP_RESOURCE_ID, characterMapFieldStates, characterMapCandidateSourcesAvailable, recomputeCharacterMapCandidates, refreshTextCatalogFromCharacterMap, requireCharacterMapAsset, saveCharacterMapChanges} from "../../core/character-map-project.js";
import {
  requireBrowserProjectRepository,
} from "../../core/project-data.js";
import {db} from "../../core/project-db.js";
import {currentViewUrl, replaceHistoryUrl} from "../../core/router.js";
import {state} from "../../core/state.js";
import {
  applyTextCatalogToStoryProject,
  TEXT_RECORDS_RESOURCE_ID,
} from "../../core/text-record-project.js";
import {
  applyResetToOriginalStates,
  bindFieldResetToOriginalButtons,
  resetToOriginalButton,
} from "../../ui/table.js";
import {uiPaintFontAtlas, bindGlyphField, uiGlyphId} from "../../ui/glyphs.js";
import {CHARSET_PAGE_SIZE, textCatalogDocument} from "../../views/text/catalog.js";
import {charsetMapCache, textCatalogCache, uiJsRenderSources} from "../../modules/visual/ui-construction-preview.js";











//
// 来源：拆分前 engine/editor/app.js 第 8011-8404 行。









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
    <td>${candidates.length ? `<div class="charset-candidates">${candidates.map(value => `<span>${esc(value)}</span>`).join("")}</div>` : `<span class="resource-empty">无已知名称证据</span>`}</td>
    <td><b>${Number(record.usage_count || 0).toLocaleString()}</b><small>${(record.usage_samples || []).slice(0, 3).map(esc).join(" · ") || "尚未在已解析文本中引用"}</small></td>
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

export async function loadCharsetWorkbench() {
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
