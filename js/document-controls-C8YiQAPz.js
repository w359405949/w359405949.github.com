import { registerModuleComponent, currentTextReference, textRecordDisplayText, esc, prepareModuleComponent, renderModuleComponent, hydrateModuleComponents } from './interface-state-preview-Dlotqlmn.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup, referencePickerMarkup, bindReferencePicker } from './timeline-player-YCH7Y-3h.js';
import { db, appendInterfaceStateProgramSegment, appendApplicationProgramChoice } from './prg-loaders-DnCSmXk9.js';
import { handleTextMarkup } from './record-6_wsSDi2.js';
import { loadCurrentTextRecordDisplays, textClassLabels, textCatalogDocument } from './charset-j6-kYKbE.js';
import './visual-metasprites-IDA0o2Z8.js';
import './emulator-Bpa8EsFw.js';
import './baseline-assembly-DW8BWbDB.js';
import './editor-renderer-n2nBwXk_.js';
import './battle-result-script-runtime-BSeJpUGH.js';
import './preview-sound-CiEAOXPD.js';
import './element-tree-C1bWRgTl.js';
import './overview-BWR5QCHz.js';
import './page-package-inputs-Dzxj7YGf.js';
import './ui-construction-preview-BuoQ5mM6.js';
import './configuration-summary-m9SZR_6_.js';
import './page-runtime-paths-BvtuMnH7.js';
import './physical-field-object-windows-DnQmS3eb.js';
import './battle-result-state-machine-BbK2hSud.js';
import './global-random-DAuRNoyj.js';
import './configuration-table-FR1xSC8W.js';

// @editor-module 文本记录 owner 的可嵌入当前值预览

const TEXT_RECORDS_MODULE_ID = "text-record";

function textRecordHandle(handle, value) {
  const reference = String(handle || value || "").trim();
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(reference)) return reference;
  const script = /^ui-script:([0-9a-f]{2}):([0-9]{3})$/iu.exec(reference);
  return script ? `record:${script[1].toUpperCase()}:${script[2]}` : "";
}

function textRecordPreviewMarkup({
  handle = "",
  value = "",
  compact = true,
  componentAttributes = "",
  displayText = undefined,
} = {}) {
  const record = textRecordHandle(handle, value);
  return `<span class="text-module-preview" ${componentAttributes}>
    <span class="text-module-preview-value" ${displayText === undefined ? `data-current-text-record="${esc(record)}"` : ''}
      data-compact="${compact ? "1" : "0"}"
      data-empty-label="${record ? "没有可直接显示的静态文字" : "文本句柄未解析"}">
      ${displayText === undefined ? '<span class="resource-empty">正在读取当前文字…</span>' : esc(displayText)}
    </span>
    <small class="mono">${handleTextMarkup(record || handle || value || "—")}</small>
  </span>`;
}

function textRecordIdentity(entry) {
  const nodeId = String(entry?.node_id || "");
  return /^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(nodeId) ? nodeId : "";
}

function textRecordRegion(entry) {
  const value = String(entry?.region_hex || entry?.region_id_hex || "").toUpperCase();
  if (/^[0-9A-F]{2}$/u.test(value)) return value;
  const region = Number(entry?.region_id);
  return Number.isInteger(region) && region >= 0 && region <= 0xff
    ? region.toString(16).toUpperCase().padStart(2, "0") : "??";
}

function textRecordNumber(entry) {
  const direct = Number(entry?.record ?? entry?.id);
  if (Number.isInteger(direct) && direct >= 0 && direct <= 999) {
    return String(direct).padStart(3, "0");
  }
  return textRecordIdentity(entry).split(":").at(-1) || "???";
}

function textRecordKind(entry) {
  const kind = String(entry?.text_classification?.kind || "control");
  return textClassLabels[kind] || kind;
}

function textRecordName(entry) {
  return currentTextReference(entry?.node_id).label || textRecordDisplayText(entry)
    || String(entry?.known_label || entry?.region_name || "没有可直接显示的静态文字");
}

function textRecordMeta(entry) {
  const capacity = Number(entry?.capacity ?? entry?.length ?? entry?.bytes?.length);
  const glyphs = Number(entry?.glyph_tokens);
  return [
    Number.isInteger(capacity) ? `${capacity} B` : "",
    Number.isInteger(glyphs) ? `${glyphs} 字形` : "",
  ].filter(Boolean).join(" · ");
}

