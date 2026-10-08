// @editor-module text-record 内固定图块的共用图像组件
//
// 有些界面字段名不是文字，而是脚本直接输出的一组 UI 图块。本组件只接收文本
// 资产模块已经定位好的 fixed-tile 范围，统一负责图块预览、图案表选择、保存与
// 局部还原；消费页面不接触图块编号或字节位置。

import {showEditorError} from "./editor-error.js";
import {flushAllAutoSaves} from "../core/auto-save.js";
import {esc} from "../core/dom.js";
import {bindCanvasPickerPreview} from './picker-interaction.js';
import {
  requireBrowserProjectRepository,
} from "../core/project-data.js";
import {
  invalidateTextRecordsValidation,
  textRecord,
  textRecordFixedTileValueAllowed,
  textRecordProtectedReplacementAllowed,
  TEXT_RECORDS_RESOURCE_ID,
} from "../core/text-record-project.js";
import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {bindFieldResetToOriginalButtons, resetToOriginalButton} from "./table.js";
import {uiPaintPattern} from "../render/nes.js";
import {
  outlineBox,
  PICKER_COLUMNS,
  PICKER_TILES,
  pickerTileFromEvent,
} from "./nametable-editor.js";

const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const oneByte = value => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xFF) {
    throw new TypeError("图块编号必须是 0–255 的整数");
  }
  return number;
};

function fixedTileOffsets(document_, recordId, ranges) {
  const record = textRecord(document_, recordId);
  if (!record) throw new TypeError("当前项目没有这条固定图块记录");
  if (!Array.isArray(ranges) || !ranges.length) {
    throw new TypeError("图像组件没有 fixed-tile 范围");
  }
  const fixed = new Set((record.protected_ranges || [])
    .filter(range => range.kind === "fixed-tile")
    .flatMap(range => Array.from(
      {length: Number(range.length)},
      (_, index) => Number(range.offset) + index,
    )));
  const offsets = ranges.flatMap((range, rangeIndex) => {
    const offset = Number(range?.offset);
    const length = Number(range?.length);
    if (!Number.isInteger(offset) || !Number.isInteger(length) || length < 1) {
      throw new TypeError(`固定图块范围 ${rangeIndex} 无效`);
    }
    return Array.from({length}, (_, index) => offset + index);
  });
  if (!offsets.length || offsets.some(offset => !fixed.has(offset))) {
    throw new TypeError("图像组件范围包含非 fixed-tile 字节");
  }
  return {record, offsets};
}

/** Update exactly one tile slot while preserving the rest of the text script. */
function installFixedTileValue(
  document_, recordId, ranges, slotIndex, tile
) {
  const {record, offsets} = fixedTileOffsets(document_, recordId, ranges);
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 0 || index >= offsets.length) {
    throw new TypeError("固定图块槽位超出组件范围");
  }
  const value = oneByte(tile);
  if (!textRecordFixedTileValueAllowed(value)) {
    throw new TypeError("这个编号会被文字脚本解释为命令或字形前缀，不能作为固定图块");
  }
  record.bytes[offsets[index]] = value;
  invalidateTextRecordsValidation(document_);
  return {record, offsets, offset: offsets[index], tile: value, slotIndex: index};
}

function tileHex(value) {
  return oneByte(value).toString(16).toUpperCase().padStart(2, "0");
}

