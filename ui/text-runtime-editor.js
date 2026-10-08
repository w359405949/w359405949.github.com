// @editor-module 文本字段对象的控制码标记、键入与插入菜单。
import {db} from "../core/project-db.js";
import {editorLog} from "../core/editor-log.js";
import {bindTextInputEvents, esc} from "../core/dom.js";
import {resetToOriginalButton, applyResetToOriginalStates} from "./table.js";
import {
  editTextRecordFill, textRecordRuntimeTokens, TEXT_FILL_OPERANDS,
  TEXT_RECORDS_RESOURCE_ID, textFillDetails as detailsFor,
  TEXT_CONTROL_CODES, textControlMarker, textRecordEditorTokens,
} from "../core/text-record-project.js";

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const sample = (token, recordId) => detailsFor(token, recordId)?.[2] || "示例值";

function tokenMarkup(item, recordId) {
  if (item.kind === 'fill') {
    const [short, full, example] = detailsFor(item.token, recordId);
    return `<span class="text-runtime-token" title="${esc(`${full} · 示例：${example}`)}"><b>〔${esc(short)}〕</b>
      <small>$${hex(item.token)}${item.operands.map(value => ` $${hex(value)}`).join("")}</small>
      <button type="button" data-runtime-delete="${item.offset}" aria-label="删除 $${hex(item.token)} 填值码">删除</button></span>`;
  }
  return `<span class="text-runtime-character" title="${item.bytes.map(hex).join(" ")}">${esc(item.text)}</span>`;
}

function preview(record, tokens) {
  const tokenByOffset = new Map(tokens.map(item => [item.offset, item]));
  const structure = new Map(record.protected_ranges
    .filter(range => !Object.hasOwn(TEXT_FILL_OPERANDS, Number(range.token)))
    .map(range => [range.offset, range]));
  let result = "";
  for (let offset = 0; offset < record.capacity;) {
    const protectedRange = structure.get(offset);
    if (protectedRange) {
      if (protectedRange.token === 0xE5) result += "\n";
      offset += protectedRange.length;
      continue;
    }
    const item = tokenByOffset.get(offset);
    if (item) result += item.kind === "fill" ? sample(item.token, record.node_id) : item.text;
    offset += item?.bytes.length || 1;
  }
  return result.trim();
}

export function runtimeEditorMarkup(document_, recordId, encoding, {compact = false} = {}) {
  const record = document_?.records?.[recordId];
  if (!record?.editable) return "";
  let tokens;
  try {
    tokens = textRecordRuntimeTokens(record, encoding, document_);
  } catch (error) {
    return `<section class="text-runtime-editor warning">${esc(error.message)}</section>`;
  }
  const options = [...TEXT_CONTROL_CODES].map(([token, [label]]) => {
    return `<option value="${token}">${esc(detailsFor(token, recordId)?.[0] || label)} · $${hex(token)}</option>`;
  }).join("");
  return `<section class="text-runtime-editor" data-runtime-editor="${esc(recordId)}">
    <div class="section-line"><h3>控制码 · ${esc(recordId)}</h3><span>固定 ${record.capacity} B</span></div>
    <div class="text-runtime-token-list">${textRecordEditorTokens(record, encoding, document_).map(item => tokenMarkup(item, recordId)).join("")}</div>
    <div class="text-runtime-example"><b>示例值预览</b><pre>${esc(preview(record, tokens))}</pre></div>
    ${compact ? `<details><summary>插入控制码</summary>` : ""}<div class="text-runtime-controls"><label>插入位置<select data-runtime-position>
      ${tokens.map(item => `<option value="${item.offset}">${item.offset} · ${esc(item.kind === "fill" ? `$${hex(item.token)}` : item.text)}</option>`).join("")}</select></label>
      <label>控制码<select data-runtime-token>${options}</select></label>
      <label>参数（十六进制，空格分隔）<input data-runtime-operands value="" spellcheck="false" placeholder="按控制码所需参数填写"></label>
      <button type="button" data-runtime-insert>插入</button>
      ${compact ? "" : resetToOriginalButton(recordId, {title: "恢复当前文字记录", attributes: {'data-runtime-reset': ''}})}</div>${compact ? "</details>" : ""}
    <details class="text-runtime-legend"${compact ? "" : " open"}><summary>键入写法</summary><table><thead><tr><th>标记</th><th>控制码</th><th>参数</th></tr></thead><tbody>
      ${[...TEXT_CONTROL_CODES].map(([token, [, operands]]) => `<tr><td>${esc(textControlMarker(token,
        operands.map(() => 0), recordId))}</td><td>$${hex(token)}</td><td>${esc(operands.join('、'))}</td></tr>`).join('')}
      <tr><td>〔字节:AB CD〕</td><td>AB CD</td><td>原始字节</td></tr>
    </tbody></table></details>
    <small data-runtime-operand-hint></small><div data-runtime-state role="status" aria-live="polite"></div>
  </section>`;
}

