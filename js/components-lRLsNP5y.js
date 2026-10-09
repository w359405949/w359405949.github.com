import { registerReferencePickerEnhancement, registerReferenceFieldPresentation, registerModuleComponent, audioCommandLabel, recordUid, handleTextMarkup, esc, hydrateReferenceFieldPickers, referenceFieldPickerMarkup } from './monster-figure-C07vG7yu.js';
import { db } from './scene-actors-Cftr7mCE.js';
import { ensureAudioCommandLabelsData, ensureSequenceExecutions, createNesApuSynth } from './preview-sound-DHDXA99x.js';

// @editor-module audio-command owner 的静态候选与播放语义摘要

const AUDIO_COMMAND_MODULE_ID = "audio-command";
const AUDIO_DOCUMENT_ID = "project.audio";

function byteId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function commandIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const entryId = byteId(entry?.id);
  if (entryId !== null) return entryId;
  const match = /^audio-command:([0-9a-f]{1,2})$/iu.exec(String(handle || value || "").trim());
  if (match) return Number.parseInt(match[1], 16);
  return byteId(value);
}

function idHex(entry) {
  const id = byteId(entry?.id);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function commandKind(entry) {
  return ({music: "音乐", "sound-effect": "音效", control: "控制", dpcm: "DPCM",
    undefined: "未定义"})[
    String(entry?.kind || "")
  ] || String(entry?.kind || "类型未定");
}

function playbackSummary(entry) {
  const playback = entry?.playback || {};
  const shape = playback.sequence_shape === "looping" ? "循环"
    : playback.sequence_shape === "finite" ? "有限序列"
      : playback.sequence_shape === "unavailable" ? "不可播放" : "序列形态未定";
  return [
    shape,
  ].filter(Boolean).join(" · ");
}

function commandLabel(entry) {
  const id = commandIdFromReference({entry, value: entry?.value});
  const label = audioCommandLabel(id);
  return label.startsWith("音频命令 0x") ? recordUid(AUDIO_COMMAND_MODULE_ID, id) : label;
}

function commandPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const id = commandIdFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>音频命令引用未解析</small></span>`;
  }
  const resolved = entry || {id};
  return `<span class="module-reference-data-preview" data-audio-command-preview="${id}" ${componentAttributes}>
    <b>${handleTextMarkup(commandLabel(resolved))}</b>
    <small>${esc(`${commandKind(resolved)} · ${playbackSummary(resolved)}`)}</small>
  </span>`;
}

function commandReferenceItem(entry) {
  const id = byteId(entry?.id);
  if (id === null) return null;
  const hex = idHex(entry);
  const label = commandLabel(entry);
  const summary = playbackSummary(entry);
  const alias = byteId(entry?.alias_of ?? entry?.canonical_command_id);
  const description = alias !== null && alias !== id
    ? `${commandKind(entry)} · 共用命令 ${recordUid(AUDIO_COMMAND_MODULE_ID, alias)}`
    : commandKind(entry);
  return {
    value: String(id),
    group: String(entry.kind || 'control'),
    groupLabel: commandKind(entry),
    label,
    description,
    meta: `audio-command:${hex} · ${summary}`,
    preview: commandPreviewMarkup({entry}),
    filter: [id, hex, `0x${hex}`, `$${hex}`, `audio-command:${hex}`,
      label, description, summary, entry?.status].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareAudioCommandComponent(props) {
  try {
    await ensureAudioCommandLabelsData();
    const documentValue = await db.getDocument(AUDIO_DOCUMENT_ID, null);
    const commands = documentValue?.commands;
    if (!Array.isArray(commands)) {
      throw new TypeError(`${AUDIO_DOCUMENT_ID} 缺少 commands 候选表`);
    }
    const allowed = props.allowedValues ? new Set(props.allowedValues.map(Number)) : null;
    const entries = allowed ? commands.filter(entry => allowed.has(byteId(entry.id))) : commands;
    const requestedId = commandIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => byteId(entry?.id) === requestedId) || null,
      error: entries.length ? "" : "audio-command 的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

async function prepareAudition(picker) {
  const button = picker.querySelector('[data-audio-command-audition]');
  const status = picker.querySelector('[data-audio-command-audition-status]');
  try {
    const [audio, graph] = await Promise.all([
      db.getDocument(AUDIO_DOCUMENT_ID, null), db.getResourceDocument('audio-sequence', null),
    ]);
    const source = {...audio, sequence_graph: graph};
    await ensureSequenceExecutions(source);
    if (!picker.isConnected) return;
    const synth = createNesApuSynth(source, {dpcmGatePolicy: 'assume-open'});
    const details = picker.querySelector(':scope > details');
    synth.subscribe(snapshot => {
      const active = ['rendering', 'playing'].includes(snapshot.status);
      button.textContent = active ? '停止' : '试听';
      button.setAttribute('aria-pressed', String(active));
      status.textContent = snapshot.status === 'playing' ? '正在试听'
        : snapshot.status === 'rendering' ? '正在合成…'
          : ['blocked', 'unplayable', 'error'].includes(snapshot.status)
            ? `试听失败：${snapshot.error || snapshot.reason}` : '';
    });
    button.addEventListener('click', async () => {
      if (['rendering', 'playing'].includes(synth.state.status)) {synth.stop(); return;}
      const preview = picker.querySelector('[data-reference-picker-detail] [data-audio-command-preview]');
      const id = Number(preview?.dataset.audioCommandPreview ?? picker.dataset.moduleReferenceValue);
      try {
        const result = await synth.playCommand(id, {maxSeconds: 120, dpcmGatePolicy: 'assume-open'});
        if (!result.ok && result.status !== 'cancelled') throw new Error(result.reason);
      } catch (error) {status.textContent = `试听失败：${error.message}`;}
    });
    details.addEventListener('toggle', () => {if (!details.open) synth.stop();});
    const observer = new MutationObserver(() => {
      if (picker.isConnected) return;
      observer.disconnect();
      void synth.dispose();
    });
    observer.observe(document.body, {childList: true, subtree: true});
    button.disabled = false;
  } catch (error) {status.textContent = `试听失败：${error.message}`;}
}

registerReferencePickerEnhancement(AUDIO_COMMAND_MODULE_ID, picker => {
  picker.querySelector('.module-reference-picker-menu')?.insertAdjacentHTML('beforeend',
    `<div class="data-editor-toolbar"><button class="button ghost" type="button"
      data-audio-command-audition aria-pressed="false" disabled>试听</button>
      <small data-audio-command-audition-status role="status" aria-live="polite"></small></div>`);
  let preparing = false;
  picker.querySelector(':scope > details')?.addEventListener('toggle', event => {
    if (!event.target.open || preparing) return;
    preparing = true;
    void prepareAudition(picker);
  });
});

function audioCommandReferencePickerMarkup({
  entries = [], value = null, label = "音频命令", controlMarkup = "",
  componentAttributes = "", error = "", picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: AUDIO_COMMAND_MODULE_ID},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(AUDIO_COMMAND_MODULE_ID, {
  item: commandReferenceItem,
  prepare: ensureAudioCommandLabelsData,
  currentLabel: commandLabel,
  className: "audio-command-reference-field",
  filterLabel: "过滤音频命令",
  filterPlaceholder: "ID／音乐或音效／轨道／状态",
});

registerModuleComponent(AUDIO_COMMAND_MODULE_ID, "reference", {
  prepare: prepareAudioCommandComponent,
  render: audioCommandReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(AUDIO_COMMAND_MODULE_ID, kind, {
    prepare: prepareAudioCommandComponent,
    render: commandPreviewMarkup,
  });
}
