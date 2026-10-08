// @editor-module text-record 的共用定长文字组件
//
// 页面只声明要编辑哪条稳定 record ID。本组件统一负责 Unicode 输入、按完整
// 字符截断、空字节补齐、保护结构命令与固定图块、延迟写入 working 层及单条还原；剧情、
// 游戏 UI 等消费者不再各写一套 text-record 保存循环。exact 模式拒绝任何字节数
// 变化；readonly 模式只投影同一条记录，不创建输入或保存入口。

import {flushAllAutoSaves, hasPendingAutoSaves} from "../core/auto-save.js";
import {showEditorError} from "./editor-error.js";
import {bindTextInputEvents, esc} from "../core/dom.js";
import {
  requireBrowserProjectRepository,
} from "../core/project-data.js";
import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {bindInlineRuntimeEditors, inlineRuntimeEditorMarkup} from "./text-runtime-editor.js";
import {bindFieldResetToOriginalButtons, resetToOriginalButton} from "./table.js";
import {
  decodeFixedTextRecord,
  decodeFixedTextRecordSelection,
  exactFixedTextRecordBytes,
  fixedTextRecordBytes,
  installEncodedTextRecord,
  textRecord,
  textRecordEditorBytes,
  textRecordEditorText,
  textRecordEditorSelection,
  textRecordEditorTokens,
  textRecordRuntimeWritableRanges,
  TEXT_RECORDS_RESOURCE_ID,
} from "../core/text-record-project.js";

const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const boundRoots = new WeakMap();
const liveControllers = new Set();

export async function flushFixedTextEditors() {
  for (const reference of liveControllers) {
    const controller = reference.deref();
    if (!controller) {
      liveControllers.delete(reference);
      continue;
    }
    if (controller.error) throw new Error(controller.error);
    await controller.flush();
  }
}

export function fixedTextFieldInputMarkup({value, label, maxLength = null,
  className = '', attributes = ''} = {}) {
  return `<input${className ? ` class="${esc(className)}"` : ''} type="text"
    value="${esc(value)}" aria-label="${esc(label)}" aria-invalid="false"
    autocomplete="off" spellcheck="false"${
      maxLength === null ? '' : ` maxlength="${esc(maxLength)}"`} ${attributes}>`;
}

function fixedTextInput(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-input="${CSS.escape(String(editorId || ""))}"], [data-runtime-editor-id="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function fixedTextState(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-save-state="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function sayFixedTextState(root, editorId, message, {invalid = false} = {}) {
  const input = fixedTextInput(root, editorId);
  if (input) {
    input.setAttribute("aria-invalid", String(invalid));
    input.setCustomValidity?.(invalid ? message : "");
  }
  const status = fixedTextState(root, editorId);
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("invalid", invalid);
  }
}

function fixedTextResultMessage(result) {
  if (result?.truncated_characters) {
    return `已按容量截断 ${result.truncated_characters} 个字`;
  }
  if (result?.padded_bytes) {
    return `剩余 ${result.padded_bytes} B 已自动补空`;
  }
  return "";
}

/** Unicode projection for plain-text consumers (titles, filters and options). */
export function fixedTextRecordText(recordId, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = document_?.records?.[recordId];
  if (!record || !encoding) return "";
  return decodeFixedTextRecord(record, encoding).text;
}

/** 画面文字片段包含其后同一可写区间的补空字节。 */
export function fixedTextRecordRangesWithPadding(recordId, ranges, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = textRecord(document_, recordId);
  const paddingEnds = new Map();
  for (const token of textRecordEditorTokens(record, encoding, document_).reverse()) {
    if (token.kind !== 'padding') continue;
    const end = token.offset + token.bytes.length;
    paddingEnds.set(token.offset, paddingEnds.get(end) ?? end);
  }
  const writable = textRecordRuntimeWritableRanges(record);
  return ranges.map(({offset, length}) => {
    const span = writable.find(span => offset >= span.offset && offset + length <= span.offset + span.length);
    const end = Math.min(paddingEnds.get(offset + length) ?? offset + length,
      span ? span.offset + span.length : offset + length);
    return {offset, length: end - offset};
  });
}