export function bindRuntimeEditor(host, {getDocument, getEncoding, onSaved, beforeEdit = async () => {}, ranges = null, quiet = false}) {
  if (!host) return;
  const recordId = host.dataset.runtimeEditor;
  const status = host.querySelector("[data-runtime-state]");
  const tokenSelect = host.querySelector("[data-runtime-token]");
  const hint = host.querySelector("[data-runtime-operand-hint]");
  const updateHint = () => {
    const kinds = TEXT_CONTROL_CODES.get(Number(tokenSelect.value))[1];
    hint.textContent = kinds.length ? `需要 ${kinds.length} 个参数：${kinds.join("、")}` : "此控制码没有参数";
    host.querySelector("[data-runtime-operands]").title = hint.textContent;
  };
  tokenSelect.addEventListener("change", updateHint);
  updateHint();
  let busy = false;
  const resetButton = host.querySelector('[data-runtime-reset]');
  let resetField;
  const refreshReset = () => {
    if (resetButton && resetField) applyResetToOriginalStates(resetButton.parentElement,
      new Map([[recordId, resetField.hasOverride]]), {busy});
  };
  if (resetButton) void db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, 'bytes').then(field => {
    resetField = field;
    field.bind(resetButton, refreshReset);
  }).catch(error => {editorLog.error("字段编辑", `文本字段载入失败：${error.message || error}`, error);});
  host.addEventListener("click", async event => {
    const insert = event.target.closest("[data-runtime-insert]");
    const deletion = event.target.closest("[data-runtime-delete]");
    const reset = event.target.closest("[data-runtime-reset]");
    if (!insert && !deletion && !reset || busy) return;
    busy = true;
    refreshReset();
    status.textContent = "";
    try {
      await beforeEdit();
      const field = await db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (reset) {
        await field.reset({expectedVersion: field.version});
      } else {
        const document_ = getDocument();
        const current = {...document_, records: {...document_.records,
          [recordId]: {...document_.records[recordId], bytes: [...field.value]}}};
        const operandsText = host.querySelector("[data-runtime-operands]").value.trim();
        const operands = operandsText ? operandsText.split(/\s+/u).map(value =>
          /^[0-9a-f]{1,2}$/iu.test(value) ? Number.parseInt(value, 16) : -1) : [];
        const result = editTextRecordFill(current, recordId, getEncoding(), {
          action: insert ? "insert" : "delete",
          offset: Number(insert ? host.querySelector("[data-runtime-position]").value : deletion.dataset.runtimeDelete),
          token: Number(tokenSelect.value), operands,
        });
        if (ranges && result.bytes.some((value, offset) => value !== field.value[offset]
          && !ranges.some(range => offset >= range.offset && offset < range.offset + range.length))) {
          throw new TypeError("该字段没有足够的空白字节");
        }
        await db.writeFields([{field, value: result.bytes, selection: ranges || field.editableRanges}],
          {expectedVersion: field.version});
      }
      await db.readResource(TEXT_RECORDS_RESOURCE_ID);
      status.textContent = "";
      await onSaved();
    } catch (error) {
      editorLog.error("字段编辑", `文本修改失败：${error.message || error}`, error);
    } finally {
      busy = false;
      refreshReset();
    }
  });
}

