import { openActiveProjectStore, loadByteMapSpace } from './battle-result-script-runtime-B_EClFew.js';
import { sha256Hex } from './visual-metasprites-DJP54-bV.js';
import { romHeaderSizes, getSaveSlotStatus } from './prg-loaders-BmwiQmdC.js';

// @editor-module 把构建写入时间格式化为可排序的人类标识。

function twoDigits(value) {
  return String(value).padStart(2, "0");
}

function buildTimeStamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("构建时间无效");
  return `${date.getFullYear()}${twoDigits(date.getMonth() + 1)}${twoDigits(date.getDate())}` +
    `-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`;
}

function buildTimeLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "构建时间未知";
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} ` +
    `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;
}

// @editor-module browser-local ROM runtime adapter.
//
// ROM bytes come from the browser project database or a local File selected by
// the user.  They never pass through a ROM-serving HTTP endpoint.  EmulatorJS
// remains an unmodified vendor tree; this adapter gives it an object URL.


// Mapper 74 (Waixing MMC3 variant + 2 KiB CHR-RAM) requires fceumm here.
const CORE = "fceumm";
const DATA_PATH = new URL("./vendor/emulatorjs/", new URL("../emulator.js", import.meta.url).href).href;
const BUILD_BLOB_PREFIX = "rom-build:";
const SAVE_BUILD_BLOB_PREFIX = "save-build:";
const LOCAL_BLOB_PREFIX = "rom-import:";
const ROM_MEDIA_TYPE = "application/x-nes-rom";
const SAVE_BYTE_LENGTH = 8192;
const SAVE_LIBRARY_INDEX_BLOB_ID = "save-library:index";
const SAVE_LIBRARY_SCHEMA = "metalmaxcn.save-library";
const SAVE_LIBRARY_BLOB_PREFIX = "save-file:";
const SAVE_LIBRARY_MEDIA_TYPE = "application/octet-stream";
const SAVE_SOURCE_EDITOR = "editor-draft";
const SAVE_SOURCE_EMULATOR = "emulator-battery";

const romSelect = document.querySelector("#rom-select");
const fileInput = document.querySelector("#rom-file");
const reload = document.querySelector("#reload");
const romDownload = document.querySelector("#rom-download");
const selectedSaveDownload = document.querySelector("#selected-save-download");
const currentSaveDownload = document.querySelector("#current-save-download");
const meta = document.querySelector("#meta");
const fallback = document.querySelector("#fallback");
const game = document.querySelector("#game");
const saveSelect = document.querySelector("#save-select");
const saveDelete = document.querySelector("#save-delete");
const currentSaveDisplay = document.querySelector("#current-save-display");

let activeObjectUrl = null;
let booted = false;
let coreReady = false;
let saveEntries = [];
let startupSave = Promise.resolve();
let startedSave = null;
let runningSaveSignature = "";
let saveCapture = Promise.resolve();
let saveCaptureTimer = null;
let saveByteMap = null;
let activeRomSave = null;
let currentSaveBytes = null;

const sourceLabels = Object.freeze({
  [SAVE_SOURCE_EDITOR]: "编辑器草稿",
  [SAVE_SOURCE_EMULATOR]: "模拟器电池存档",
});

function requireSaveRepository(repository) {
  for (const method of ["putBlob", "getBlob", "listBlobs", "deleteBlob"]) {
    if (!repository || typeof repository[method] !== "function") {
      throw new TypeError(`存档库需要 project repository.${method}()`);
    }
  }
  return repository;
}

async function normalizedSaveBytes(value, label = "存档") {
  let bytes;
  if (value instanceof Blob) bytes = new Uint8Array(await value.arrayBuffer());
  else if (value instanceof Uint8Array) bytes = value.slice();
  else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value.slice(0));
  else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  } else {
    throw new TypeError(`${label} 必须是 Blob、ArrayBuffer 或字节视图`);
  }
  if (!bytes.length) throw new Error(`${label} 不能为空`);
  if (bytes.length !== SAVE_BYTE_LENGTH) {
    throw new Error(`${label} 必须是 ${SAVE_BYTE_LENGTH} 字节，实际 ${bytes.length} 字节`);
  }
  return bytes;
}

