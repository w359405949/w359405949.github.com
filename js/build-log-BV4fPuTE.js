import { bindWorkingExchange, workingExchangeButtons } from './working-exchange-BZ5p8iMf.js';
import { bindFieldResetToOriginalButtons, resetToOriginalButton } from './battle-result-script-runtime-BSeJpUGH.js';
import { openActiveProjectStore, db, bootstrapActiveProjectFromPackage, BOOTSTRAP_DIGEST_KEY } from './prg-loaders-DnCSmXk9.js';
import { bindStoryPageRecovery, esc, storyPageRecoveryButton } from './interface-state-preview-Dlotqlmn.js';
import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { buildBrowserRom, runLatestBrowserRomButton, reportBuildState } from './asset-compiler-B1MJV5At.js';
import { buildTimeStamp, buildTimeLabel } from './emulator-vuonD__1.js';
import { prepareSaveBuildFieldObjects, saveAnnotations } from './physical-field-object-windows-DnQmS3eb.js';
import { saveWorkspaceReady, allCurrentFieldObjects } from './sram-WFVGNGUM.js';
import { state } from './emulator-Bpa8EsFw.js';
import './baseline-assembly-DW8BWbDB.js';
import './page-modules-8OIfo4cI.js';
import './editor-renderer-n2nBwXk_.js';
import './page-runtime-paths-BvtuMnH7.js';
import './configuration-table-FR1xSC8W.js';
import './field-object-editor-Blro4OF0.js';
import './attack-chr-tile-selector-Bv5xCQyz.js';
import './timeline-player-YCH7Y-3h.js';
import './record-6_wsSDi2.js';
import './field-address-table-BnL1Mgdy.js';
import './components-DbJXuRMn.js';
import './text-record-structure-editor-BB8pdofu.js';
import './element-tree-C1bWRgTl.js';
import './chr-Davc17Y-.js';

// @editor-module 展示项目与构建报告并将准备、构建和项目操作上报统一日志。

const shortHash = value => typeof value === "string" && value.length > 16
  ? `${value.slice(0, 12)}…${value.slice(-4)}` : (value || "—");
const integer = value => Number.isSafeInteger(value) ? value.toLocaleString() : "—";
const hex = value => Number.isSafeInteger(value)
  ? `0x${value.toString(16).toUpperCase().padStart(6, "0")}` : "—";
let verifyBuild = true;

function isSaveCurrentWorking(working) {
  return working?.resource_id === "save-current"
    && working.asset_schema === "metalmaxcn.save-current"
    && working.codec === "save-current"
    && working.original_source === "runtime";
}

function targetDefinition() {
  const manifest = state.browserProjectManifest;
  return manifest?.targets?.[manifest.default_target] || null;
}

function byteMapHref(diff) {
  if (diff.region === "prg") {
    const region = targetDefinition()?.profile?.regions?.find(item => item.kind === "prg");
    if (!region) return null;
    return `?view=bytemap-prg&romOffset=${diff.file_offset - region.file_offset}`;
  }
  if (diff.region === "chr") {
    const region = targetDefinition()?.profile?.regions?.find(item => item.kind === "chr");
    if (!region) return null;
    const tile = Math.floor((diff.file_offset - region.file_offset) / 16);
    return `?view=bytemap-chr&chrTile=${tile}`;
  }
  return null;
}

