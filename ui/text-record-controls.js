// @editor-module 文字记录所属控件共用定长文字与脚本参数编辑器。
import {fixedTextEditorMarkup, bindFixedTextEditors} from './fixed-text-editor.js';
import {createTextRecordEncoding, decodeFixedTextRecord, decodeFixedTextRecordSelection, textRecordComponents,
  textRecordEditorBytes} from '../core/text-record-project.js';
import {textRecordListReferenceChoices} from '../core/text-record-project.js';
import {state} from '../core/state.js';
import {mountFieldObjectEditor, mountLinkedFieldChoice} from './field-object-editor.js';
import {projectFieldDraftOrigin} from '../core/project-field-draft.js';
import {resetToOriginalButton, bindFieldResetToOriginalButtons} from './table.js';
import {esc} from '../core/dom.js';

export async function mountTextRecordControls(host, object) {
  const database = object.database;
  let document = await database.getDocument('text-record');
  const href = `?${new URLSearchParams({view: 'text', textMode: 'records',
    textRegion: object.id.split(':')[1], textKind: 'all', textSearch: object.id})}`;
  const link = `<a class="editor-inline-link" data-scene-destination="${esc(href)}"
    href="${esc(href)}" title="${esc(object.id)}" aria-label="跳转到 ${esc(object.id)}">↗</a>`;
  const encoding = state.project?.text_record_encoding || createTextRecordEncoding(
    await database.getDocument('text.character-map'), await database.getDocument('project.text-catalog'),
    await database.getDocument('project.text-fonts'));
  if (!document.records[object.id]?.editable) {
    await mountFieldObjectEditor(host, object,
      {rowHandles: [object.id], compactIdentity: true, stacked: true});
    host.insertAdjacentHTML('afterbegin', fixedTextEditorMarkup({recordId: object.id,
      document, encoding, readonly: true}) + link);
    return;
  }
  const recordId = object.id;
  host.innerHTML = fixedTextEditorMarkup({recordId, document, encoding,
    label: recordId, compact: true, runtime: true});
  (host.querySelector('.fixed-text-editor-field') || host).insertAdjacentHTML('beforeend', link);
  const controller = bindFixedTextEditors(host, {database, getDocument: () => document,
    getEncoding: () => encoding, onSaved: ({saved}) => {document = saved.value.document;}});
  await controller.ready;
  host.dataset.fieldObjectReady = object.id;
}

export async function mountTextRecordOrderControls(host, object, {group, recordContent = false,
  onSaved = () => {}, references = ''}) {
  const document = await object.database.getDocument('text-record');
  const origin = projectFieldDraftOrigin(document) || document;
  const record = origin.records[object.id];
  const encoding = state.project.text_record_encoding;
  if (record.byte_variants || record.list_order && record.list_order.group_id === group?.id) {
    const field = object.fields.find(field => field.fieldName === 'bytes');
    const choices = [{values: [[...field.value]], label: '当前内容'}];
    if (record.byte_variants) choices.push(...record.byte_variants.map(bytes => ({values: [bytes],
      label: `图块 ${bytes.slice(0, -1).map(value => value.toString(16).toUpperCase()).join(' ')}`})));
    else {
      const slots = record.list_order.slots;
      for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
        const bytes = [...field.value];
        slots[first].offsets.forEach((offset, index) => {
          const other = slots[second].offsets[index];
          bytes[offset] = field.value[other]; bytes[other] = field.value[offset];
        });
        choices.push({values: [bytes], label: `${first + 1} ↔ ${second + 1}`});
      }
    }
    host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}${record.byte_variants
      ? '' : '<p>命令按选项序号执行。</p>'}${references}`;
    mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
      {label: record.byte_variants ? '固定图块字样' : '图块顺序'});
    bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (recordContent) {
    await mountTextRecordControls(host, object);
    const field = object.fields.find(field => field.fieldName === 'bytes');
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (!record?.editable || group.record !== object.id || !encoding) return;
  const components = textRecordComponents(record, encoding, origin);
  const lines = decodeFixedTextRecord(record, encoding).formatted_text.split('\n');
  const slots = group.choices.map(choice => components.find(component => component.kind === 'text'
    && (choice.visible_text || lines[choice.label_reference?.line] || '').trim().startsWith(component.text.trim())))
    .filter(Boolean);
  if (new Set(slots).size !== slots.length) return;
  const field = object.fields.find(field => field.fieldName === 'bytes');
  const current = {...origin, records: {...origin.records,
    [object.id]: {...record, bytes: [...field.value]}}};
  const labels = slots.map(slot => decodeFixedTextRecordSelection({...record,
    bytes: [...field.value]}, encoding, slot.ranges).text.trim());
  const choices = [{values: [[...field.value]], label: '当前顺序'}];
  if (group.id === 'commands:41-44') choices.push(...textRecordListReferenceChoices({...record,
    bytes: [...field.value]}, encoding, origin));
  for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
    try {
      const one = textRecordEditorBytes(current, object.id, labels[second], encoding, slots[first].ranges);
      if (!one.ok) continue;
      const swapped = {...current, records: {...current.records,
        [object.id]: {...record, bytes: one.bytes}}};
      const two = textRecordEditorBytes(swapped, object.id, labels[first], encoding, slots[second].ranges);
      if (!two.ok) continue;
      choices.push({values: [two.bytes], label: `${first + 1} ↔ ${second + 1} · ${labels[first]} / ${labels[second]}`});
    } catch (_) {}
  }
  host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}<p>命令按选项序号执行。</p>${references}<div data-text-list-content></div>`;
  mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
    {label: '文字顺序'});
  bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
  if (choices.length === 1 || slots.length !== group.choices.length)
    await mountTextRecordControls(host.querySelector('[data-text-list-content]'), object);
  let ready = false;
  field.bind(host, () => {if (ready) void onSaved();});
  ready = true;
}