function normalizedSaveEntry(value) {
  const entry = value && typeof value === "object" && !Array.isArray(value)
    ? {...value} : null;
  if (!entry || typeof entry.id !== "string" ||
      !entry.id.startsWith(SAVE_LIBRARY_BLOB_PREFIX)) {
    throw new Error("存档库目录含有无效的条目标识");
  }
  if (typeof entry.name !== "string" || !entry.name.trim()) {
    throw new Error(`${entry.id} 缺少名称`);
  }
  if (!Number.isInteger(entry.byte_length) || entry.byte_length < 1) {
    throw new Error(`${entry.id} 缺少有效字节数`);
  }
  if (typeof entry.created_at !== "string" ||
      Number.isNaN(Date.parse(entry.created_at))) {
    throw new Error(`${entry.id} 缺少有效写入时间`);
  }
  if (!Object.hasOwn(sourceLabels, entry.source)) {
    throw new Error(`${entry.id} 的来源无效`);
  }
  if (typeof entry.rom_sha256 !== "string" ||
      (entry.rom_sha256 && !/^[0-9a-f]{64}$/u.test(entry.rom_sha256))) {
    throw new Error(`${entry.id} 的 ROM SHA-256 无效`);
  }
  if (typeof entry.content_sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(entry.content_sha256)) {
    throw new Error(`${entry.id} 的内容 SHA-256 无效`);
  }
  return Object.freeze(entry);
}

function sortedSaveEntries(entries) {
  return entries.map(normalizedSaveEntry).sort((left, right) =>
    right.created_at.localeCompare(left.created_at) ||
      right.id.localeCompare(left.id),
  );
}

function storedSaveEntry(record) {
  if (record?.kind !== "battery-save" ||
      !record.blob_id.startsWith(SAVE_LIBRARY_BLOB_PREFIX)) return null;
  return normalizedSaveEntry({
    id: record.blob_id,
    name: record.name,
    byte_length: record.byte_length,
    created_at: record.created_at,
    source: record.source,
    rom_sha256: record.rom_sha256,
    content_sha256: record.content_sha256,
  });
}

/** 旧 SAV 的目录只提供缺失元数据，不写回目录。 */
async function legacySaveEntries(repository) {
  const record = await repository.getBlob(SAVE_LIBRARY_INDEX_BLOB_ID);
  if (!record) return [];
  let document_;
  try {
    document_ = JSON.parse(await record.data.text());
  } catch (error) {
    throw new Error("存档库目录不是有效 JSON", {cause: error});
  }
  if (document_?.schema !== SAVE_LIBRARY_SCHEMA || !Array.isArray(document_.entries)) {
    throw new Error("存档库目录 schema 无效");
  }
  return document_.entries.map(normalizedSaveEntry);
}

async function projectSaveEntry(repository, record) {
  if (!record) return null;
  return storedSaveEntry(record) ||
    (await legacySaveEntries(repository)).find(entry => entry.id === record.blob_id) || null;
}

/** List the project-wide battery-save library without partitioning by ROM. */
async function listProjectSaves(repository) {
  requireSaveRepository(repository);
  const records = await repository.listBlobs(SAVE_LIBRARY_BLOB_PREFIX);
  const entries = records.map(storedSaveEntry);
  const legacy = entries.some(entry => !entry)
    ? new Map((await legacySaveEntries(repository)).map(entry => [entry.id, entry])) : new Map();
  return sortedSaveEntries(entries.map((entry, index) =>
    entry || legacy.get(records[index].blob_id)).filter(Boolean));
}