function readinessMarkup() {
  const manifest = state.browserProjectManifest;
  const definition = targetDefinition();
  const status = state.projectBootstrapStatus;
  const ready = [
    "ready", "already-imported", "bootstrapped", "reimported",
  ]
    .includes(status);
  const targetId = manifest?.default_target || "—";
  const missing = [];
  if (!manifest) missing.push("项目清单");
  if (manifest && !manifest.baseline_blob_id) missing.push("ROM 基线");
  if (manifest && !manifest.default_target) missing.push("默认构建目标");
  if (manifest?.default_target && !definition?.profile) missing.push("构建目标配置");
  if (manifest?.default_target && !definition?.build_map) missing.push("写入映射");
  if (manifest?.default_target && !definition?.bindings) missing.push("资产绑定");
  // A navigation-ready project intentionally has only the immutable asset
  // catalog materialized. Baseline/targets are completed only by an explicit
  // build, never by opening, exporting, or navigating the project.
  const deferred = status === "ready" && missing.length
    ? `构建时将按需准备 ${missing.join("、")}` : "";
  const error = state.projectBootstrapError || (missing.length && !deferred
    ? `缺少 ${missing.join("、")}` : "");
  return `<section class="build-readiness ${error ? "has-error" : "is-ready"}">
    <div>
      <small>项目状态</small>
      <b>${esc(ready && !error ? "已就绪" : status === "loading" ? "正在准备" : "不可用")}</b>
      <span>${error ? esc(error) : deferred ? esc(deferred) : ""}</span>
    </div>
    <div><small>当前原始版本</small><b class="mono">${esc(
      manifest?.active_original_revision_id || "—",
    )}</b></div>
    <div><small>构建目标</small><b class="mono">${esc(targetId)}</b></div>
    <div><small>ROM 基线</small><b class="mono">${esc(
      manifest?.baseline_blob_id || "—",
    )}</b></div>
  </section>`;
}

async function materializeCompleteStaticProject(verify) {
  let lastEventAt = performance.now();
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  state.browserBuildError = "";
  state.browserBuildEvents = [];
  state.browserBuildCurrentEvent = null;
  const append = event => {
    const now = performance.now();
    const timedEvent = {...event, duration_ms: now - lastEventAt};
    lastEventAt = now;
    state.browserBuildCurrentEvent = timedEvent;
    state.browserBuildEvents.push(timedEvent);
    reportBuildState({event: timedEvent});
    refreshBuildLog();
  };
  append({
    stage: "hydrate",
    event_type: "build-input-hydration-started",
    status: "running",
    progress_current: 1,
    progress_total: 2,
    message: "读取并校验构建专用 baseline、target、binding 与 original",
  });
  try {
    const result = await bootstrapActiveProjectFromPackage({verify,
      onProgress: event => {
        if (!Number.isSafeInteger(event.progress_current)) append({stage: "hydrate", ...event});
      }});
    // Keep the lazy facade installed in state: it delegates to the same store
    // and preserves the per-resource boundary if a future package adds an
    // asset after this build.  The full bootstrap only updates local metadata.
    state.browserProjectManifest = result.manifest;
    state.projectBootstrapStatus = result.status;
    append({
      stage: "hydrate",
      event_type: "build-input-hydration-complete",
      status: "success",
      progress_current: 2,
      progress_total: 2,
      message: `${result.original_assets || 0} 个 original · ` +
        `${result.binding_assets || 0} 个 binding binary`,
    });
    return result;
  } catch (error) {
    state.projectBootstrapStatus = "error";
    state.projectBootstrapError = error instanceof Error
      ? error.message : String(error);
    append({
      stage: "hydrate",
      event_type: "build-input-hydration-failed",
      status: "error",
      progress_current: 2,
      progress_total: 2,
      message: state.projectBootstrapError,
      error,
    });
    throw error;
  } finally {
    refreshBuildLog();
  }
}

function projectArchiveToolbar() {
  const unavailable = ["idle", "loading"].includes(state.projectBootstrapStatus);
  const manifest = state.browserProjectManifest;
  const complete = Boolean(
    manifest?.[BOOTSTRAP_DIGEST_KEY]
    && manifest?.baseline_blob_id
    && manifest?.default_target
    && manifest?.targets?.[manifest.default_target],
  );
  const exportUnavailable = unavailable || !complete;
  return `<div class="toolbar build-project-toolbar">
    <button class="button" id="browser-project-export" ${exportUnavailable ? "disabled" : ""}
      title="${exportUnavailable ? "先执行构建，生成完整且可独立恢复的项目归档" : "导出完整项目归档"}">
      导出项目备份
    </button>
    <label class="button ${unavailable ? "disabled" : ""}" for="browser-project-import">
      导入项目备份
    </label>
    ${workingExchangeButtons({project: true})}
    <input id="browser-project-import" type="file" accept="application/json,.json"
      ${unavailable ? "disabled" : ""}>

  </div>`;
}

