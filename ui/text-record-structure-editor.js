// @editor-module 文本字段对象在界面组件详情中提供定长结构控件与局部重置。
import {esc} from '../core/dom.js';
import {state} from '../core/state.js';
import {projectFieldDraftOrigin} from '../core/project-field-draft.js';
import {TEXT_RECORD_UI_SCOPE} from '../core/text-record-ui-scope.js';
import {textRecordHandle, textRecordStructureFields, textRecordStructureOwners,
  installTextRecordStructureValue} from '../core/text-record-structure.js';
import {dedicatedUiPageForScreen} from '../core/ui-page-registry.js';
import {bindFieldResetToOriginalButtons, resetToOriginalButton} from './table.js';
import {flushAllAutoSaves} from '../core/auto-save.js';
import {uiPaintPattern} from '../render/nes.js';
import {pickerTileFromEvent} from './nametable-editor.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

export function textRecordStructureEditorMarkup(id, document = state.project?.text_record_edits) {
  const origin = projectFieldDraftOrigin(document) || document;
  return textRecordStructureOwners(document, id, origin).map(owner => {
    const controls = `<section class="text-record-structure-editor" data-text-record-structure="${esc(owner)}"></section>`;
    return owner === id ? controls : `<details class="text-record-structure-reference"><summary>引用记录 ${textRecordHandle(owner)}</summary>${controls}</details>`;
  }).join('');
}

function consumersMarkup(id) {
  const consumers = TEXT_RECORD_UI_SCOPE.get(id)?.consumers || [];
  return `<details class="text-record-structure-consumers" open><summary>受影响的界面</summary>${consumers.map(id => { // structure-check-exempt 6: 合同要求文本字段对象在当前记录详情中列出字节影响面。
    const screen = state.project?.ui?.editor?.screens?.find(screen => screen.interface_state_id === id);
    const destination = dedicatedUiPageForScreen(screen || {interface_state_id: id, interface_id: id.split('.')[0]});
    if (!destination) return `<span>${esc(id)}</span>`;
    const query = new URLSearchParams({view: destination.view,
      ...(destination.interfacePage ? {interface: destination.interfacePage} : {}),
      ...(screen ? {interfaceScreen: screen.id} : {}),
      ...(destination.shopTab ? {shopTab: destination.shopTab} : {})});
    return `<a href="?${esc(query)}" title="${esc(id)}">${esc(screen?.label || id)} ↗</a>`;
  }).join('')}</details>`;
}

function controlMarkup(field, index) {
  const input = field.kind === 'reference'
    ? `<select data-text-structure-input="${index}">${field.allowed.map(id =>
      `<option value="${esc(id)}">${textRecordHandle(id)}</option>`).join('')}</select>`
    : field.kind === 'tile' ? `<button type="button" class="button ghost" data-text-structure-tile="${index}"
        aria-label="选择${esc(field.label)} ${hex(field.offset)}"><canvas width="8" height="8" data-text-structure-preview="${index}"></canvas><span data-text-structure-value="${index}"></span></button>`
      : `<input type="number" min="${field.min}" max="${field.max}" step="1" data-text-structure-input="${index}">`;
  return `<div class="text-record-structure-field"><label><span>${esc(field.label)} <small>+${hex(field.offset)}</small></span>${input}</label>${
    resetToOriginalButton(field.id, {title: '恢复此属性'})}</div>`;
}