/** 生成一条固定容量文字输入；内容始终从 text-record 当前文档现场解码。 */
export function fixedTextEditorMarkup({
  recordId,
  editorId = recordId,
  ranges = null,
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
  label = "字段名",
  description = "",
  className = "",
  mode = "capacity",
  compact = false,
  readonly = false,
  reset = true,
  resetOnly = false,
  runtime = true,
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let record = null;
  let decoded = null;
  let failure = "";
  try {
    record = document_ ? textRecord(document_, id) : null;
    if (!record) failure = "当前项目没有这条定长文字记录。";
    else if (!encoding) failure = "当前项目没有可用字符映射。";
    else decoded = ranges === null || ranges === undefined
      ? decodeFixedTextRecord(record, encoding)
      : runtime ? textRecordEditorSelection(record, encoding, document_, ranges)
        : decodeFixedTextRecordSelection(record, encoding, ranges);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const capacity = Number(
    decoded?.editable_byte_capacity ?? record?.editable_byte_capacity,
  ) || 0;
  const editable = Boolean(!readonly && record?.editable && decoded && capacity > 0 && !failure);
  const reason = editable
    ? mode === "exact"
      ? `定长替换必须保持 ${capacity} 个编码字节；不足或超出均拒绝保存。`
      : runtime ? `固定容量；不足自动补空，超出拒绝写入，结构命令和固定图块保持原位。`
        : `固定 ${capacity} 个文字字节；不足自动补空，超出按完整字符截断，结构命令和固定图块保持原位。`
    : failure || record?.readonly_reason || "这条记录不可逐字编辑。";
  if (readonly || !editable) {
    return `<span class="fixed-text-readonly" data-fixed-text-record="${esc(id)}"
      data-fixed-text-runtime="${runtime}"
      data-fixed-text-ranges="${esc(ranges ? JSON.stringify(ranges) : "")}"
      title="${esc(readonly ? description : reason)}">${esc(record && encoding && !ranges
        ? textRecordEditorText(record, encoding, document_) : decoded?.text || "—")}</span>`;
  }
  const serializedRanges = ranges === null || ranges === undefined
    ? "" : JSON.stringify(ranges);
  return `<div class="fixed-text-editor${compact ? " fixed-text-editor--compact" : ""}${className ? ` ${esc(className)}` : ""}"
    data-fixed-text-editor="${esc(editor)}"
    data-fixed-text-runtime="${runtime}"
    data-fixed-text-record="${esc(id)}"
    data-fixed-text-ranges="${esc(serializedRanges)}">
    ${resetOnly ? "" : `<label class="fixed-text-editor-field" title="${esc(description || reason)}">
      ${compact ? "" : `<span><b>${esc(label)}</b><small>${esc(id)}</small></span>`}
      ${runtime ? inlineRuntimeEditorMarkup(document_, id, encoding, {ranges, editorId: editor, label, mode}) : fixedTextFieldInputMarkup({value: decoded?.text || '', label,
        attributes: `data-fixed-text-input="${esc(editor)}"
          data-fixed-text-record="${esc(id)}"
          data-fixed-text-ranges="${esc(serializedRanges)}"
          data-fixed-text-mode="${esc(mode)}"${editable ? '' : ' disabled'}`})}
    </label>`}
    <div class="fixed-text-editor-actions">
      ${resetOnly ? "" : `<span data-fixed-text-save-state="${esc(editor)}" aria-live="polite" hidden></span>`}
      ${reset ? resetToOriginalButton(editor, {
        title: serializedRanges
          ? "只把这个字段恢复到 Original；同一条记录的其他字段保留"
          : "把这条文字恢复到 Original；同一资源里的其他编辑保留",
        disabled: !editable,
      }) : ""}
    </div>
  </div>`;
}

/**
 * 绑定一个根节点下的全部固定文字输入。回调只处理页面自己的投影/重绘；编码、
 * 校验与还原由本组件拥有，写入的等待、排队与失败记账归字段层的自动写入链。
 */
export function bindFixedTextEditors(root, {
  database = db,
  reuse = null,
  getDocument = () => state.project?.text_record_edits || null,
  getEncoding = () => state.project?.text_record_encoding || null,
  getRepository = () => requireBrowserProjectRepository(state),
  onDraft = () => {},
  onSaved = null,
  onReset = async () => {},
  onState = () => {},
} = {}) {
  if (!root) return null;
  if (boundRoots.has(root)) {
    const controller = boundRoots.get(root);
    controller.refreshBindings();
    return controller;
  }
  if (reuse?.rebind(root)) return reuse;
  const project = state.project;
  const repository = getRepository();
  const revision = state.browserProjectManifest?.active_original_revision_id;
  const sessionMatches = () => state.project === project &&
    state.projectRepository === repository &&
    state.browserProjectManifest?.active_original_revision_id === revision;
  const notifySaved = async event => {
    if (sessionMatches()) {
      project.text_record_edits = event.saved.value.document;
      project.text_record_dirty = Boolean(event.saved.dirty);
    }
    if (onSaved) await onSaved(event);
    refreshRuntimeEditors({resetRecordId: event.reset ? event.recordId : null});
  };
  const refreshRuntimeEditors = ({resetRecordId = null} = {}) => bindInlineRuntimeEditors(root, {
    getDocument, getEncoding, resetRecordId,
    beforeEdit: async () => {
      await flush();
      if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    },
    onSaved: async () => {
      const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
      await notifySaved({saved, changes: [], root});
    },
    onInput: handleInput,
  });
  let generation = 0;
  const latest = new Map();
  const pending = new Map();
  const invalid = new Map();
  const saving = new Map();

  const queue = (editorId, recordId, ranges, result) => {
    const changeGeneration = ++generation;
    latest.set(editorId, changeGeneration);
    pending.set(editorId, {
      editorId,
      recordId,
      ranges,
      bytes: result.bytes.slice(),
      result,
      generation: changeGeneration,
    });
    onState();
    // 等待防抖、排队与正在提交都归字段层那一条链（`core/project-db.js`）：
    // 这一笔不进任何自建计时器，改动立即排进去，状态栏从同一份记账读。
    void flush().catch(error => showEditorError(root, "定长文字自动写入失败", error));
  };

  const flush = async () => {
    const changes = [...pending.values()].sort(
      (left, right) => left.generation - right.generation,
    );
    if (!changes.length) {
      // 只有还在字段层链上的写入：等它落定，好让调用方看到落盘后的值。
      if (hasPendingAutoSaves()) await flushAllAutoSaves();
      return;
    }
    for (const change of changes) saving.set(change.editorId, change);
    await (async () => {
      try {
        if (state.browserProjectManifest?.active_original_revision_id !== revision ||
            state.projectRepository !== repository) {
          throw new Error("项目会话已切换，请重新打开文字编辑器");
        }
        const grouped = new Map();
        for (const change of changes) {
          const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, change.recordId, "bytes");
          let entry = grouped.get(field);
          if (!entry) grouped.set(field, entry = {field, value: [...field.value], indices: new Set()});
          const ranges = change.ranges || field.editableRanges;
          for (const range of ranges) for (let offset = range.offset; offset < range.offset + range.length; offset++) {
            entry.value[offset] = change.bytes[offset];
            entry.indices.add(offset);
          }
        }
        const writes = [...grouped.values()].map(({field, value, indices}) => {
          const selection = [];
          for (const offset of [...indices].sort((a, b) => a - b)) {
            const last = selection.at(-1);
            if (last && last.offset + last.length === offset) last.length++;
            else selection.push({offset, length: 1});
          }
          return {field, value, selection};
        });
        await database.writeFields(writes, {expectedVersion: writes[0].field.version});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await notifySaved({saved, changes, root});
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              root.querySelector("[data-runtime-inline]") ? "" : fixedTextResultMessage(change.result),
            );
          }
        }
      } catch (error) {
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              `保存失败：${error?.message || error}`,
              {invalid: true},
            );
          }
        }
        throw error;
      } finally {
        for (const change of changes) {
          // 这一笔落定才把同代次的待写清掉：更新的一笔仍留着，写的是更全的值。
          if (latest.get(change.editorId) === change.generation) pending.delete(change.editorId);
          if (saving.get(change.editorId) === change) saving.delete(change.editorId);
        }
        onState();
      }
    })();
  };

  const handleInput = input => {
    if (input.disabled || input.readOnly) return;
    const editorId = String(input?.dataset.fixedTextInput || "");
    const recordId = String(input?.dataset.fixedTextRecord || "");
    const ranges = input?.dataset.fixedTextRanges
      ? JSON.parse(input.dataset.fixedTextRanges) : null;
    const source = getDocument();
    const encoding = getEncoding();
    if (!editorId || !recordId || !source || !encoding) return;
    const document_ = cloneJson(source);
    let result;
    try {
      const encode = input.dataset.fixedTextMode === "exact"
        ? exactFixedTextRecordBytes : fixedTextRecordBytes;
      result = input.runtimeSegment ? textRecordEditorBytes(document_, recordId, input.value,
        encoding, ranges, {exact: input.dataset.fixedTextMode === 'exact'}) : encode(
        document_, recordId, input.value, encoding, ranges,
      );
    } catch (error) {
      result = {ok: false, reason: `不能编码：${error?.message || error}`};
    }
    if (!result.ok) {
      const suffix = result.unsupported?.length
        ? `：${result.unsupported.join(" ")}` : "";
      const reason = `${result.reason}${suffix}`;
      invalid.set(editorId, {recordId, ranges, reason});
      pending.delete(editorId);
      latest.set(editorId, ++generation);
      sayFixedTextState(root, editorId, reason, {invalid: true});
      onState();
      return;
    }
    invalid.delete(editorId);
    installEncodedTextRecord(document_, result);
    input.value = result.text;
    if (input.runtimeSegment && result.truncated_characters) input.runtimeSegment.textContent = result.text || "\u200B";
    input.setAttribute("aria-invalid", "false");
    onDraft({
      document: document_, result, editorId, recordId, ranges, input, root,
    });
    sayFixedTextState(root, editorId, input.runtimeSegment ? "" : fixedTextResultMessage(result));
    queue(editorId, recordId, ranges, result);
  };

  // 身份读容器：`.fixed-text-editor` 上本来就有 editor / record / ranges，
  // 共用按钮只带 itemId，不再重复挂一份。
  const prepareReset = async (recordId, ranges) => {
    const matches = change => change.recordId === recordId &&
      (ranges === null || change.ranges?.every(range => ranges.some(selection =>
        range.offset >= selection.offset && range.offset + range.length <= selection.offset + selection.length)));
    for (const [id, change] of pending) if (matches(change)) pending.delete(id);
    for (const [id, change] of invalid) if (matches(change)) invalid.delete(id);
    for (const input of root.querySelectorAll("[data-fixed-text-input]")) {
      const inputRanges = input.dataset.fixedTextRanges ? JSON.parse(input.dataset.fixedTextRanges) : null;
      if (matches({recordId: input.dataset.fixedTextRecord, ranges: inputRanges})) input.__fieldResetPending = true;
    }
    await flush();
    if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    return {field, expectedVersion: field.version, fieldOptions: {selection: ranges}, recordId, ranges};
  };
  const finishReset = async ({recordId, ranges}) => {
    const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
    await notifySaved({saved, changes: [], root, reset: true, recordId, ranges});
    onState();
    return saved;
  };
  const resetRecord = async (recordId, ranges = null) => {
    const context = await prepareReset(recordId, ranges);
    await context.field.reset({...context.fieldOptions, expectedVersion: context.expectedVersion});
    return finishReset(context);
  };
  const boundFields = new WeakSet();
  let ready = Promise.resolve();
  const bindFields = async () => {
    const hosts = root.querySelectorAll("[data-fixed-text-record]");
    for (const host of hosts) {
      if (boundFields.has(host)) continue;
      boundFields.add(host);
      const recordId = host.dataset.fixedTextRecord;
      const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (!host.isConnected || !sessionMatches()) continue;
      const ranges = host.dataset.fixedTextRanges ? JSON.parse(host.dataset.fixedTextRanges) : null;
      const editorId = host.dataset.fixedTextInput || host.dataset.fixedTextEditor;
      let previousText;
      field.bind(host, (element, bytes) => {
        const record = {...textRecord(getDocument(), recordId), bytes};
        const decoded = ranges
          ? host.dataset.fixedTextRuntime === 'true'
            ? textRecordEditorSelection(record, getEncoding(), getDocument(), ranges)
            : decodeFixedTextRecordSelection(record, getEncoding(), ranges)
          : decodeFixedTextRecord(record, getEncoding());
        if (element.matches("[data-fixed-text-input]")) {
          if (element.__fieldResetPending || (!pending.has(editorId) && !saving.has(editorId) && !invalid.has(editorId)
              && (previousText === undefined || element.value === previousText))) element.value = decoded.text;
          delete element.__fieldResetPending;
        } else if (element.matches(".fixed-text-readonly")) element.textContent = decoded.text || "—";
        previousText = decoded.text;
      });
      if (host.matches("[data-fixed-text-editor]")) bindFieldResetToOriginalButtons(host,
        new Map([[editorId, field]]), {
          dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
            field.value.slice(offset, offset + length).some((value, index) =>
              value !== field.defaultValue[offset + index])) : field.hasOverride,
          beforeReset: () => prepareReset(recordId, ranges),
          afterReset: async (_field, context) => {
            const saved = await finishReset(context);
            await onReset({saved, editorId, recordId, ranges, root});
            sayFixedTextState(root, editorId, "");
          },
          onError: error => sayFixedTextState(root, editorId, `还原失败：${error?.message || error}`, {invalid: true}),
        });
    }
  };

  const refreshBindings = () => {
    refreshRuntimeEditors();
    ready = bindFields();
    void ready.catch(error => showEditorError(root, "文字字段绑定失败", error));
    return ready;
  };

  const bindRoot = () => {
    bindTextInputEvents(root, {selector: '[data-fixed-text-input]', onInput: event => {
      if (event.composedPath().find(node => boundRoots.has(node)) !== root) return;
      const input = event.target.closest?.("[data-fixed-text-input]");
      if (input) handleInput(input);
    }});
    refreshBindings();
  };

  const controller = Object.freeze({
    // A list/detail rerender replaces the form, not the pending text edit.
    // Keep its queue and validation so a later invalid input cancels the same
    // pending record. Never transfer a controller between project sessions.
    rebind(nextRoot) {
      if (root.isConnected || !sessionMatches()) return false;
      boundRoots.delete(root);
      root = nextRoot;
      boundRoots.set(root, controller);
      bindRoot();
      return true;
    },
    // 落定这一页的待写：字段层的链没有自建计时器，直接等它跑完。
    flush,
    resetRecord,
    prepareReset,
    finishReset,
    refreshBindings,
    get ready() { return ready; },
    isDirty(recordId) {
      return [...pending.values(), ...saving.values(), ...invalid.values()]
        .some(change => change.recordId === recordId);
    },
    get error() { return invalid.values().next().value?.reason || ""; },
    get dirtyCount() {
      return new Set([...pending.values(), ...saving.values(), ...invalid.values()]
        .map(change => change.recordId)).size;
    },
    get pending() { return pending.size > 0 || saving.size > 0; },
  });
  boundRoots.set(root, controller);
  liveControllers.add(new WeakRef(controller));
  bindRoot();
  return controller;
}