function filteredWorkingAssets() {
  const query = String(state.projectWorkingQuery || "").trim().toLowerCase();
  return state.projectWorkingAssets.filter(working => working.ownership !== "invalid" && (!query || [
    working.resource_id,
    working.asset_schema,
    working.codec,
  ].some(value => String(value || "").toLowerCase().includes(query))));
}

let saveDiffExpanded = false;
let saveDiffLoading = false;
let saveDiffError = "";
let saveDiffCache = null;

function sameBytes(left, right) {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function savePartitionDiffs() {
  if (!saveWorkspaceReady()) return {partitions: [], checksumBytes: 0, editedCount: 0};
  const original = state.saveRomInitialBytes;
  const current = state.saveCurrentBytes;
  const annotations = saveAnnotations(state.saveByteMapDocument);
  const annotationContent = JSON.stringify(annotations);
  if (saveDiffCache && saveDiffCache.annotationContent === annotationContent
      && sameBytes(saveDiffCache.original, original)
      && sameBytes(saveDiffCache.current, current)) return saveDiffCache.result;
  const partitions = [...new Map(annotations.filter(record =>
    /^(save\.partition\.|save-container\.partition\.)/u.test(record.range_id || ""))
    .map(record => [record.range_id, record])).values()]
    .sort((a, b) => a.address.offset - b.address.offset);
  const metadata = annotations.filter(record =>
    String(record.field_id || "").startsWith("save.directory."));
  const scopes = annotations.filter(record => ["save.active-workspace", "save.slot.1.record",
    "save.slot.2.record", "save.partition.runtime-workspace.0"].includes(record.range_id));
  const metadataOffsets = new Set(metadata.flatMap(record =>
    Array.from({length: record.address.length}, (_, index) => record.address.offset + index)));
  const currentFields = allCurrentFieldObjects();
  const editedCount = currentFields.filter(field => field.edited
    && !field.binding?.derived).length;
  const fields = currentFields.filter(field => field.edited
    && field.status === "exact" && field.binding?.editable === true
    && !field.binding?.derived);
  const results = [];
  let checksumBytes = 0;
  for (const partition of partitions) {
    const changed = [];
    for (let offset = partition.address.offset; offset < partition.address.end_exclusive; offset++) {
      if (original[offset] === current[offset]) continue;
      if (metadataOffsets.has(offset)) checksumBytes++;
      else changed.push(offset);
    }
    if (!changed.length) continue;
    const changedSet = new Set(changed);
    const published = fields.filter(field => {
      const start = field.physical.offset;
      const end = field.physical.end_exclusive;
      for (let offset = start; offset < end; offset++) {
        if (changedSet.has(offset)) return true;
      }
      return false;
    });
    const scope = scopes.find(record => record.address.offset <= partition.address.offset
      && record.address.end_exclusive >= partition.address.end_exclusive);
    const scopeLabel = scope?.range_id === "save.active-workspace" ? "活动区"
      : /^save\.slot\.[12]\.record$/u.test(scope?.range_id || "")
      ? `槽 ${scope.range_id.split(".")[2]}`
      : scope?.range_id === "save.partition.runtime-workspace.0" ? "运行工作区"
      : "SRAM 容器";
    results.push({partition, count: changed.length, fields: published, scope: scopeLabel});
  }
  const result = {partitions: results, checksumBytes, editedCount};
  saveDiffCache = {
    annotationContent, original: original.slice(), current: current.slice(), result,
  };
  return result;
}

function savePartitionMarkup() {
  if (!saveDiffExpanded) return `<details class="build-save-diff" data-collapse-key="build-save-diff">
    <summary>查看存档改动分区</summary></details>`;
  if (saveDiffError) return `<details class="build-save-diff" data-collapse-key="build-save-diff" open>
    <summary>存档改动分区</summary><small>${esc(saveDiffError)}</small></details>`;
  if (!saveWorkspaceReady()) return `<details class="build-save-diff" data-collapse-key="build-save-diff" open>
    <summary>存档改动分区</summary><small>${saveDiffLoading ? "正在读取 SRAM 分区…" : "展开后读取存档当前值"}</small>
  </details>`;
  const {partitions, checksumBytes} = savePartitionDiffs();
  const rows = partitions.map(({partition, count, fields, scope}) => {
    const address = partition.address;
    const names = [...new Set(fields.map(field => field.fieldMeaning || field.valueMeaning)
      .filter(Boolean))];
    return `<tr><td>${esc(scope)}</td><td>${esc(names.join("、") || partition.value_meaning || partition.record)}</td>
      <td class="mono">SRAM ${address.offset.toString(16).toUpperCase().padStart(4, "0")}–${(address.end_exclusive - 1).toString(16).toUpperCase().padStart(4, "0")}</td>
      <td>${integer(count)}</td><td>${fields.length ? fields.map(field =>
        `${esc(field.fieldMeaning || field.valueMeaning || field.fieldId)} <small class="mono">${esc(field.fieldId)}</small>`)
        .join("<br>") : "—"}</td></tr>`;
  }).join("");
  const checksum = checksumBytes ? `<p>校验：${integer(checksumBytes)} 字节（校验和／槽目录）</p>` : "";
  return `<details class="build-save-diff" data-collapse-key="build-save-diff" ${saveDiffExpanded ? "open" : ""}>
    <summary>${integer(partitions.length)} 个改动分区${checksumBytes ? ` · 校验 ${integer(checksumBytes)} 字节` : ""}</summary>
    ${partitions.length ? `<div class="table-wrap"><table><thead><tr><th>所属</th><th>所属字段中文名</th><th>SRAM 范围</th><th>改动字节</th><th>改动的已发布字段</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
    ${checksum}</details>`;
}

function workingAssetsMarkup() {
  const invalidIds = state.projectWorkingAssets.filter(working => working.ownership === "invalid")
    .map(working => working.resource_id);
  const filtered = filteredWorkingAssets();
  const limit = Math.max(100, Number(state.projectWorkingLimit) || 100);
  const visible = filtered.slice(0, limit);
  const rows = visible.map(working => {
    const saveCurrent = isSaveCurrentWorking(working);
    const changedFields = working.format === "fields" && !working.error
      ? working.fields.filter(field => field.hasOverride) : [];
    const saveChangeCount = saveCurrent && saveDiffExpanded && saveWorkspaceReady()
      ? savePartitionDiffs().editedCount : null;
    const reset = working.format === "fields" ? resetToOriginalButton(working.resource_id, {
      title: "重置整个资产；其他资产保留",
      dirty: working.dirty,
    }) : "";
    return `<tr data-working-resource="${esc(working.resource_id)}">
    <td><b>${esc(working.resource_id)}</b><small>${esc(working.asset_schema)}</small>
      ${saveChangeCount === null ? "" : `<small data-working-change-count>${integer(saveChangeCount)} 项字段改动</small>`}
      ${saveCurrent ? savePartitionMarkup() : ""}
      ${changedFields.length ? `<small data-working-fields>${changedFields.map(field => {
        const source = field.physical?.source;
        const start = source?.file_offset;
        const delta = field.physical?.offsetInFragment;
        const length = field.physical?.byteLength;
        const offset = start + delta;
        const physical = source?.region && Number.isSafeInteger(start) && Number.isSafeInteger(delta)
          && Number.isSafeInteger(offset) && offset >= 0
          && Number.isSafeInteger(length) && length > 0
          ? ` <span class="mono">${esc(source.region)} file ${hex(offset)} · ${integer(length)} B</span>` : "";
        return `${esc(`${field.entityHandle}.${field.fieldName}`)}${physical}`;
      }).join("<br>")}</small>` : ""}</td>
    <td><span data-working-status class="build-status status-${working.dirty ? "written" : "mapped"}">
      ${working.error ? esc(working.error) : working.dirty ? "已修改" : "未修改"}
    </span></td>
    <td data-working-version>${integer(working.version)}</td>
    <td class="mono">${esc(working.codec || "—")}</td>
    <td>${working.format === "story-page" ? storyPageRecoveryButton(working.storyPage) : working.error ? "" : reset}</td>
  </tr>`;
  }).join("") || `<tr><td colspan="5" class="build-empty-row">没有符合条件的编辑版本资产</td></tr>`;
  return `<section class="panel build-working-panel">
    <header><div><p class="eyebrow">编辑版本</p><h2>编辑版本资产</h2></div>
      <span>${integer(state.projectWorkingAssets.length - invalidIds.length)} 项已载入</span></header>
    ${invalidIds.length ? `<div class="build-working-invalid" role="status">
      有 ${integer(invalidIds.length)} 项失效修改需要清理。
      <button class="button ghost" id="project-working-clear-invalid">清理失效修改</button>
    </div>` : ""}
    <div class="build-working-tools">
      <label>筛选资产 <input id="project-working-query" type="search"
        value="${esc(state.projectWorkingQuery || "")}" placeholder="资源 ID / 数据结构 / 编解码器 / 导入版本"></label>
      <button class="button ghost" id="project-state-refresh">刷新项目状态</button>
      <span>显示 ${integer(visible.length)} / ${integer(filtered.length)}</span>
      <button class="button ghost" id="project-working-more"
        ${visible.length < filtered.length ? "" : "disabled"}>再显示 100</button>
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>资源 / 数据结构</th><th>状态</th><th>版本</th><th>编解码器</th><th>重置</th>
    </tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

async function loadProjectAssetState({refresh = true} = {}) {
  if (state.projectStateLoading) return;
  state.projectStateLoading = true;
  const task = editorLog.startTask({source: "后台准备", message: "读取项目修改状态"});
  state.projectStateError = "";
  if (refresh) refreshBuildLog();
  try {
    state.projectRepository ||= await openActiveProjectStore();
    const repository = state.projectRepository;
    const working = await db.listWorkingAssets();
    if (repository !== state.projectRepository) return;
    state.projectWorkingAssets = working;
    state.projectStateLoaded = true;
    state.projectWorkingLoaded = true;
  } catch (error) {
    state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
  } finally {
    state.projectStateLoading = false;
    task.finish({level: "debug", message: "项目修改状态读取结束"});
    if (refresh) refreshBuildLog();
  }
}

async function loadSavePartitionDetails() {
  if (saveDiffLoading || saveWorkspaceReady()) return;
  saveDiffLoading = true;
  saveDiffError = "";
  refreshBuildLog();
  const repository = state.projectRepository;
  try {
    const save = await prepareSaveBuildFieldObjects(repository);
    if (repository !== state.projectRepository) return;
    await save.openCurrent(state);
  } catch (error) {
    saveDiffError = error instanceof Error ? error.message : String(error);
    editorLog.error("后台准备", `存档差异准备失败：${saveDiffError}`, error);
  } finally {
    saveDiffLoading = false;
    refreshBuildLog();
  }
}

function diffRows(report) {
  const diffs = report?.linker?.diffs || [];
  if (!diffs.length) return `<tr><td colspan="9" class="build-empty-row">最终 ROM 与项目基线没有物理差异</td></tr>`;
  return diffs.map(diff => {
    const href = byteMapHref(diff);
    return `<tr>
      <td><b>${esc(diff.region)}</b><small>Bank ${integer(diff.bank_index)}</small></td>
      <td class="mono">${esc(diff.baseline_bin)}</td>
      <td class="mono">${hex(diff.file_offset)}</td>
      <td>${integer(diff.length)}</td>
      <td>${diff.asset_ids.map(esc).join("<br>")}</td>
      <td class="mono">${diff.slot_ids.map(esc).join("<br>")}</td>
      <td class="mono" title="${esc(diff.before_sha256)}">${esc(shortHash(diff.before_sha256))}</td>
      <td class="mono" title="${esc(diff.after_sha256)}">${esc(shortHash(diff.after_sha256))}</td>
      <td>${href ? `<a class="button ghost" href="${href}">字节地图 ↗</a>` : "—"}</td>
    </tr>`;
  }).join("");
}

function renderBuildLog() {
  const firstBuild = !state.browserProjectManifest?.latest_package_build_id;
  if (firstBuild) {
    state.buildRomSelected = true;
    state.buildSaveSelected = true;
  }
  const report = state.browserBuildReport;
  const linker = report?.linker || null;
  const running = state.browserBuildRunning;
  const bootstrapLoading = ["idle", "loading"].includes(state.projectBootstrapStatus);
  const canBuild = (state.buildRomSelected || state.buildSaveSelected) &&
    !running && !bootstrapLoading && !state.projectBootstrapError &&
    state.projectStateLoaded;
  return `<div class="toolbar build-toolbar">
      <div class="build-output">
        <label><input type="checkbox" id="browser-build-rom" ${state.buildRomSelected ? "checked" : ""} ${running || firstBuild ? "disabled" : ""}> ROM</label>
        <button class="button" id="browser-build-download" ${state.browserBuildRom ? "" : "disabled"}>下载 ROM</button>
      </div>
      <div class="build-output">
        <label><input type="checkbox" id="browser-build-sav" ${state.buildSaveSelected ? "checked" : ""} ${running || firstBuild ? "disabled" : ""}> SAV</label>
        <button class="button" id="browser-save-download" ${state.browserBuildSave ? "" : "disabled"}>下载存档</button>
      </div>
      <button class="button primary" id="browser-build-start" ${canBuild ? "" : "disabled"}>
        ${running || bootstrapLoading ? "正在构建…" : "构建"}
      </button>
      <label><input type="checkbox" id="browser-build-verify" ${verifyBuild ? "checked" : ""} ${running ? "disabled" : ""}> 核对/校验</label>
      <button class="button ghost" id="browser-report-download" ${report ? "" : "disabled"}>导出构建报告</button>
      ${runLatestBrowserRomButton()}
    </div>
    ${report?.omitted_scripts?.length ? `<section class="panel build-log-panel" data-build-omitted-scripts>
      <h2>未进 ROM</h2><div class="table-wrap"><table><thead><tr><th>脚本</th><th>原因</th><th>超出字节</th></tr></thead>
      <tbody>${report.omitted_scripts.map(script => `<tr><td>${esc(script.handle)}</td><td>${esc(script.reason)}</td>
        <td>${integer(script.overflow_bytes)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    ${report ? `<section class="build-summary">
      <div><small>构建时间</small><b>${esc(buildTimeLabel(report.created_at))}</b></div>
      <div><small>ROM 布局</small><b>${report.layout ? `Mapper ${integer(report.layout.mapper)} · PRG ${integer(report.layout.prg_bytes / 1024)} KB / CHR ${integer(report.layout.chr_bytes / 1024)} KB · ${report.layout.diagnostic ? "自检" : "游戏"}` : "—"}</b></div>
      <div><small>核对/校验</small><b>${report.verification?.enabled === false ? "关闭" : "打开"}</b></div>
      <div><small>内部构建 ID</small><b class="mono" title="${esc(report.build_id)}">${esc(shortHash(report.build_id))}</b></div>
      <div><small>输出 SHA-256</small><b class="mono" title="${esc(linker.output_sha256)}">${esc(shortHash(linker.output_sha256))}</b></div>
      <div><small>存档 SHA-256</small><b class="mono" title="${esc(report.save_sha256)}">${esc(shortHash(report.save_sha256))}</b></div>
      <div><small>存档大小</small><b>${integer(report.save_bytes)} B</b></div>
      <div><small>存档校验</small><b>${report.save_checksum_valid ? "双槽有效" : "无效"}</b></div>
      <div><small>存档来源</small><b>${["original", "rom-initial"].includes(report.save_source)
        ? "Original" : report.save_source === "not-included" ? "未包含存档" :
          `Working · 改动 ${integer(report.save_working_changed_bytes)} 字节`}</b></div>
      <div><small>改动字节</small><b>${integer(linker.changed_bytes)}</b></div>
      <div><small>差异范围</small><b>${integer(linker.diffs.length)}</b></div>
      <div><small>构建事件</small><b>${integer(linker.events.length)}</b></div>
    </section>` : ""}
    ${readinessMarkup()}
    ${projectArchiveToolbar()}
    ${workingAssetsMarkup()}
    <section class="panel build-log-panel">
      <header><div><p class="eyebrow">最终物理差异</p><h2>最终 ROM 字节差异</h2></div></header>
      <div class="table-wrap"><table class="build-diff-table"><thead><tr>
        <th>区域 / Bank</th><th>文件块</th><th>文件偏移</th><th>长度</th><th>资产</th>
        <th>写入区</th><th>修改前</th><th>修改后</th><th>ROM 字节地图</th>
      </tr></thead><tbody>${diffRows(report)}</tbody></table></div>
    </section>`;
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

let refreshScheduled = false;
function refreshBuildLog() {
  if (state.view !== "build" || refreshScheduled) return;
  refreshScheduled = true;
  requestAnimationFrame(() => {
    refreshScheduled = false;
    const content = document.querySelector("#content");
    if (!content || state.view !== "build") return;
    content.innerHTML = renderBuildLog();
    bindBuildLog();
  });
}

let liveListenerBound = false;
function bindBuildLog() {
  bindWorkingExchange(document, {afterImport: async () => {
    state.projectStateLoaded = false;
    await loadProjectAssetState();
    refreshBuildLog();
  }});
  if (!liveListenerBound) {
    globalThis.addEventListener("mmeditor-browser-build", refreshBuildLog);
    liveListenerBound = true;
  }
  if (!state.projectStateLoaded && !state.projectStateLoading) {
    loadProjectAssetState();
  }
  document.querySelector("#browser-project-export")?.addEventListener(
    "click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const repository = state.projectRepository || await openActiveProjectStore();
        const blob = await repository.exportProject({format: "blob"});
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        downloadBlob(blob, `metalmaxcn-project-${stamp}.json`);
      } catch (error) {
        state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
        refreshBuildLog();
      } finally {
        button.disabled = false;
      }
    },
  );
  document.querySelector("#browser-project-import")?.addEventListener(
    "change", async event => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      const approved = globalThis.confirm(
        "导入会在完整校验归档后替换当前项目。请先导出现有项目备份。继续吗？",
      );
      if (!approved) {
        input.value = "";
        return;
      }
      input.disabled = true;
      try {
        const repository = state.projectRepository || await openActiveProjectStore();
        await repository.importProject(file, {replace: true});
        location.reload();
      } catch (error) {
        state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
        input.disabled = false;
        input.value = "";
        refreshBuildLog();
      }
    },
  );
  document.querySelector("#project-working-query")?.addEventListener(
    "change", event => {
      state.projectWorkingQuery = event.currentTarget.value;
      state.projectWorkingLimit = 100;
      refreshBuildLog();
    },
  );
  document.querySelector("#project-working-more")?.addEventListener("click", () => {
    state.projectWorkingLimit = (Number(state.projectWorkingLimit) || 100) + 100;
    refreshBuildLog();
  });
  document.querySelector("#project-state-refresh")?.addEventListener("click", async () => {
    state.projectStateLoaded = false;
    state.projectWorkingLoaded = false;
    await loadProjectAssetState();
  });
  document.querySelector("#project-working-clear-invalid")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const ids = state.projectWorkingAssets.filter(working => working.ownership === "invalid")
        .map(working => working.resource_id);
      const repository = state.projectRepository || await openActiveProjectStore();
      await repository.discardInvalidWorking(ids);
      await loadProjectAssetState();
    } catch (error) {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector(".build-save-diff")?.addEventListener("toggle", event => {
    const expanded = event.currentTarget.open;
    if (saveDiffExpanded === expanded) return;
    saveDiffExpanded = expanded;
    if (expanded && !saveWorkspaceReady()) void loadSavePartitionDetails();
    else refreshBuildLog();
  });
  const workingPanel = document.querySelector(".build-working-panel");
  bindStoryPageRecovery(workingPanel, {database: db, afterReset: loadProjectAssetState,
    onError: error => {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    }});
  // 构建会切换仓储，清单里缓存的字段会话可能已失效：重新取一次清单再绑，
  // 而不是把回调绑到失效会话上抛错。
  if (state.projectWorkingAssets.some(working => working.stale)) {
    state.projectWorkingLoaded = false;
    void loadProjectAssetState();
    return;
  }
  for (const row of workingPanel?.querySelectorAll("[data-working-resource]") || []) {
    const resourceId = row.dataset.workingResource;
    const working = state.projectWorkingAssets.find(item => item.resource_id === resourceId);
    if (!working || working.error) continue;
    const confirmMessage = () => `${resourceId} 含有编辑。重置会丢弃此资产的编辑，其他资产保留。继续吗？`;
    const onError = error => {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    };
    if (working.format === "fields") {
      for (const field of working.fields) field.bind(row, (_target, _value, _field, reason) => {
        if (reason !== "initial") void loadProjectAssetState();
      });
      bindFieldResetToOriginalButtons(row, new Map([[resourceId, working.fields]]), {
        database: db, confirmMessage, onError,
        afterReset: async () => {await loadProjectAssetState();},
      });
    }
  }
  document.querySelector("#browser-build-start")?.addEventListener("click", async () => {
    const buildRom = state.buildRomSelected;
    const buildSave = state.buildSaveSelected;
    const verify = verifyBuild;
    if (!buildRom && !buildSave) return;
    refreshBuildLog();
    try {
      // Compilation needs the complete baseline, targets, bindings and every
      // compiler input.  This is the deliberate full-materialization gate;
      // merely visiting home or a data page never crosses it.
      const started = performance.now();
      const hydrated = buildRom ? await materializeCompleteStaticProject(verify) : null;
      await buildBrowserRom({preserveEvents: buildRom, buildRom, buildSave, verify,
        verification: hydrated?.verification || "not-required",
        timings: {hydrate: performance.now() - started}});
    } catch (error) {
      editorLog.error("构建", `构建失败：${error.message || error}`, error);
    }
    refreshBuildLog();
  });
  document.querySelector("#browser-build-verify")?.addEventListener("change", event => {
    verifyBuild = event.currentTarget.checked;
  });
  for (const [selector, key] of [["#browser-build-rom", "buildRomSelected"],
    ["#browser-build-sav", "buildSaveSelected"]]) {
    document.querySelector(selector)?.addEventListener("change", event => {
      state[key] = event.currentTarget.checked;
      document.querySelector("#browser-build-start").disabled =
        !state.buildRomSelected && !state.buildSaveSelected;
    });
  }
  document.querySelector("#browser-build-download")?.addEventListener("click", () => {
    if (!state.browserBuildRom || !state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([state.browserBuildRom], {type: "application/x-nes-rom"}),
      `metalmaxcn-${stamp}.nes`,
    );
  });
  document.querySelector("#browser-save-download")?.addEventListener("click", () => {
    if (!state.browserBuildSave || !state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([state.browserBuildSave], {type: "application/octet-stream"}),
      `metalmaxcn-${stamp}.sav`,
    );
  });
  document.querySelector("#browser-report-download")?.addEventListener("click", () => {
    if (!state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([JSON.stringify(state.browserBuildReport, null, 2)], {type: "application/json"}),
      `metalmaxcn-${stamp}-report.json`,
    );
  });
}

export { bindBuildLog, renderBuildLog };
