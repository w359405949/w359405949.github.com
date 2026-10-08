// @editor-module audio-sequence owner 的音色包络与音序流候选呈现。
// 候选身份始终服从字段声明的 owner 表；本组件只补 owner 专有的显示信息。

import {esc} from "../core/dom.js";
import {db} from "../core/project-db.js";
import {registerModuleComponent} from "../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../ui/reference-field.js";

const AUDIO_SEQUENCE_GRAPH_MODULE_ID = "audio-sequence";

const ENVELOPE_REFERENCE = Object.freeze({
  module: AUDIO_SEQUENCE_GRAPH_MODULE_ID,
  key: Object.freeze(["pointer"]),
  name: Object.freeze(["pointer_hex"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["id_hex"])}),
});

function envelopePointer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xffff ? number : null;
}

function pointerFromReference({entry = null, handle = "", value = ""} = {}) {
  const entryPointer = envelopePointer(entry?.pointer);
  if (entryPointer !== null) return entryPointer;
  const text = String(handle || value || "").trim();
  if (!text) return null;
  const parsed = /^0x[0-9a-f]+$/iu.test(text)
    ? Number.parseInt(text.slice(2), 16) : Number(text);
  return envelopePointer(parsed);
}

function selectableEnvelope(entry) {
  return envelopePointer(entry?.pointer) !== null
    && entry?.program && typeof entry.program === "object"
    && !String(entry?.status || "").startsWith("invalid-reserved-sentinel");
}

function pointerHex(entry) {
  const pointer = envelopePointer(entry?.pointer);
  return String(entry?.pointer_hex
    || (pointer === null ? "????" : `0x${pointer.toString(16).toUpperCase().padStart(4, "0")}`));
}

function voiceId(entry) {
  return String(entry?.id_hex ?? entry?.id ?? "?");
}

function envelopeSummary(entry) {
  const count = Number(entry?.step_count);
  return [
    `音色 ${voiceId(entry)}`,
    Number.isInteger(count) && count >= 0 ? `${count} 个包络步` : "包络长度未定",
    String(entry?.status || "状态未定"),
  ].join(" · ");
}

function envelopePreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const pointer = pointerFromReference({entry, handle, value});
  if (pointer === null || !entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "音色包络引用未解析")}</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-audio-sequence-envelope="${esc(String(pointer))}">
    <b>音色 ${esc(voiceId(entry))}</b><small>音色包络程序</small>
  </span>`;
}

function envelopeReferenceItem(entry) {
  const pointer = envelopePointer(entry.pointer);
  if (pointer === null) return null;
  const summary = envelopeSummary(entry);
  return {
    value: String(pointer),
    label: `音色 ${voiceId(entry)}`,
    description: "音色包络程序",
    meta: '',
    preview: envelopePreviewMarkup({entry}),
    filter: [pointer, pointerHex(entry), voiceId(entry), summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function streamReferenceItem(entry) {
  const pointer = envelopePointer(entry?.entry_pointer);
  if (pointer === null || !Array.isArray(entry?.source_command_ids)
      || !entry.source_command_ids.length) return null;
  const commandIds = entry.source_command_ids.map(value => String(value));
  const commandLabel = `命令 ${commandIds.join(" / ")}`;
  const channel = String(entry.channel_label || entry.channel_key || "声道未定");
  const parserMode = String(entry.parser_mode || "解析模式未定");
  const status = String(entry.status || "状态未定");
  const summary = `${channel} · ${parserMode} · ${status}`;
  return {
    value: String(pointer),
    label: commandLabel,
    description: channel,
    meta: '',
    preview: `<span class="module-reference-data-preview">
      <b>${esc(channel)}</b><small>${esc(commandLabel)}</small></span>`,
    filter: [commandIds.join(" "), channel, entry.channel_key, parserMode, status]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function audioSequenceReferenceItem(entry, reference) {
  return reference?.key?.length === 1 && reference.key[0] === "entry_pointer"
    ? streamReferenceItem(entry) : envelopeReferenceItem(entry);
}

function envelopeCandidate(entry) {
  const stepCount = Number(entry.program.instruction_count ?? entry.length);
  if (!Number.isInteger(stepCount) || stepCount < 0) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID}.voice_table 包络步数无效`);
  }
  return {
    pointer: envelopePointer(entry.pointer),
    pointer_hex: pointerHex(entry),
    id: entry.id,
    id_hex: voiceId(entry),
    status: String(entry.status || "状态未定"),
    step_count: stepCount,
  };
}

function envelopeRows(documentValue) {
  if (!Array.isArray(documentValue?.voice_table)) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID} 缺少 voice_table 候选表`);
  }
  // 组件边界只交付 picker 所需的语义投影。地址范围、原始程序与编码细节
  // 仍留在 sequence-graph owner 正文里，不暴露给消费字段。
  const rows = documentValue.voice_table.filter(selectableEnvelope)
    .map(envelopeCandidate);
  const pointers = rows.map(entry => envelopePointer(entry.pointer));
  if (new Set(pointers).size !== pointers.length) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID}.voice_table 候选键不唯一`);
  }
  return rows;
}

async function prepareEnvelopeComponent(props) {
  try {
    const documentValue = await db.getResourceDocument(AUDIO_SEQUENCE_GRAPH_MODULE_ID, null);
    const entries = envelopeRows(documentValue);
    const requestedPointer = pointerFromReference(props);
    return {
      ...props,
      entries,
      entry: entries.find(entry =>
        envelopePointer(entry.pointer) === requestedPointer) || null,
      error: entries.length ? "" : "音色包络的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], entry: null,
      error: `候选项不可用：${error?.message || error}`};
  }
}

function envelopeReferenceMarkup({
  entries = [],
  value = null,
  label = "音色包络",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: ENVELOPE_REFERENCE,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(AUDIO_SEQUENCE_GRAPH_MODULE_ID, {
  item: audioSequenceReferenceItem,
  currentLabel: entry => entry.entry_pointer == null ? `音色 ${voiceId(entry)}`
    : `命令 ${(entry.source_command_ids || []).join(' / ')}`,
  className: "audio-sequence-reference-field audio-sequence-envelope-reference-field",
  filterLabel: "过滤音序资源",
  filterPlaceholder: "音色／命令／声道",
});

registerModuleComponent(AUDIO_SEQUENCE_GRAPH_MODULE_ID, "reference", {
  prepare: prepareEnvelopeComponent,
  render: envelopeReferenceMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(AUDIO_SEQUENCE_GRAPH_MODULE_ID, kind, {
    prepare: prepareEnvelopeComponent,
    render: envelopePreviewMarkup,
  });
}