function newSaveBlobId() {
  const random = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join("-")}`;
  return `${SAVE_LIBRARY_BLOB_PREFIX}${random}`;
}

/** SAV 字节与元数据须在同一条仓库记录中原子入库。 */
async function putProjectSave(repository, value, {
  id = newSaveBlobId(),
  name = "metalmaxcn.sav",
  source,
  romSha256 = "",
  createdAt = new Date().toISOString(),
} = {}) {
  requireSaveRepository(repository);
  const bytes = await normalizedSaveBytes(value);
  const entry = normalizedSaveEntry({
    id,
    name: String(name || "").trim(),
    byte_length: bytes.length,
    created_at: createdAt,
    source,
    rom_sha256: String(romSha256 || "").toLowerCase(),
    content_sha256: await sha256Hex(bytes),
  });
  try {
    await repository.putBlob(entry.id, bytes, {
      kind: "battery-save",
      save_id: entry.id,
      name: entry.name,
      source: entry.source,
      created_at: entry.created_at,
      rom_sha256: entry.rom_sha256,
      content_sha256: entry.content_sha256,
      media_type: SAVE_LIBRARY_MEDIA_TYPE,
    }, {overwrite: false});
  } catch (error) {
    if (error.name === "ConstraintError") {
      throw new Error(`存档条目标识已存在：${entry.id}`, {cause: error});
    }
    throw error;
  }
  return entry;
}

/** 读取 SAV 须校验原始字节与条目元数据一致。 */
async function getProjectSave(repository, id) {
  requireSaveRepository(repository);
  if (typeof id !== "string" || !id.startsWith(SAVE_LIBRARY_BLOB_PREFIX)) return null;
  const record = await repository.getBlob(id);
  const entry = await projectSaveEntry(repository, record);
  if (!entry) return null;
  const bytes = await normalizedSaveBytes(record.data, entry.name);
  const contentSha256 = await sha256Hex(bytes);
  if (bytes.length !== entry.byte_length || contentSha256 !== entry.content_sha256) {
    throw new Error(`存档条目 ${entry.id} 的字节与目录元数据不一致`);
  }
  return {...entry, bytes};
}

/** 删除 SAV 只删除所选记录。 */
async function deleteProjectSave(repository, id) {
  requireSaveRepository(repository);
  if (typeof id !== "string" || !id.startsWith(SAVE_LIBRARY_BLOB_PREFIX)) return false;
  if (!await projectSaveEntry(repository, await repository.getBlob(id))) return false;
  return repository.deleteBlob(id);
}

function projectSaveBytesEqual(left, right) {
  return left instanceof Uint8Array && right instanceof Uint8Array &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function saveSlotSignature(bytes) {
  return [1, 2].map(slot => getSaveSlotStatus(bytes, slot, saveByteMap))
    .filter(status => status.valid)
    .map(status => `${status.slot}:${status.storedChecksum}`)
    .join("|");
}

/** Hash narrows candidates; an exact byte comparison makes the final decision. */
async function findMatchingProjectSave(repository, value) {
  const bytes = await normalizedSaveBytes(value);
  const contentSha256 = await sha256Hex(bytes);
  const candidates = (await listProjectSaves(repository)).filter(entry =>
    entry.byte_length === bytes.length && entry.content_sha256 === contentSha256,
  );
  for (const entry of candidates) {
    const stored = await getProjectSave(repository, entry.id);
    if (stored && projectSaveBytesEqual(bytes, stored.bytes)) return entry;
  }
  return null;
}

/** Make the persisted editable SRAM current value discoverable in the project library. */
async function publishEditorWorkingSave(repository) {
  const working = await repository.getWorking("save-current");
  const changed = working?.overrides?.bytes;
  if (changed === undefined) return {entry: null,
    reason: working ? "当前修改只含未获 SRAM 写入许可的字段草稿" : "当前值与 ROM 初始值相同"};
  if (!Array.isArray(changed) || changed.length !== SAVE_BYTE_LENGTH ||
      changed.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error("存档 Working 的字节覆盖无效");
  }
  const bytes = Uint8Array.from(changed);
  const digest = await sha256Hex(bytes);
  const id = `${SAVE_LIBRARY_BLOB_PREFIX}editor-current-${digest}`;
  const existing = await getProjectSave(repository, id);
  if (existing) return {entry: existing, reason: ""};
  const entry = await putProjectSave(repository, bytes, {
    id, name: working.overrides.name || "编辑器当前存档.sav",
    source: SAVE_SOURCE_EDITOR,
  });
  return {entry, reason: ""};
}

function requireGameManager(gameManager) {
  if (!gameManager || typeof gameManager.getSaveFilePath !== "function" ||
      typeof gameManager.getSaveFile !== "function" ||
      typeof gameManager.loadSaveFiles !== "function" || !gameManager.FS) {
    throw new Error("EmulatorJS 电池存档接口尚未就绪");
  }
  return gameManager;
}

function savePathExists(fileSystem, path) {
  try {
    fileSystem.readFile(path);
    return true;
  } catch (_error) {
    return false;
  }
}

async function currentEmulatorSaveBytes(gameManager, {optional = false} = {}) {
  const manager = requireGameManager(gameManager);
  const path = manager.getSaveFilePath();
  if (!path) throw new Error("EmulatorJS 尚未给出电池存档路径");
  if (optional && !savePathExists(manager.FS, path)) return null;
  const value = await manager.getSaveFile();
  if (value == null) {
    if (optional) return null;
    throw new Error("当前 ROM 还没有可存入项目库的电池存档");
  }
  return normalizedSaveBytes(value, "当前电池存档");
}

function emulatorSaveName(prefix = "模拟器电池存档") {
  return `${prefix} ${new Date().toLocaleString("zh-CN", {hour12: false})}`;
}

function ensureSaveParentDirectories(fileSystem, path) {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try {
      fileSystem.mkdir(current);
    } catch (error) {
      try {
        fileSystem.stat(current);
      } catch (_statError) {
        throw error;
      }
    }
  }
}

/** Replace the battery file before the first emulated frame. */
async function installEmulatorSaveBytes(gameManager, value, label = "存档") {
  const manager = requireGameManager(gameManager);
  const bytes = await normalizedSaveBytes(value, label);
  const path = manager.getSaveFilePath();
  if (!path) throw new Error("EmulatorJS 尚未给出电池存档路径");
  ensureSaveParentDirectories(manager.FS, path);
  if (savePathExists(manager.FS, path)) manager.FS.unlink(path);
  manager.FS.writeFile(path, bytes);
  return {bytes, path};
}

async function installStartupSave(repository, manager, save, romSha256) {
  const path = manager.getSaveFilePath();
  if (!path) throw new Error("EmulatorJS 尚未给出电池存档路径");
  const existing = savePathExists(manager.FS, path) ? manager.FS.readFile(path).slice() : null;
  if (existing && existing.length === SAVE_BYTE_LENGTH &&
      !projectSaveBytesEqual(existing, save.bytes)) {
    const matching = await findMatchingProjectSave(repository, existing);
    if (!matching) await putProjectSave(repository, existing, {
      name: emulatorSaveName("自动兜底"), source: SAVE_SOURCE_EMULATOR, romSha256,
    });
  }
  await installEmulatorSaveBytes(manager, save.bytes, save.name);
  manager.loadSaveFiles();
}

function prepareStartupSave(repository, rom) {
  const emulator = window.EJS_emulator;
  emulator.on("saveSaveFiles", value => {
    if (!coreReady || value == null) return;
    saveCapture = saveCapture.then(async () => {
      const bytes = await normalizedSaveBytes(value, "游戏内存档");
      currentSaveBytes = bytes;
      const digest = await sha256Hex(bytes);
      setLoadedSave(`运行中电池存档 · ${bytes.length} B · SHA ${digest.slice(0, 12)}`);
      updateSaveControlAvailability();
      const signature = saveSlotSignature(bytes);
      if (!signature || signature === runningSaveSignature) return;
      const matching = await findMatchingProjectSave(repository, bytes);
      if (!matching) await putProjectSave(repository, bytes, {
        name: emulatorSaveName("游戏内存档"),
        source: SAVE_SOURCE_EMULATOR, romSha256: rom.sha256,
      });
      runningSaveSignature = signature;
      await refreshProjectSaves(repository);
    }).catch(error => showSaveError(`游戏内存档自动入库失败：${error.message}`));
  });
  const originalStart = emulator.startGame;
  emulator.startGame = async function (...args) {
    const selectedId = saveSelect.value;
    let save;
    try {
      save = await selectedSaveBytes(repository);
      if (selectedId && !save) throw new Error(`项目存档库里没有 ${selectedId}`);
      if (!save && rom.save) save = {
        buildId: rom.save.buildId,
        name: `同号构建存档 ${rom.save.buildId}`, bytes: rom.save.bytes,
        content_sha256: rom.save.sha256,
      };
    } catch (error) {
      showSaveError(`启动存档读取失败：${error.message}`);
      return;
    }
    startedSave = save;
    if (!save) return originalStart.apply(this, args);
    runningSaveSignature = save ? saveSlotSignature(save.bytes) : "";
    const module = emulator.Module;
    const callMain = module.callMain;
    const resumeMainLoop = module.resumeMainLoop;
    module.callMain = (...callArgs) => {
      const result = callMain.apply(module, callArgs);
      startupSave = installStartupSave(repository, emulatorGameManager(), save, rom.sha256);
      return result;
    };
    module.resumeMainLoop = (...resumeArgs) => {
      startupSave.then(() => {
        module.resumeMainLoop = resumeMainLoop;
        resumeMainLoop.apply(module, resumeArgs);
      }).catch(error => {
        showSaveError(`启动存档装入失败：${error.message}`);
      });
    };
    try { return originalStart.apply(this, args); }
    finally { module.callMain = callMain; }
  };
}

function resumeAudioAfterInteraction() {
  const targets = [window];
  if (window.parent !== window) targets.push(window.parent);
  const events = ["pointerdown", "keydown"];
  const remove = () => {
    for (const target of targets) {
      for (const event of events) target.removeEventListener(event, resume);
    }
  };
  const resume = () => {
    const context = window.EJS_emulator?.Module?.AL?.currentCtx?.audioCtx;
    if (!context) return;
    if (context.state === "running") {
      remove();
      return;
    }
    context.resume().then(() => {
      if (context.state === "running") remove();
    }).catch(() => {});
  };
  for (const target of targets) {
    for (const event of events) target.addEventListener(event, resume);
  }
  window.addEventListener("pagehide", remove, {once: true});
}

function startOnFirstInteraction(startButton) {
  const targets = [window];
  if (window.parent !== window) targets.push(window.parent);
  const events = ["click", "keydown"];
  const remove = () => {
    for (const target of targets) {
      for (const event of events) target.removeEventListener(event, start, true);
    }
  };
  const start = event => {
    if (!event.isTrusted) return;
    remove();
    const onStartButton = event.target?.nodeType != null && startButton.contains(event.target);
    if (event.type === "click" && onStartButton) return;
    if (event.type === "keydown" && onStartButton) event.preventDefault();
    startButton.click();
  };
  for (const target of targets) {
    for (const event of events) target.addEventListener(event, start, true);
  }
  window.addEventListener("pagehide", remove, {once: true});
}

function fail(title, detail, {trustedHtml = false} = {}) {
  game.hidden = true;
  fallback.hidden = false;
  fallback.innerHTML = "<b></b><span></span>";
  fallback.querySelector("b").textContent = title;
  const span = fallback.querySelector("span");
  if (trustedHtml) span.innerHTML = detail;
  else span.textContent = detail;
}

function validateNesBlob(blob, label) {
  if (!(blob instanceof Blob) || blob.size < 16) {
    throw new Error(`${label} 不是有效的 NES ROM 文件`);
  }
  return blob.slice(0, 4).arrayBuffer().then(buffer => {
    const magic = new Uint8Array(buffer);
    if (magic[0] !== 0x4e || magic[1] !== 0x45 ||
        magic[2] !== 0x53 || magic[3] !== 0x1a) {
      throw new Error(`${label} 缺少 iNES 文件头`);
    }
    return blob;
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// EmulatorJS has no destroy API.  Every switch therefore navigates this
// isolated document; the old iframe/window is then reclaimed as a unit.
function openStoredRom(id) {
  const url = new URL(location.href);
  url.searchParams.set("rom", id);
  location.replace(url);
}

function boot(rom, repository) {
  if (booted) throw new Error("模拟器已启动；切换 ROM 必须重新载入运行页");
  booted = true;
  game.hidden = false;
  fallback.hidden = true;
  activeObjectUrl = URL.createObjectURL(rom.blob);

  window.EJS_player = "#game";
  window.EJS_core = CORE;
  window.EJS_pathtodata = DATA_PATH;
  window.EJS_gameUrl = activeObjectUrl;
  // Save-state identity follows content, not a server filename or build time.
  window.EJS_gameName = `metalmaxcn-${rom.sha256}`;
  window.EJS_color = "#d8f231";
  window.EJS_startOnLoaded = false;
  window.EJS_startButtonName = "点击或按键开始";
  window.EJS_Buttons = {
    loadSavFiles: {visible: false}, saveSavFiles: {visible: false},
    restart: {visible: false},
  };
  window.EJS_ready = () => {
    prepareStartupSave(repository, rom);
    resumeAudioAfterInteraction();
    const startButton = document.querySelector("#game .ejs_start_button");
    if (!startButton) {
      fail("无法启动模拟器", "EmulatorJS 未提供启动入口");
      return;
    }
    if (new URLSearchParams(location.search).get("autostart") === "1" ||
        navigator.userActivation?.hasBeenActive) startButton.click();
    else startOnFirstInteraction(startButton);
  };
  window.EJS_language = "zh-CN";
  window.EJS_threads = false;
  const previousOnGameStart = window.EJS_onGameStart;
  window.EJS_onGameStart = async (...args) => {
    try {
      await startupSave;
      if (startedSave && !startedSave.buildId) {
        setLoadedSave(`项目库“${startedSave.name}” · SHA ${startedSave.content_sha256.slice(0, 12)}`);
      } else if (rom.save) {
        setLoadedSave(`同号构建存档 ${rom.save.buildId.slice(0, 12)} · SHA ${rom.save.sha256.slice(0, 12)}`);
      } else {
        const bytes = await currentEmulatorSaveBytes(emulatorGameManager(), {optional: true});
        if (bytes) {
          const digest = await sha256Hex(bytes);
          const matching = await findMatchingProjectSave(repository, bytes);
          setLoadedSave(matching
            ? `模拟器本地电池存档（字节与项目库“${matching.name}”相同） · SHA ${digest.slice(0, 12)}`
            : `模拟器本地电池存档（项目库外） · SHA ${digest.slice(0, 12)}`);
        } else setLoadedSave("无电池存档");
      }
      if (!runningSaveSignature) {
        const current = emulatorGameManager().getSaveFile(false);
        if (current) runningSaveSignature = saveSlotSignature(current);
      }
      coreReady = true;
      emulatorGameManager().saveSaveFiles();
      await saveCapture;
      saveCaptureTimer ||= setInterval(() => {
        try { emulatorGameManager().saveSaveFiles(); }
        catch (error) { showSaveError(`游戏内存档采集失败：${error.message}`); }
      }, 10000);
    } catch (error) {
      coreReady = false;
      showSaveError(`启动存档确认失败：${error.message}`);
      setLoadedSave(`确认失败：${error.message}`);
    } finally {
      updateSaveControlAvailability();
      if (typeof previousOnGameStart === "function") {
        previousOnGameStart(...args);
      }
    }
  };

  const loader = document.createElement("script");
  loader.src = `${DATA_PATH}loader.js`;
  loader.addEventListener("error", () => fail(
    "EmulatorJS 载入失败",
    `取不到 <code>${DATA_PATH}loader.js</code>。静态发布必须把 ` +
      "<code>engine/vendor/emulatorjs/data/</code> 映射到这个逻辑路径。",
    {trustedHtml: true},
  ));
  document.body.appendChild(loader);
}

function reportSummary(record) {
  const report = record?.report || {};
  return {
    buildId: String(record?.build_id || report.build_id || ""),
    createdAt: String(record?.created_at || ""),
    outputSha256: String(report.output_sha256 || ""),
    targetProfileId: String(report.target_profile_id || ""),
  };
}

async function romSizeLabel(blob) {
  await validateNesBlob(blob, "ROM");
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const {prgBytes, chrBytes} = romHeaderSizes(header);
  const kb = bytes => String(bytes / 1024);
  const kind = prgBytes > 512 * 1024 || chrBytes > 256 * 1024 ? "扩展布局" : "原布局";
  return `${kind} · ${Math.round((prgBytes + chrBytes) / 1024)} KB · PRG ${kb(prgBytes)} KB / CHR ${kb(chrBytes)} KB`;
}

async function listBuilds(repository) {
  const records = await repository.listBuildReports();
  const builds = await Promise.all(records.map(async record => {
    const summary = reportSummary(record);
    if (!summary.buildId) return null;
    const rom = summary.buildId && await repository.getBlob(`${BUILD_BLOB_PREFIX}${summary.buildId}`);
    const diagnostic = Boolean(record.report?.layout?.diagnostic);
    return {...summary, sizeLabel: rom ? `${await romSizeLabel(rom.data)} · ${diagnostic ? "自检" : "游戏"}` : "",
      byteLength: rom?.data.size};
  }));
  return builds.filter(Boolean).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt) ||
      right.buildId.localeCompare(left.buildId),
  );
}

function renderBuildOptions(builds, selectedId) {
  romSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = builds.length ? "选择构建版本…" : "尚无构建版本";
  placeholder.selected = !selectedId;
  romSelect.appendChild(placeholder);
  for (const build of builds) {
    const option = document.createElement("option");
    option.value = build.buildId;
    option.textContent = [build.sizeLabel, build.buildId.slice(0, 12), buildTimeLabel(build.createdAt)]
      .filter(Boolean).join(" · ");
    option.title = `内部构建 ID ${build.buildId}`;
    if (build.byteLength !== undefined) option.title += ` · ROM ${build.byteLength} 字节（含文件头）`;
    option.selected = build.buildId === selectedId;
    romSelect.appendChild(option);
  }
  romSelect.disabled = builds.length === 0;
}

function saveOptionLabel(entry) {
  const time = entry.created_at.replace("T", " ").replace(/\.\d{3}Z$/u, "Z");
  const source = sourceLabels[entry.source] || entry.source;
  return `${entry.name} · ${entry.byte_length} B · ${source} · ${time}`;
}

function updateSaveControlAvailability() {
  if (!saveSelect) return;
  const selected = Boolean(saveSelect.value);
  selectedSaveDownload.disabled = !selected;
  saveDelete.disabled = !saveEntries.some(entry => entry.id === saveSelect.value);
  saveDelete.title = selected && saveDelete.disabled
    ? "同号构建 SAV 与 ROM 成对保存，不能单独删除" : "删除所选独立存档";
  currentSaveDownload.disabled = !currentSaveBytes;
}

function buildSaveSelection() {
  return activeRomSave ? `${SAVE_BUILD_BLOB_PREFIX}${activeRomSave.buildId}` : "";
}

async function selectedSaveBytes(repository) {
  const id = saveSelect.value;
  if (activeRomSave && id === buildSaveSelection()) return {
    buildId: activeRomSave.buildId,
    name: `同号构建存档 ${activeRomSave.buildId}`,
    bytes: activeRomSave.bytes,
    content_sha256: activeRomSave.sha256,
  };
  if (!id) return null;
  return getProjectSave(repository, id);
}

function renderProjectSaveOptions(entries, selectedId = "") {
  if (!saveSelect) return;
  saveSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "选择电池存档…";
  saveSelect.appendChild(placeholder);
  if (activeRomSave) {
    const option = document.createElement("option");
    option.value = buildSaveSelection();
    option.textContent = `同号构建 SAV · ${activeRomSave.buildId.slice(0, 12)} · SHA ${activeRomSave.sha256.slice(0, 12)}`;
    saveSelect.appendChild(option);
  }
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = saveOptionLabel(entry);
    saveSelect.appendChild(option);
  }
  saveSelect.value = selectedId || buildSaveSelection();
  saveSelect.disabled = entries.length === 0 && !activeRomSave;
  updateSaveControlAvailability();
}

async function refreshProjectSaves(repository, {selectedId = saveSelect?.value || ""} = {}) {
  saveEntries = await listProjectSaves(repository);
  if (selectedId !== buildSaveSelection() &&
      !saveEntries.some(entry => entry.id === selectedId)) selectedId = "";
  renderProjectSaveOptions(saveEntries, selectedId);
  return saveEntries;
}

function showSaveError(message) {
  meta.hidden = false;
  meta.textContent = message;
  meta.classList.add("error");
}

function setLoadedSave(message) {
  currentSaveDisplay.textContent = message;
}

function emulatorGameManager() {
  return requireGameManager(window.EJS_emulator?.gameManager);
}

function bindSaveControls(repository) {
  saveSelect.addEventListener("change", () => {
    const url = new URL(location.href);
    if (saveSelect.value && saveSelect.value !== buildSaveSelection()) {
      url.searchParams.set("save", saveSelect.value);
    }
    else url.searchParams.delete("save");
    history.replaceState(null, "", url);
    updateSaveControlAvailability();
  });
  selectedSaveDownload.addEventListener("click", async () => {
    try {
      const selected = await selectedSaveBytes(repository);
      if (!selected) throw new Error("所选存档已不在库中");
      downloadBlob(new Blob([selected.bytes], {type: SAVE_LIBRARY_MEDIA_TYPE}),
        `${selected.buildId || selected.id.slice(SAVE_LIBRARY_BLOB_PREFIX.length)}.sav`);
    } catch (error) {
      showSaveError(`存档下载失败：${error.message}`);
    }
  });
  currentSaveDownload.addEventListener("click", async () => {
    try {
      emulatorGameManager().saveSaveFiles();
      await saveCapture;
      if (!currentSaveBytes) throw new Error("当前没有电池存档");
      const digest = await sha256Hex(currentSaveBytes);
      downloadBlob(new Blob([currentSaveBytes], {type: SAVE_LIBRARY_MEDIA_TYPE}),
        `metalmaxcn-current-${digest.slice(0, 12)}.sav`);
    } catch (error) {
      showSaveError(`当前存档下载失败：${error.message}`);
    }
  });
  saveDelete.addEventListener("click", async () => {
    const id = saveSelect.value;
    const entry = saveEntries.find(item => item.id === id);
    if (!entry || !confirm(`从项目存档库删除“${entry.name}”？`)) return;
    saveDelete.disabled = true;
    try {
      await deleteProjectSave(repository, id);
      await refreshProjectSaves(repository);
      saveSelect.dispatchEvent(new Event("change"));
    } catch (error) {
      showSaveError(`删除失败：${error.message}`);
    } finally {
      updateSaveControlAvailability();
    }
  });
}

async function loadStoredRom(repository, requested, manifest) {
  let blobId;
  let identity;
  if (requested === "latest") {
    identity = manifest?.latest_package_build_id;
    if (!identity) throw new Error("当前项目还没有成功构建的 ROM");
    blobId = `${BUILD_BLOB_PREFIX}${identity}`;
  } else if (requested.startsWith("local:")) {
    identity = requested.slice("local:".length);
    blobId = `${LOCAL_BLOB_PREFIX}${identity}`;
  } else {
    identity = requested;
    blobId = `${BUILD_BLOB_PREFIX}${identity}`;
  }
  const record = await repository.getBlob(blobId);
  if (!record) throw new Error(`当前项目中不存在 ROM 文件 ${blobId}`);
  const blob = await validateNesBlob(record.data, blobId);
  const actualSha256 = await sha256Hex(new Uint8Array(await blob.arrayBuffer()));
  const expected = record.output_sha256 || record.source_sha256 || identity;
  if (expected && /^[0-9a-f]{64}$/.test(expected) && expected !== actualSha256) {
    throw new Error(`${blobId} 的 SHA-256 与项目记录不符`);
  }
  let save = null;
  if (!requested.startsWith("local:")) {
    const [saveRecord, reportRecord] = await Promise.all([
      repository.getBlob(`${SAVE_BUILD_BLOB_PREFIX}${identity}`),
      repository.getBuildReport(identity),
    ]);
    if (!saveRecord) throw new Error(`构建 ${identity} 没有同号存档`);
    if (saveRecord.build_id !== identity) {
      throw new Error(`构建 ${identity} 的存档记录号不一致`);
    }
    const bytes = await normalizedSaveBytes(saveRecord.data, `构建 ${identity} 的存档`);
    const saveSha256 = await sha256Hex(bytes);
    const expectedSaveSha256 = saveRecord.save_sha256 || reportRecord?.report?.save_sha256;
    if (!/^[0-9a-f]{64}$/u.test(expectedSaveSha256 || "") ||
        saveSha256 !== expectedSaveSha256) {
      throw new Error(`构建 ${identity} 的存档 SHA-256 与项目记录不符`);
    }
    save = {buildId: identity, bytes, sha256: saveSha256};
  }
  return {
    id: requested,
    name: record.name || (record.kind === "local-rom"
      ? "本地导入 ROM" : `构建 ${buildTimeLabel(record.created_at)}`),
    bytes: blob.size,
    sha256: actualSha256,
    createdAt: record.created_at || "",
    blob,
    sizeLabel: await romSizeLabel(blob),
    save,
  };
}

async function importLocalFile(repository, file) {
  await validateNesBlob(file, file.name || "本地文件");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sourceSha256 = await sha256Hex(bytes);
  const createdAt = new Date().toISOString();
  await repository.putBlob(`${LOCAL_BLOB_PREFIX}${sourceSha256}`, file, {
    kind: "local-rom",
    name: file.name || "local.nes",
    source_sha256: sourceSha256,
    created_at: createdAt,
    media_type: ROM_MEDIA_TYPE,
  });
  openStoredRom(`local:${sourceSha256}`);
}

async function init() {
  let repository;
  try {
    repository = await openActiveProjectStore();
  } catch (error) {
    fail("当前项目存储不可用", error.message);
    return;
  }
  bindSaveControls(repository);
  try { await publishEditorWorkingSave(repository); }
  catch (error) { showSaveError(`编辑器草稿同步失败：${error.message}`); }
  try {
    await refreshProjectSaves(repository, {
      selectedId: new URLSearchParams(location.search).get("save") || "",
    });
  } catch (error) {
    showSaveError(`存档库读取失败：${error.message}`);
  }

  const manifest = await repository.getManifest();
  const builds = await listBuilds(repository);
  const requested = new URLSearchParams(location.search).get("rom") || "latest";
  const selectedBuild = requested === "latest"
    ? manifest?.latest_package_build_id || ""
    : (requested.startsWith("local:") ? "" : requested);
  renderBuildOptions(builds, selectedBuild);

  romSelect.addEventListener("change", () => {
    if (romSelect.value) {
      const url = new URL(location.href);
      url.searchParams.delete("save");
      history.replaceState(null, "", url);
      openStoredRom(romSelect.value);
    }
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileInput.disabled = true;
    meta.hidden = true;
    meta.classList.remove("error");
    meta.textContent = "";
    try {
      await importLocalFile(repository, file);
    } catch (error) {
      fileInput.disabled = false;
      showSaveError(`导入失败：${error.message}`);
    }
  });
  reload.addEventListener("click", () => location.reload());

  try {
    const rom = await loadStoredRom(repository, requested, manifest);
    meta.hidden = false;
    meta.classList.remove("error");
    meta.textContent = rom.save
      ? `构建 ${rom.save.buildId.slice(0, 12)} · ROM SHA ${rom.sha256.slice(0, 12)}`
      : `ROM SHA ${rom.sha256.slice(0, 12)}`;
    meta.textContent += ` · ${rom.sizeLabel}`;
    meta.title = rom.save
      ? `构建 ID ${rom.save.buildId} · ROM SHA-256 ${rom.sha256}`
      : `ROM SHA-256 ${rom.sha256}`;
    meta.title += ` · ROM ${rom.bytes} 字节（含文件头）`;
    saveByteMap = await loadByteMapSpace("sram", {allPages: true});
    activeRomSave = rom.save;
    await refreshProjectSaves(repository, {
      selectedId: new URLSearchParams(location.search).get("save") || buildSaveSelection(),
    });
    reload.disabled = false;
    romDownload.disabled = false;
    romDownload.addEventListener("click", () => downloadBlob(
      rom.blob, `${rom.save?.buildId || rom.sha256}.nes`,
    ));
    setLoadedSave("尚未启动游戏");
    boot(rom, repository);
  } catch (error) {
    fail("无法载入 ROM", error.message);
  }
}

if (document.body.matches("[data-emulator-runtime]")) {
  window.addEventListener("pagehide", () => {
    if (saveCaptureTimer) clearInterval(saveCaptureTimer);
    if (coreReady) {
      try { emulatorGameManager().saveSaveFiles(); } catch (_error) { /* Page is closing. */ }
    }
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
  });
  init();
}

export { SAVE_SOURCE_EDITOR, buildTimeLabel, buildTimeStamp, deleteProjectSave, getProjectSave, listProjectSaves, putProjectSave };
