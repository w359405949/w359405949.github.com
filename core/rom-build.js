// @editor-module 从浏览器项目编排 ROM 编译、链接、构建报告和运行入口。
// Pure-browser ROM build orchestration.
//
// Static package reads are allowed only while bootstrapping the IndexedDB
// project.  A normal build resolves the active project repository, compiles
// through the selected target's explicit bindings, and invokes the one ROM
// buffer writer (rom-linker.js).  There is intentionally no HTTP build API
// fallback in this module.

import {db} from "./project-db.js";
import {siteUrl} from "./site-url.js";
import {reportBuildState} from "./build-log-events.js";
import {state} from "./state.js";
import {openActiveProjectStore} from "./project-session.js";
import {
  prepareSaveBuildFieldObjects,
  SAVE_BUILD_BLOB_PREFIX,
  SAVE_BUILD_MEDIA_TYPE,
} from "./save-build.js";
import {linkRom, sha256Hex} from "./rom-linker.js";
import {validateRomLinkInputs} from "./rom-link-validation.js";
import {packageBuildReport} from "./package-build-report.js";
import {prepareStoryPageRomBuild} from './story-page-rom-build.js';

const ROM_BUILD_BLOB_PREFIX = "rom-build:";
const ROM_BUILD_MEDIA_TYPE = "application/x-nes-rom";

class BrowserBuildUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "BrowserBuildUnavailableError";
  }
}

let configuredProvider = null;

const requireObject = (value, message) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BrowserBuildUnavailableError(message);
  }
  return value;
};

export function publishBuildState(event = null) {
  reportBuildState({running: state.browserBuildRunning, event});
  if (event) {
    state.browserBuildCurrentEvent = event;
    state.browserBuildEvents.push(event);
  }
  if (typeof globalThis.dispatchEvent !== "function" ||
      typeof globalThis.CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent("mmeditor-browser-build", {
    detail: {
      running: state.browserBuildRunning,
      error: state.browserBuildError,
      current_event: state.browserBuildCurrentEvent,
      event,
      report: state.browserBuildReport,
    },
  }));
}

async function compileAssetBindings(input) {
  const compiler = await import("./asset-compiler.js");
  return compiler.compileAssetBindings(input);
}

function compilerFunction(assetCompiler) {
  if (typeof assetCompiler === "function") return assetCompiler;
  if (assetCompiler && typeof assetCompiler.compile === "function") {
    return input => assetCompiler.compile(input);
  }
  throw new BrowserBuildUnavailableError(
    "当前构建目标没有可用的资产编译器",
  );
}

function supportsSaveWorking(repository) {
  const canResolve = typeof repository?.resolveSaveCurrent === "function";
  const canSave = typeof repository?.saveSaveCurrent === "function";
  if (canResolve !== canSave) {
    throw new BrowserBuildUnavailableError("项目的存档 Working 接口不完整");
  }
  return canResolve && canSave;
}