export function inlineRuntimeEditorMarkup(document_, recordId, encoding, {ranges = null, editorId, label, mode = "capacity"} = {}) {
  const record = document_.records[recordId];
  const tokens = textRecordEditorTokens(record, encoding, document_).filter(item =>
    !ranges || ranges.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length));
  const parts = [];
  let run = [];
  const finish = () => {
    if (!run.length) return;
    const offset = run[0].offset;
    const length = run.at(-1).offset + run.at(-1).bytes.length - offset;
    const visible = [...run];
    while (visible.at(-1)?.kind === 'padding') visible.pop();
    const text = visible.map(item => item.text).join('');
    parts.push(`<span contenteditable="plaintext-only" data-runtime-plain
      data-runtime-ranges="${esc(JSON.stringify([{offset, length}]))}" role="textbox"
      aria-label="${esc(label)}" spellcheck="false">${esc(text || "\u200B")}</span>`);
    run = [];
  };
  for (const item of tokens) {
    if (item.kind === "protected") {
      finish();
      parts.push(`<span class="text-runtime-inline-token" contenteditable="false"
        title="${esc(item.bytes.map(hex).join(' '))}">${esc(item.text)}</span>`);
    } else if (item.kind === 'fill') {
      finish();
      const [, full, example] = detailsFor(item.token, recordId);
      parts.push(`<span class="text-runtime-inline-token" title="${esc(`${full} · 示例：${example}`)}"><span
        contenteditable="plaintext-only" data-runtime-plain role="textbox" aria-label="${esc(label)}" spellcheck="false"
        data-runtime-ranges="${esc(JSON.stringify([{offset: item.offset, length: item.bytes.length}]))}">${esc(item.text)}</span><button type="button"
        data-runtime-delete="${item.offset}" aria-label="删除 ${esc(item.text)} 填值码">×</button></span>`);
    } else {
      if (run.length && run.at(-1).offset + run.at(-1).bytes.length !== item.offset) finish();
      run.push(item);
    }
  }
  finish();
  return `<div class="fixed-text-runtime-input" data-runtime-inline="${esc(recordId)}"
    data-runtime-editor-id="${esc(editorId)}" data-runtime-mode="${esc(mode)}" aria-label="${esc(label)}"
    title="键入：〔换行〕、〔等待〕、〔分页〕、〔名〕；参数：〔等帧:10〕；字节：〔字节:AB CD〕">${parts.join("")}</div>`;
}

const inlineBindings = new WeakMap();