function textRecordReferenceItem(entry) {
  const handle = textRecordIdentity(entry);
  if (!handle) return null;
  const region = textRecordRegion(entry);
  const record = textRecordNumber(entry);
  const name = textRecordName(entry);
  const kind = textRecordKind(entry);
  const regionName = String(entry?.region_name || `文本区 ${region}`);
  const meta = textRecordMeta(entry);
  return {
    value: handle,
    compactLabel: `${handle} · ${name}`,
    group: region,
    groupLabel: regionName,
    label: name,
    description: `${regionName} · ${kind}`,
    meta: `${handle} · ${meta}`,
    preview: textRecordPreviewMarkup({handle}),
    filter: [handle, `ui-script:${region}:${record}`, region, record,
      name, regionName, kind, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareTextReferenceComponent(props) {
  try {
    const documentValue = await textCatalogDocument();
    const entries = documentValue?.records;
    if (!Array.isArray(entries)) {
      throw new TypeError("project.text-catalog 缺少 records 候选表");
    }
    const requested = textRecordHandle(props.handle, props.value);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => textRecordIdentity(entry) === requested) || null,
      error: entries.length ? "" : "text-record 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function textRecordReferencePickerMarkup({
  entries = db.peekDocument('project.text-catalog', null)?.records || [],
  value = null,
  label = "文本记录",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  regionId = null,
  picker = {},
} = {}) {
  const regional = Number.isInteger(regionId);
  const region = regional ? regionId.toString(16).toUpperCase().padStart(2, "0") : null;
  return referenceFieldPickerMarkup({
    reference: {module: TEXT_RECORDS_MODULE_ID},
    picker,
    rows: regional ? entries.filter(entry => textRecordIdentity(entry).startsWith(`record:${region}:`)) : entries,
    value: regional ? `record:${region}:${Number(value).toString().padStart(3, "0")}`
      : textRecordHandle("", value) || value,
    candidateControlValue: regional ? (_key, entry) =>
      Number(textRecordIdentity(entry).split(":").at(-1)) : null,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(TEXT_RECORDS_MODULE_ID, {
  item: textRecordReferenceItem,
  paint: loadCurrentTextRecordDisplays,
  className: "text-record-reference-field",
  filterLabel: "过滤文本记录",
  filterPlaceholder: "句柄／文本区／当前文字／类别",
});

registerModuleComponent(TEXT_RECORDS_MODULE_ID, "reference", {
  prepare: prepareTextReferenceComponent,
  render: textRecordReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(TEXT_RECORDS_MODULE_ID, kind, {
    render: textRecordPreviewMarkup,
    hydrate: loadCurrentTextRecordDisplays,
  });
}

// @editor-module 状态机文档控件只编辑应用程序的既有语义。

const operandLabel = (instruction, index) => instruction.opcode === 0xD4
  ? ['选项正文', '选择布局'][index] : instruction.opcode === 0xCB ? '正文来源槽'
    : instruction.opcode === 0xF7 && index === 0 ? '输入模式' : `参数 ${index + 1}`;
const instructionLabel = instruction => instruction.kind === 'text' ? '正文'
  : instruction.kind === 'native-call' ? instruction.handler : instruction.kind === 'indexed-branches' ? '选项去向'
    : ({209: '跳转', 212: '选择', 247: '选择输入', 254: '返回', 203: '正文来源'})[instruction.opcode]
      || `指令 ${instruction.opcode.toString(16).toUpperCase()}`;

async function mountInterfaceStateDocumentControls(host, object, {segmentId = null,
  onChange = () => {}, beforeEdit = () => {}} = {}) {
  const document = object.value;
  const program = document.program;
  const error = failure => {
    const message = host.querySelector('[data-state-document-error]');
    if (message) {message.hidden = false; message.textContent = failure.message;}
  };
  let editing = false;
  const edit = async change => {
    if (editing) return;
    editing = true;
    const controls = [...host.querySelectorAll('input, select, button')];
    controls.forEach(control => {control.disabled = true;});
    try {beforeEdit(); await object.edit(change); await onChange();}
    catch (failure) {error(failure);}
    finally {editing = false; controls.forEach(control => {control.disabled = false;});}
  };
  const segment = program?.segments.find(row => row.id === segmentId);
  if (!segment) {
    host.innerHTML = `<label>标题 <input data-state-document-title value="${esc(document.title)}"></label>
      <p>${esc(document.source?.id || (program ? '新应用程序' : '空文档'))}</p>
      ${program ? '<button class="button" data-state-add-segment>新增段</button>' : ''}
      ${program && (!document.source || document.source.entry.commandId >= 0x39)
        && !program.segments.some(segment => segment.instructions.some(row => row.kind === 'native-call'))
        ? '<button class="button" data-state-add-choice>新增选择</button>' : ''}
      <p data-state-document-error role="alert" hidden></p>`;
    host.querySelector('[data-state-document-title]').addEventListener('change', event =>
      edit(current => {current.title = event.target.value; return current;}));
    host.querySelector('[data-state-add-segment]')?.addEventListener('click', () => edit(appendInterfaceStateProgramSegment));
    host.querySelector('[data-state-add-choice]')?.addEventListener('click', () => edit(current => {
      appendApplicationProgramChoice(current.program); return current;
    }));
    return;
  }
  const choices = program.segments.map(row => ({value: row.id, label: row.id.split(':').at(-1)}));
  const destination = (value, path) => `<select data-state-destination="${esc(JSON.stringify(path))}">
    ${choices.map(row => `<option value="${esc(row.value)}"${value.target === row.value ? ' selected' : ''}>段 ${esc(row.label)}</option>`).join('')}
    ${value.kind === 'end' ? [254, 255].map(end => `<option value="${end}"${value.value === end ? ' selected' : ''}>返回 ${end}</option>`).join('') : ''}
    </select>`;
  const texts = await prepareModuleComponent('text-record', 'reference');
  if (!host.isConnected) return;
  if (texts.error) throw new Error(texts.error);
  const records = texts.entries.filter(row => /^record:06:[0-9]{3}$/u.test(row.node_id)
    && Number(row.node_id.slice(-3)) <= 0x8E).map(row => ({
      handle: `text-record:06:${Number(row.node_id.slice(-3)).toString(16).toUpperCase().padStart(3, '0')}`,
      record: row.node_id, label: currentTextReference(row.node_id).label || row.node_id,
    }));
  host.innerHTML = `<div class="screen-workbench-stage-toolbar">
      <button class="button" data-state-move-segment="-1">↑</button>
      <button class="button" data-state-move-segment="1">↓</button>
      <button class="button" data-state-remove-segment>删除段</button></div>
    ${segment.instructions.map((instruction, index) => `<section>
      <h4>${esc(instructionLabel(instruction))}</h4>
      ${instruction.kind === 'text' ? `<div data-state-text-instruction="${index}">${referencePickerMarkup({
        moduleId: 'text-record', value: instruction.record, label: '正文', compact: true,
        items: records.map(row => ({value: row.handle, label: row.label,
          preview: renderModuleComponent('text-record', 'preview', {value: row.record, compact: false})})),
      })}</div>` : instruction.kind === 'native-call' ? `<code>${esc(instruction.handler)}</code>`
        : instruction.kind === 'indexed-branches' ? instruction.targets.map((target, branch) =>
          `<label>选项 ${branch + 1} ${destination(target, [index, 'targets', branch])}</label>`).join('')
          : instruction.operands.map((operand, position) =>
            ['segment', 'end'].includes(operand.kind) ? `<label>去向 ${destination(operand, [index, 'operands', position])}</label>`
              : ['parameter', 'runtime-text-slot'].includes(operand.kind) ? `<label>${esc(operandLabel(instruction, position))}
                  <input type="number" min="0" max="${operand.kind === 'runtime-text-slot' ? 19 : 255}" value="${operand.value}"
                    data-state-parameter="${esc(JSON.stringify([index, position]))}"></label>`
                : '<span>↛</span>').join('')}
      </section>`).join('')}<p data-state-document-error role="alert" hidden></p>`;
  const changeInstruction = (index, change) => edit(current => {
    change(current.program.segments.find(row => row.id === segmentId).instructions[index]); return current;
  });
  for (const container of host.querySelectorAll('[data-state-text-instruction]')) {
    const index = Number(container.dataset.stateTextInstruction);
    bindReferencePicker(container.querySelector('[data-module-reference-picker]'), {
      paint: preview => hydrateModuleComponents(preview),
      onSelect: value => changeInstruction(index, instruction => {instruction.record = value;}),
    });
  }
  for (const input of host.querySelectorAll('[data-state-parameter]')) input.addEventListener('change', () => {
    const [index, position] = JSON.parse(input.dataset.stateParameter);
    void changeInstruction(index, instruction => {instruction.operands[position].value = Number(input.value);});
  });
  for (const input of host.querySelectorAll('[data-state-destination]')) input.addEventListener('change', () => {
    const [index, kind, position] = JSON.parse(input.dataset.stateDestination);
    void changeInstruction(index, instruction => {
      instruction[kind][position] = input.value.startsWith('application-program:')
        ? {kind: 'segment', target: input.value} : {kind: 'end', value: Number(input.value)};
    });
  });
  host.querySelector('[data-state-remove-segment]').addEventListener('click', () => edit(current => {
    current.program.segments = current.program.segments.filter(row => row.id !== segmentId); return current;
  }));
  for (const button of host.querySelectorAll('[data-state-move-segment]')) button.addEventListener('click', () => edit(current => {
    const segments = current.program.segments, index = segments.findIndex(row => row.id === segmentId);
    const next = index + Number(button.dataset.stateMoveSegment);
    if (next >= 0 && next < segments.length) [segments[index], segments[next]] = [segments[next], segments[index]];
    return current;
  }));
}

export { mountInterfaceStateDocumentControls };