function compareText(left, right) {
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

/**
 * Repository-backed provider boundary.  A future package-io implementation
 * can replace this object without changing the linker or build log.
 */
export function createProjectStoreRomBuildProvider(repository, {
  assetCompiler = compileAssetBindings,
  fieldDb = db,
} = {}) {
  if (!repository || typeof repository.getManifest !== "function" ||
      typeof repository.getBlob !== "function") {
    throw new TypeError("repository must implement the project-store API");
  }
  const compile = compilerFunction(assetCompiler);
  const provider = {
    repository,
    async prepareBuild({onProgress = null, onTiming = null} = {}) {
      const readStarted = performance.now();
      const manifest = await repository.getManifest();
      if (!manifest) {
        throw new BrowserBuildUnavailableError(
          "项目尚未初始化；请先载入项目包或导入项目文件",
        );
      }
      if (!manifest.active_original_revision_id) {
        throw new BrowserBuildUnavailableError("项目没有当前原始版本");
      }
      const targetProfileId = manifest.default_target;
      if (typeof targetProfileId !== "string" || !targetProfileId) {
        throw new BrowserBuildUnavailableError(
          "项目清单没有默认构建目标，不能确定 ROM 布局",
        );
      }
      const targets = requireObject(
        manifest.targets,
        "项目清单没有构建目标定义",
      );
      const targetDefinition = requireObject(
        targets[targetProfileId],
        `项目缺少构建目标 ${targetProfileId}`,
      );
      const target = requireObject(
        targetDefinition.profile,
        `构建目标 ${targetProfileId} 缺少目标配置`,
      );
      const buildMap = requireObject(
        targetDefinition.build_map,
        `构建目标 ${targetProfileId} 缺少写入映射`,
      );
      const bindings = requireObject(
        targetDefinition.bindings,
        `构建目标 ${targetProfileId} 缺少资产绑定`,
      );
      if (target.profile_id !== targetProfileId ||
          buildMap.target_profile_id !== targetProfileId ||
          bindings.target_profile_id !== targetProfileId) {
        throw new BrowserBuildUnavailableError(
          `构建目标 ${targetProfileId} 的目标配置、写入映射与资产绑定不一致`,
        );
      }

      const baselineBlobId = manifest.baseline_blob_id;
      if (typeof baselineBlobId !== "string" || !baselineBlobId) {
        throw new BrowserBuildUnavailableError("项目没有完整的 ROM 基线");
      }
      const baselineRecord = await repository.getBlob(baselineBlobId);
      if (!baselineRecord) {
        throw new BrowserBuildUnavailableError(
          `ROM 基线不存在：${baselineBlobId}`,
        );
      }
      const baseline = new Uint8Array(await baselineRecord.data.arrayBuffer());
      if (onTiming) onTiming("read", performance.now() - readStarted);
      const compileStarted = performance.now();
      const storyBuild = await prepareStoryPageRomBuild(repository, fieldDb);
      const plan = await compile({
        repository: storyBuild.repository,
        fieldDb: storyBuild.fieldDb,
        manifest,
        targetProfileId,
        target,
        buildMap,
        bindings,
        baseline,
        onProgress,
      });
      await storyBuild.assertCurrent();
      if (onTiming) onTiming("compile", performance.now() - compileStarted);
      const planFields = [
        "bundles", "compiler_results", "verified_excluded_assets",
      ];
      if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
          Object.keys(plan).sort(compareText).join(",") !==
            [...planFields].sort(compareText).join(",") ||
          planFields.some(field => !Array.isArray(plan[field]))) {
        throw new TypeError("AssetCompiler must return a complete ROM build plan");
      }
      if (!supportsSaveWorking(repository)) {
        throw new BrowserBuildUnavailableError(
          "项目仓库没有完整的存档 Working 接口，不能生成配套存档",
        );
      }
      const saveReadStarted = performance.now();
      const saveFields = await prepareSaveBuildFieldObjects(repository);
      if (onTiming) onTiming("read", performance.now() - saveReadStarted);
      return {
        repository,
        manifest,
        targetProfileId,
        target,
        buildMap,
        bindings,
        baseline,
        bundles: plan.bundles,
        compilerResults: plan.compiler_results,
        verifiedExcludedAssets: plan.verified_excluded_assets,
        saveFields,
      };
    },
  };
  return Object.freeze({...provider, async prepareBuild(options) {
    if (!repository.getBuildInputStamp) return provider.prepareBuild(options);
    while (true) {
      const before = await repository.getBuildInputStamp();
      try {
        const result = await provider.prepareBuild(options);
        if ((await repository.getBuildInputStamp()).stamp === before.stamp) return result;
      } catch (error) {
        if ((await repository.getBuildInputStamp()).stamp === before.stamp) throw error;
      }
    }
  }});
}

export function configureBrowserRomBuildProvider(provider) {
  if (!provider || typeof provider.prepareBuild !== "function") {
    throw new TypeError("build provider must implement prepareBuild()");
  }
  configuredProvider = provider;
  return provider;
}

async function defaultProvider() {
  if (configuredProvider) return configuredProvider;
  const repository = await openActiveProjectStore();
  configuredProvider = createProjectStoreRomBuildProvider(repository);
  return configuredProvider;
}