export function bindInlineRuntimeEditors(root, options) {
  if (!root.isConnected) return;
  const document_ = root.ownerDocument;
  const content = document_.querySelector("#content") || root;
  const fields = root.querySelectorAll("[data-runtime-inline]");
  if (!fields.length) return;
  let panel = content.querySelector("[data-runtime-page-panel]");
  if (!panel) {
    panel = document_.createElement("details");
    panel.className = "text-runtime-page-panel";
    panel.dataset.runtimePagePanel = "";
    content.append(panel);
  }
  const selectField = input => {
    panel.runtimeTarget = input;
    const binding = inlineBindings.get(input);
    if (!binding) return;
    const owner = input.closest("[data-fixed-text-editor]");
    const recordId = input.dataset.runtimeInline;
    const template = document_.createElement("template");
    template.innerHTML = runtimeEditorMarkup(binding.getDocument(), recordId, binding.getEncoding());
    const source = template.content.querySelector("[data-runtime-editor]");
    const controls = source.querySelector(".text-runtime-controls");
    controls.querySelector("[data-runtime-reset]").remove();
    const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
    if (ranges) for (const option of controls.querySelector("[data-runtime-position]").options) {
      if (!ranges.some(range => Number(option.value) >= range.offset
        && Number(option.value) < range.offset + range.length)) option.remove();
    }
    const record = binding.getDocument().records[recordId];
    const tokens = textRecordRuntimeTokens(record, binding.getEncoding(), binding.getDocument())
      .filter(item => !ranges || ranges.some(range => item.offset >= range.offset
        && item.offset + item.bytes.length <= range.offset + range.length));
    const example = ranges ? tokens.map(item => item.kind === "fill"
      ? sample(item.token, recordId) : item.text).join("").trimEnd() : preview(record, tokens);
    const targets = [...content.querySelectorAll("[data-runtime-inline]")];
    panel.innerHTML = `<summary>插入控制码</summary><section data-runtime-editor="${esc(recordId)}">
      <label>文字<select data-runtime-target>${targets.map((target, index) => `<option value="${index}"${target === input ? " selected" : ""}>${esc(target.dataset.runtimeEditorId)}</option>`).join("")}</select></label>
      <div class="text-runtime-example"><pre>${esc(example)}</pre></div>
      ${controls.outerHTML}${source.querySelector(".text-runtime-legend").outerHTML}
      <small data-runtime-operand-hint hidden></small><div data-runtime-state role="status"></div></section>`;
    panel.querySelector(".text-runtime-legend").removeAttribute("open");
    panel.querySelector("[data-runtime-target]").addEventListener("change", event =>
      selectField(targets[Number(event.target.value)]));
    bindRuntimeEditor(panel.querySelector("[data-runtime-editor]"), {...binding, ranges, quiet: true});
  };
  for (const input of fields) {
    const previous = inlineBindings.get(input);
    inlineBindings.set(input, options);
    const owner = input.closest("[data-fixed-text-editor]");
    if (options.resetRecordId === input.dataset.runtimeInline || !input.contains(document_.activeElement)
        || !document_.activeElement.matches("[data-runtime-plain]")) {
      const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
      const template = document_.createElement("template");
      template.innerHTML = inlineRuntimeEditorMarkup(options.getDocument(), input.dataset.runtimeInline,
        options.getEncoding(), {ranges, editorId: input.dataset.runtimeEditorId,
          label: input.getAttribute("aria-label"), mode: input.dataset.runtimeMode});
      input.innerHTML = template.content.firstElementChild.innerHTML;
      input.title = template.content.firstElementChild.title;
    }
    if (previous) continue;
    input.addEventListener("focusin", () => selectField(input));
    bindTextInputEvents(input, {selector: '[data-runtime-plain]',
      onInput: event => editPlain(event.target)});
    const editPlain = segment => {
      if (!segment.matches("[data-runtime-plain]")) return;
      inlineBindings.get(input).onInput({
        dataset: {fixedTextInput: input.dataset.runtimeEditorId,
          fixedTextRecord: input.dataset.runtimeInline,
          fixedTextRanges: segment.dataset.runtimeRanges, fixedTextMode: input.dataset.runtimeMode},
        value: segment.textContent.replaceAll("\u200B", ""),
        runtimeSegment: segment, setAttribute: (key, value) => input.setAttribute(key, value),
      });
    };
    input.addEventListener("click", event => {
      const deletion = event.target.closest("[data-runtime-delete]");
      if (!deletion) {
        if (event.target === input) input.querySelector("[data-runtime-plain]")?.focus();
        return;
      }
      selectField(input);
      const action = deletion.cloneNode(true);
      action.hidden = true;
      panel.querySelector("[data-runtime-editor]").append(action);
      action.click();
    });
  }
  selectField(panel.runtimeTarget?.isConnected ? panel.runtimeTarget : fields[0]);
}