export async function mountTextRecordStructureEditor(host, object, {
  onSaved = () => {}, getRenderSources = async () => null,
} = {}) {
  const database = object.database;
  const field = object.fields.find(field => field.fieldName === 'bytes');
  const document = await database.getDocument('text-record');
  const origin = projectFieldDraftOrigin(document) || document;
  const fields = textRecordStructureFields(origin, object.id);
  if (!fields.length || !host.isConnected) return;
  host.innerHTML = `<div class="section-line"><h3>记录属性</h3><span>${textRecordHandle(object.id)}</span></div>
    <div class="text-record-structure-fields">${fields.map(controlMarkup).join('')}</div>
    ${fields.some(field => field.kind === 'tile') ? `<details data-text-structure-picker-panel><summary>选择图块</summary><canvas width="128" height="128" data-text-structure-picker aria-label="图块图案表"></canvas></details>` : ''}
    <span data-text-structure-error role="alert"></span>${consumersMarkup(object.id)}`;
  const sources = fields.some(field => field.kind === 'tile') ? await getRenderSources() : null;
  if (!host.isConnected) return;
  const controls = fields.map((definition, index) => ({
    input: host.querySelector(`[data-text-structure-input="${index}"]`),
    label: host.querySelector(`[data-text-structure-value="${index}"]`),
    canvas: host.querySelector(`[data-text-structure-preview="${index}"]`),
  }));
  const resetButtons = new Map([...host.querySelectorAll('[data-reset-to-original]')]
    .map(button => [button.dataset.resetToOriginal, button]));
  let active = fields.findIndex(field => field.kind === 'tile');
  const showError = error => {host.querySelector('[data-text-structure-error]').textContent = error?.message || String(error);};
  const paintTile = (canvas, value) => {
    if (!canvas || !sources) return;
    const context = canvas.getContext('2d');
    const image = context.createImageData(8, 8);
    uiPaintPattern(image.data, 8, 8, sources.patterns, sources.corePatterns, value, 0, 0);
    context.putImageData(image, 0, 0);
  };
  const paintPicker = () => {
    const canvas = host.querySelector('[data-text-structure-picker]');
    if (!canvas || !sources || active < 0) return;
    const context = canvas.getContext('2d');
    const image = context.createImageData(128, 128);
    for (let tile = 0; tile < 256; tile += 1) {
      const x = tile % 16 * 8, y = Math.floor(tile / 16) * 8;
      uiPaintPattern(image.data, 128, 128, sources.patterns, sources.corePatterns, tile, x, y);
      if (!fields[active].allowed.includes(tile)) for (let row = y; row < y + 8; row += 1)
        for (let column = x; column < x + 8; column += 1) {
          const pixel = (row * 128 + column) * 4;
          for (let color = 0; color < 3; color += 1) image.data[pixel + color] *= 0.2;
        }
    }
    context.putImageData(image, 0, 0);
  };
  field.bind(host, (host, bytes) => {
    fields.forEach((definition, index) => {
      const {input, label, canvas} = controls[index];
      if (input) input.value = definition.kind === 'reference'
        ? `record:${hex(definition.region ?? bytes[definition.offset + 1])}:${String(bytes[definition.offset]).padStart(3, '0')}`
        : bytes[definition.offset];
      if (label) label.textContent = hex(bytes[definition.offset]);
      paintTile(canvas, bytes[definition.offset]);
    });
  });
  const saved = async () => {
    await onSaved({saved: await database.readResource('text-record')});
  };
  const save = async (index, value) => {
    const draft = structuredClone(await database.getDocument('text-record'));
    draft.records[object.id].bytes = [...field.value];
    const selection = installTextRecordStructureValue(draft, origin, object.id, fields[index].id, value);
    await field.set(draft.records[object.id].bytes, {selection: [selection]});
    host.querySelector('[data-text-structure-error]').textContent = '';
    await saved();
  };
  host.querySelectorAll('[data-text-structure-input]').forEach(input => input.addEventListener('change', () => {
    void save(Number(input.dataset.textStructureInput), input.value).catch(showError);
  }));
  fields.forEach(definition => {
    const button = resetButtons.get(definition.id);
    bindFieldResetToOriginalButtons(button.parentElement, new Map([[definition.id, field]]), {
      dirtyFor: field => field.value.slice(definition.offset, definition.offset + definition.length)
        .some((value, index) => value !== field.defaultValue[definition.offset + index]),
      beforeReset: async () => {await flushAllAutoSaves(); return {expectedVersion: field.version,
        fieldOptions: {selection: [{offset: definition.offset, length: definition.length}]}};},
      afterReset: saved, onError: showError,
    });
  });
  host.querySelectorAll('[data-text-structure-tile]').forEach(button => button.addEventListener('click', () => {
    active = Number(button.dataset.textStructureTile);
    host.querySelector('[data-text-structure-picker-panel]').open = true;
    host.querySelectorAll('[data-text-structure-tile]').forEach(button =>
      button.classList.toggle('is-active', Number(button.dataset.textStructureTile) === active));
    paintPicker();
  }));
  host.querySelector('[data-text-structure-picker]')?.addEventListener('click', event => {
    const tile = pickerTileFromEvent(event.currentTarget, event);
    if (tile !== null) void save(active, tile).catch(showError);
  });
  host.querySelector('[data-text-structure-picker-panel]')?.addEventListener('toggle', event => {
    if (event.currentTarget.open) paintPicker();
  });
  host.dataset.textStructureReady = 'true';
}