/** Build and persist a ROM, rejecting on every unavailable/invalid state. */
export async function buildBrowserRom({
  provider = null,
  onEvent = null,
  preserveEvents = false,
  buildRom = true,
  buildSave = true,
  onTiming = null,
  verify = true,
  verification = "checked",
  timings = {},
} = {}) {
  const notifyTiming = onTiming;
  onTiming = (name, duration) => {
    timings[name] = (timings[name] || 0) + duration;
    notifyTiming?.(name, duration);
  };
  if (!buildRom && !buildSave) throw new BrowserBuildUnavailableError("请选择 ROM 或 SAV");
  if (state.browserBuildRunning) {
    throw new BrowserBuildUnavailableError("已有一个 ROM 构建正在进行");
  }
  state.browserBuildRunning = true;
  state.browserBuildError = "";
  state.browserBuildEvents = preserveEvents
    ? [...state.browserBuildEvents] : [];
  state.browserBuildCurrentEvent = state.browserBuildEvents.at(-1) || null;
  state.browserBuildReport = null;
  state.browserBuildRom = null;
  state.browserBuildSave = null;
  publishBuildState();
  let lastEventAt = performance.now();
  const emit = async event => {
    const now = performance.now();
    const timedEvent = {...event, duration_ms: now - lastEventAt};
    lastEventAt = now;
    publishBuildState(timedEvent);
    if (onEvent) await onEvent(timedEvent);
  };
  try {
    const repository = !buildRom || !buildSave
      ? provider?.repository || state.projectRepository || await openActiveProjectStore()
      : null;
    const previousId = repository
      ? (await repository.getManifest())?.latest_package_build_id : null;
    let previous = null;
    if (!buildRom || !buildSave) {
      if (!previousId) throw new BrowserBuildUnavailableError("首次构建须同时选择 ROM 和 SAV");
      const [record, romRecord, saveRecord] = await Promise.all([
        repository.getBuildReport(previousId),
        repository.getBlob(`${ROM_BUILD_BLOB_PREFIX}${previousId}`),
        repository.getBlob(`${SAVE_BUILD_BLOB_PREFIX}${previousId}`),
      ]);
      if (!record?.report || !romRecord || !saveRecord) {
        throw new BrowserBuildUnavailableError("上一对构建产物不完整，无法沿用未勾选产物");
      }
      previous = {
        report: record.report,
        rom: new Uint8Array(await romRecord.data.arrayBuffer()),
        save: new Uint8Array(await saveRecord.data.arrayBuffer()),
      };
      if (await sha256Hex(previous.rom) !== previous.report.output_sha256 ||
          await sha256Hex(previous.save) !== previous.report.save_sha256) {
        throw new BrowserBuildUnavailableError("上一对构建产物摘要不符");
      }
    }
    let prepared = null;
    let result = null;
    if (buildRom) {
    await emit({
      stage: "prepare",
      event_type: "build-plan-started",
      status: "running",
      progress_current: 1,
      progress_total: 2,
      message: "读取当前原始版本、ROM 基线、构建目标与资产绑定",
    });
    const selectedProvider = provider || await defaultProvider();
    prepared = await selectedProvider.prepareBuild({onProgress: emit, onTiming});
    if (!prepared || typeof prepared !== "object" ||
        !Array.isArray(prepared.bundles) ||
        !Array.isArray(prepared.compilerResults) ||
        !Array.isArray(prepared.verifiedExcludedAssets)) {
      throw new TypeError(
        "build provider must return complete ROM compiler metadata",
      );
    }
    if (!supportsSaveWorking(prepared.repository)) {
      throw new BrowserBuildUnavailableError(
        "项目仓库没有完整的存档 Working 接口，不能生成配套存档",
      );
    }
    if (!(prepared.saveFields?.initialSave instanceof Uint8Array) ||
        typeof prepared.saveFields.openCurrent !== "function" ||
        typeof prepared.saveFields.recomputeChecksums !== "function" ||
        typeof prepared.saveFields.changedByteCount !== "function" ||
        typeof prepared.saveFields.slotStatus !== "function") {
      throw new TypeError("SAVE build provider must return complete SAVE compiler metadata");
    }
    await emit({
      stage: "prepare",
      event_type: "build-plan-ready",
      status: "success",
      progress_current: 2,
      progress_total: 2,
      message: `${prepared.bundles.length} 个 ROM bundle`,
    });
    const validationStarted = performance.now();
    await validateRomLinkInputs({
      baseline: prepared.baseline,
      target: prepared.target,
      buildMap: prepared.buildMap,
      bundles: prepared.bundles,
    });
    if (onTiming) onTiming("validate", performance.now() - validationStarted);
    await emit({
      stage: "validate", event_type: "build-inputs-validated", status: "success",
      message: "写入前校验完成",
    });
    const linkStarted = performance.now();
    result = await linkRom(
      prepared.baseline,
      prepared.target,
      prepared.buildMap,
      prepared.bundles,
      {
        // AssetCompiler has already emitted one monotonic compile N/N stream.
        // Linker's deterministic report keeps its historical `compile`
        // bundle-ready events, but the live console presents them as the
        // following bundle hand-off phase instead of restarting compile at 1.
        onEvent: event => emit(event.event_type === "bundle-ready"
          ? {...event, stage: "bundle"} : event),
      },
    );
    if (onTiming) onTiming("write", performance.now() - linkStarted);
    } else {
      prepared = {repository, manifest: await repository.getManifest()};
      result = {rom: previous.rom, report: previous.report.linker};
    }
    if (state.projectRepository !== prepared.repository) {
      throw new BrowserBuildUnavailableError("构建项目与当前存档项目不一致");
    }
    if (buildSave && !prepared.saveFields) {
      if (!supportsSaveWorking(repository)) {
        throw new BrowserBuildUnavailableError("项目仓库没有完整的存档 Working 接口");
      }
      prepared.saveFields = await prepareSaveBuildFieldObjects(repository);
    }
    const saveStarted = performance.now();
    const save = buildSave
      ? prepared.saveFields.recomputeChecksums(await prepared.saveFields.openCurrent(state))
      : previous.save;
    const saveWorkingChangedBytes = buildSave
      ? prepared.saveFields.changedByteCount(save)
      : previous.report.save_working_changed_bytes;
    const saveSlots = buildSave
      ? [1, 2].map(slot => prepared.saveFields.slotStatus(save, slot))
      : previous.report.save_slots;
    const saveChecksumValid = buildSave
      ? saveSlots.every(slot => slot.valid) : previous.report.save_checksum_valid;
    if (!saveChecksumValid) throw new BrowserBuildUnavailableError("构建存档的槽标记或校验和无效");
    const saveSha256 = buildSave ? await sha256Hex(save) : previous.report.save_sha256;
    const saveSource = buildSave
      ? saveWorkingChangedBytes ? "working" : "original"
      : previous.report.save_source;
    if (onTiming) onTiming("save", performance.now() - saveStarted);
    await emit({
      stage: "save", event_type: "save-build-ready", status: "success",
      message: `${saveWorkingChangedBytes} 个存档字节变化 · 双槽校验有效`,
    });
    const createdAt = new Date().toISOString();
    const buildId = await sha256Hex(new TextEncoder().encode(
      `${result.report.build_id}:${saveSha256}:${createdAt}:${crypto.randomUUID()}`,
    ));
    const packageReport = buildRom
      ? packageBuildReport(result.report,
        prepared.compilerResults, prepared.verifiedExcludedAssets, {
      build_id: buildId,
      created_at: createdAt,
      save_sha256: saveSha256,
      save_bytes: save.length,
      save_source: saveSource,
      save_working_changed_bytes: saveWorkingChangedBytes,
      save_checksum_valid: saveChecksumValid,
      save_slots: saveSlots,
      })
      : {...previous.report, build_id: buildId, created_at: createdAt,
        save_sha256: saveSha256, save_bytes: save.length,
        save_source: saveSource, save_working_changed_bytes: saveWorkingChangedBytes,
        save_checksum_valid: saveChecksumValid, save_slots: saveSlots};
    packageReport.build_selection = {rom: buildRom, sav: buildSave};
    if (buildRom) packageReport.layout = {
      mapper: prepared.target.mapper,
      prg_bytes: prepared.target.regions.find(region => region.kind === "prg").size,
      chr_bytes: prepared.target.regions.find(region => region.kind === "chr").size,
      diagnostic: false,
    };
    packageReport.verification = {enabled: verify, preparation: verification};
    packageReport.stage_timings_ms = {...timings};
    packageReport.carried_from = {
      rom: buildRom ? null : previousId,
      sav: buildSave ? null : previousId,
    };
    const blobId = `${ROM_BUILD_BLOB_PREFIX}${buildId}`;
    const saveBlobId = `${SAVE_BUILD_BLOB_PREFIX}${buildId}`;
    const romBlob = new Blob([result.rom], {type: ROM_BUILD_MEDIA_TYPE});
    const persistTotal = 4;
    await emit({
      stage: "persist",
      event_type: "rom-build-storing",
      status: "running",
      progress_current: 1,
      progress_total: persistTotal,
      asset_id: blobId,
      message: "保存 ROM 构建结果",
    });
    const persistStarted = performance.now();
    await prepared.repository.putBlob(blobId, romBlob, {
      kind: "rom-build",
      build_id: buildId,
      target_profile_id: result.report.target_profile_id,
      output_sha256: result.report.output_sha256,
      created_at: createdAt,
    });
    await emit({
      stage: "persist",
      event_type: "save-build-storing",
      status: "running",
      progress_current: 2,
      progress_total: persistTotal,
      asset_id: saveBlobId,
      message: "保存与 ROM 同步构建的当前存档",
    });
    await prepared.repository.putBlob(
      saveBlobId, new Blob([save], {type: SAVE_BUILD_MEDIA_TYPE}), {
        kind: "save-build",
        build_id: buildId,
        save_sha256: saveSha256,
        source: saveSource,
        working_changed_bytes: saveWorkingChangedBytes,
        checksum_valid: saveChecksumValid,
        created_at: createdAt,
      },
    );
    await emit({
      stage: "persist",
      event_type: "build-report-storing",
      status: "running",
      progress_current: persistTotal - 1,
      progress_total: persistTotal,
      asset_id: buildId,
      message: "保存结构化构建报告",
    });
    await prepared.repository.putBuildReport(buildId, packageReport, {
      createdAt,
    });
    const latestManifest = await prepared.repository.getManifest();
    if (latestManifest.active_original_revision_id !==
        prepared.manifest.active_original_revision_id) {
      throw new BrowserBuildUnavailableError(
        "构建期间当前原始版本已变化，无法将结果设为最新构建",
      );
    }
    await emit({
      stage: "persist",
      event_type: "project-manifest-updating",
      status: "running",
      progress_current: persistTotal,
      progress_total: persistTotal,
      asset_id: buildId,
      message: "更新项目的最近构建指针",
    });
    const savedManifest = await prepared.repository.saveManifest({
      ...latestManifest,
      latest_package_build_id: buildId,
    }, {
      expectedActiveRevisionId: prepared.manifest.active_original_revision_id,
      buildOutputOnly: true,
    });
    if (onTiming) onTiming("persist", performance.now() - persistStarted);
    packageReport.stage_timings_ms = {...timings};
    await prepared.repository.putBuildReport(buildId, packageReport, {createdAt});

    state.browserProjectManifest = savedManifest;
    state.browserBuildReport = packageReport;
    state.browserBuildRom = result.rom;
    state.browserBuildSave = save;
    state.browserBuildRunning = false;
    await emit({
      stage: "done",
      event_type: "package-build-complete",
      status: "success",
      progress_current: 1,
      progress_total: 1,
      asset_id: buildId,
      changed_bytes: result.report.changed_bytes,
      message: `${result.report.changed_bytes} 个 ROM 字节变化 · ` +
        `同步生成 ${save.length} B 存档 · ${saveSource === "original"
          ? "Original" : `Working 改动 ${saveWorkingChangedBytes} 字节`} · 双槽校验有效`,
    });
    return {
      ...result,
      report: packageReport,
      build_id: buildId,
      blob_id: blobId,
      save,
      save_blob_id: saveBlobId,
      created_at: createdAt,
    };
  } catch (error) {
    state.browserBuildRunning = false;
    state.browserBuildError = error instanceof Error
      ? error.message : String(error);
    publishBuildState({
      stage: "error",
      event_type: "package-build-failed",
      status: "error",
      message: state.browserBuildError,
      error,
    });
    throw error;
  }
}

export function buildLogButton() {
  return `<a class="button" href="?view=build"
    title="查看项目状态、每个写入区的构建事件和最终 ROM 字节差异"
  >▤ 项目与构建</a>`;
}

export function runLatestBrowserRomButton() {
  return `<a class="button" href="${siteUrl("emulator.html")}?rom=latest&amp;autostart=1"
    target="mmeditor-emulator" rel="noopener"
    title="在独立窗口运行最近一次成功构建的 ROM"
  >▶ 运行最新构建 ↗</a>`;
}