function fixedTileState(editor, message, {invalid = false} = {}) {
  const status = editor?.querySelector?.("[data-fixed-tile-save-state]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("invalid", invalid);
}

function serializedRangesFrom(element) {
  return JSON.parse(String(element?.dataset.fixedTileRanges || "[]"));
}

export function fixedTileEditorMarkup({
  recordId,
  editorId = recordId,
  ranges,
  document: document_ = state.project?.text_record_edits,
  label = "图像字段名",
  description = "固定 UI 图块",
  className = "",
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let values = [];
  let failure = "";
  try {
    const resolved = document_ ? fixedTileOffsets(document_, id, ranges) : null;
    if (!resolved) failure = "当前项目没有可用的固定图块记录。";
    else values = resolved.offsets.map(offset => resolved.record.bytes[offset]);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const serializedRanges = JSON.stringify(ranges || []);
  const enabled = values.length > 0 && !failure;
  const slots = values.map((tile, index) => `<button type="button"
      class="fixed-tile-slot${index === 0 ? " is-active" : ""}"
      data-fixed-tile-slot="${index}" title="选择第 ${index + 1} 个图块">
      <canvas width="8" height="8" data-fixed-tile-preview="${index}"
        aria-label="第 ${index + 1} 个固定图块"></canvas>
      <small data-fixed-tile-value="${index}">图块 ${tileHex(tile)}</small>
    </button>`).join("");
  return `<div class="fixed-tile-editor${className ? ` ${esc(className)}` : ""}"
    data-fixed-tile-editor="${esc(editor)}"
    data-fixed-tile-record="${esc(id)}"
    data-fixed-tile-ranges="${esc(serializedRanges)}"
    data-fixed-tile-active="0" title="${esc(description)}">
    <div class="fixed-tile-editor-heading"><b>${esc(label)}</b><small>${esc(id)}</small></div>
    ${failure ? `<p class="fixed-tile-editor-error">${esc(failure)}</p>` : `
      <div class="fixed-tile-slots">${slots}</div>
      <details class="fixed-tile-choice">
        <summary>选择 UI 图块</summary>
        <div class="fixed-tile-choice-panel">
          <label class="module-reference-picker-filter">图块编号
            <input type="search" data-fixed-tile-search placeholder="十进制或 0x 十六进制"></label>
          <nav class="module-reference-picker-groups" aria-label="图块分组">
            <button type="button" data-fixed-tile-group="" aria-pressed="true">全部</button>
            ${[0, 1, 2, 3].map(group => `<button type="button" data-fixed-tile-group="${group}"
              aria-pressed="false">${group * 64}–${group * 64 + 63}</button>`).join("")}
          </nav>
          <label class="fixed-tile-picker-field" title="暗色图块不可用于当前字段"><span>UI 图案表</span>
            <canvas width="128" height="128" data-fixed-tile-picker
              aria-label="选择 UI 图块"></canvas>
          </label>
        </div>
      </details>`}
    <div class="fixed-tile-editor-actions">
      <span data-fixed-tile-save-state aria-live="polite"></span>
      ${resetToOriginalButton(editor, {
        title: "把这个图块恢复到 Original；同一资源里的其他编辑保留",
        disabled: !enabled,
      })}
    </div>
  </div>`;
}

function paintFixedTileEditor(editor, sources) {
  const document_ = editor.__fixedTileDocument?.() || null;
  const recordId = String(editor.dataset.fixedTileRecord || "");
  const ranges = serializedRangesFrom(editor);
  const {record, offsets} = fixedTileOffsets(document_, recordId, ranges);
  const active = Math.max(
    0,
    Math.min(offsets.length - 1, Number(editor.dataset.fixedTileActive) || 0),
  );
  editor.dataset.fixedTileActive = String(active);
  editor.querySelectorAll("[data-fixed-tile-slot]").forEach(button => {
    const index = Number(button.dataset.fixedTileSlot);
    const tile = record.bytes[offsets[index]];
    button.classList.toggle("is-active", index === active);
    const canvas = button.querySelector("[data-fixed-tile-preview]");
    const context = canvas?.getContext("2d");
    if (context) {
      const image = context.createImageData(8, 8);
      uiPaintPattern(
        image.data, 8, 8, sources.patterns, sources.corePatterns,
        tile, 0, 0,
      );
      context.putImageData(image, 0, 0);
    }
    const value = button.querySelector("[data-fixed-tile-value]");
    if (value) value.textContent = `图块 ${tileHex(tile)}`;
  });
  const picker = editor.querySelector("[data-fixed-tile-picker]");
  const context = picker?.getContext("2d");
  if (context) {
    const image = context.createImageData(128, 128);
    for (let tile = 0; tile < PICKER_TILES; tile += 1) {
      const originX = (tile % PICKER_COLUMNS) * 8;
      const originY = Math.floor(tile / PICKER_COLUMNS) * 8;
      uiPaintPattern(
        image.data, 128, 128, sources.patterns, sources.corePatterns,
        tile, originX, originY,
      );
      if (!editor.__fixedTileAllowed?.(offsets[active], tile)) {
        for (let y = 0; y < 8; y += 1) {
          for (let x = 0; x < 8; x += 1) {
            const pixel = ((originY + y) * 128 + originX + x) * 4;
            image.data[pixel] = Math.floor(image.data[pixel] * 0.28);
            image.data[pixel + 1] = Math.floor(image.data[pixel + 1] * 0.28);
            image.data[pixel + 2] = Math.floor(image.data[pixel + 2] * 0.28);
          }
        }
      }
    }
    const tile = record.bytes[offsets[active]];
    outlineBox(image, {
      x: (tile % PICKER_COLUMNS) * 8,
      y: Math.floor(tile / PICKER_COLUMNS) * 8,
      width: 8,
      height: 8,
    });
    context.putImageData(image, 0, 0);
    const group = editor.dataset.fixedTileGroup;
    if (group !== undefined && group !== "") {
      context.fillStyle = "rgb(0 0 0 / 70%)";
      const firstRow = Number(group) * 4;
      context.fillRect(0, 0, 128, firstRow * 8);
      context.fillRect(0, (firstRow + 4) * 8, 128, (12 - firstRow) * 8);
    }
    const search = String(editor.dataset.fixedTileSearch || "").trim();
    const sought = /^0x[0-9a-f]+$/iu.test(search) ? Number.parseInt(search.slice(2), 16)
      : /^\d+$/u.test(search) ? Number(search) : null;
    if (Number.isInteger(sought) && sought >= 0 && sought < PICKER_TILES) {
      context.strokeStyle = "#ffdf61";
      context.lineWidth = 1;
      context.strokeRect((sought % PICKER_COLUMNS) * 8 + 0.5,
        Math.floor(sought / PICKER_COLUMNS) * 8 + 0.5, 7, 7);
    }
  }
}

export function bindFixedTileEditors(root, {
  database = db,
  getDocument = () => state.project?.text_record_edits || null,
  getRepository = () => requireBrowserProjectRepository(state),
  getRenderSources,
  onDraft = () => {},
  onSaved = async () => {},
  onReset = async () => {},
} = {}) {
  if (!root) return null;
  const editors = [...root.querySelectorAll("[data-fixed-tile-editor]")];
  if (!editors.length) return null;
  if (typeof getRenderSources !== "function") {
    throw new TypeError("固定图块编辑器需要 UI 图案表渲染源");
  }
  let generation = 0;
  let latestGeneration = 0;
  const repository = getRepository();
  const project = state.project, revision = state.browserProjectManifest?.active_original_revision_id;
  const assertSession = () => {
    if (getRepository() !== repository || state.projectRepository !== repository || state.project !== project
        || state.browserProjectManifest?.active_original_revision_id !== revision)
      throw new Error("项目会话已切换，请重新打开图块编辑器");
  };
  const sourcesPromise = Promise.resolve().then(getRenderSources);
  for (const editor of editors) editor.__fixedTileDocument = getDocument;

  const paint = async editor => {
    try {
      paintFixedTileEditor(editor, await sourcesPromise);
    } catch (error) {
      fixedTileState(
        editor, `图块预览失败：${error?.message || error}`, {invalid: true},
      );
    }
  };
  editors.forEach(editor => {
    const canvas = editor.querySelector('[data-fixed-tile-picker]');
    bindCanvasPickerPreview(canvas, {list: canvas?.closest('.fixed-tile-picker-field'), label: tile => `图块 ${tileHex(tile)}`});
    void paint(editor);
  });
  root.addEventListener("input", event => {
    if (!event.target.matches?.("[data-fixed-tile-search]")) return;
    const editor = event.target.closest("[data-fixed-tile-editor]");
    editor.dataset.fixedTileSearch = event.target.value;
    void paint(editor);
  });
  root.addEventListener("click", event => {
    const button = event.target.closest?.("[data-fixed-tile-group]");
    if (!button) return;
    const editor = button.closest("[data-fixed-tile-editor]");
    editor.dataset.fixedTileGroup = button.dataset.fixedTileGroup;
    editor.querySelectorAll("[data-fixed-tile-group]").forEach(candidate =>
      candidate.setAttribute("aria-pressed", String(candidate === button)));
    void paint(editor);
  });

  const save = (editor, slotIndex, tile) => {
    const recordId = String(editor.dataset.fixedTileRecord || "");
    const ranges = serializedRangesFrom(editor);
    const changeGeneration = ++generation;
    latestGeneration = changeGeneration;
    const draft = cloneJson(getDocument());
    const change = installFixedTileValue(
      draft, recordId, ranges, slotIndex, tile,
    );
    onDraft({document: draft, recordId, ranges, change, editor, root});
    fixedTileState(editor, "正在保存…");
    void paint(editor);
    // 排队、等待与重试都归字段层那一条链（`core/project-db.js`）：这里只发一笔。
    return (async () => {
      try {
        assertSession();
        const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
        assertSession();
        const value = [...field.value];
        value[change.offset] = change.tile;
        await field.set(value, {selection: [{offset: change.offset, length: 1}]});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await onSaved({saved, recordId, ranges, change, editor, root});
        if (latestGeneration === changeGeneration && editor.isConnected) {
          fixedTileState(editor, "已保存");
          await paint(editor);
        }
      } catch (error) {
        if (latestGeneration === changeGeneration && editor.isConnected) {
          fixedTileState(
            editor, `保存失败：${error?.message || error}`, {invalid: true},
          );
        }
        throw error;
      }
    })();
  };

  root.addEventListener("click", event => {
    const slot = event.target.closest?.("[data-fixed-tile-slot]");
    if (slot) {
      const editor = slot.closest("[data-fixed-tile-editor]");
      editor.dataset.fixedTileActive = slot.dataset.fixedTileSlot;
      void paint(editor);
      return;
    }
  });
  const ready = Promise.all(editors.map(async editor => {
    const recordId = editor.dataset.fixedTileRecord, ranges = serializedRangesFrom(editor);
    const buttons = [...editor.querySelectorAll("[data-reset-to-original]")];
    buttons.forEach(button => {button.disabled = true;});
    const original = await repository.getOriginal(TEXT_RECORDS_RESOURCE_ID);
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    assertSession();
    editor.__fixedTileAllowed = (offset, tile) =>
      textRecordProtectedReplacementAllowed(original.value.document.records[recordId], offset, tile);
    const source = getDocument();
    editor.__fixedTileDocument = () => ({...source, records: {...source.records,
      [recordId]: {...source.records[recordId], bytes: field.value}}});
    field.bind(editor, element => { void paint(element); });
    bindFieldResetToOriginalButtons(editor, new Map([[editor.dataset.fixedTileEditor, field]]), {
      dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
        field.value.slice(offset, offset + length).some((value, index) =>
          value !== field.defaultValue[offset + index])) : field.hasOverride,
      beforeReset: async () => {
        // 待写的图块先进字段层那一条链，再按当时版本恢复 Origin。
        await flushAllAutoSaves();
        assertSession();
        return {expectedVersion: field.version, fieldOptions: {selection: ranges}};
      },
      afterReset: async () => {
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await onSaved({saved, recordId, ranges, editor, root, reset: true});
        await onReset({saved, recordId, ranges, editor, root});
        fixedTileState(editor, "已重置");
      },
      onError: error => fixedTileState(editor, `重置失败：${error?.message || error}`, {invalid: true}),
    });
    editor.dataset.fixedTileFieldsReady = "true";
  }));
  void ready.catch(error => showEditorError(root, "固定图块字段绑定失败", error));
  root.addEventListener("click", event => {
    const picker = event.target.closest?.("[data-fixed-tile-picker]");
    if (!picker) return;
    const editor = picker.closest("[data-fixed-tile-editor]");
    if (editor.dataset.fixedTileFieldsReady !== "true") return;
    const tile = pickerTileFromEvent(picker, event);
    if (tile === null) return;
    const {offsets} = fixedTileOffsets(editor.__fixedTileDocument(), editor.dataset.fixedTileRecord, serializedRangesFrom(editor));
    if (!editor.__fixedTileAllowed(offsets[Number(editor.dataset.fixedTileActive) || 0], tile)) {
      fixedTileState(
        editor,
        "这个图块未获准用于当前字段，请选择亮色图块",
        {invalid: true},
      );
      return;
    }
    void save(
      editor, Number(editor.dataset.fixedTileActive) || 0, tile,
    ).catch(error => showEditorError(
      editor, `固定图块 ${editor.dataset.fixedTileRecord} 写入失败`, error,
    ));
  });

  return Object.freeze({
    ready,
    paint: () => Promise.all(editors.map(paint)),
    flush: () => flushAllAutoSaves(),
  });
}
