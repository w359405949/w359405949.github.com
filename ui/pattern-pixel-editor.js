// @editor-module 字段对象提供定长 8×8 双位面像素编辑与重置。
import {esc} from '../core/dom.js';
import {decodeChrTile, paintChrTile} from '../render/chr-raster.js';
import {resetToOriginalButton, applyResetToOriginalStates} from './table.js';
import {showEditorError} from './editor-error.js';
import {writeAccessMarker} from './write-access-marker.js';

export function paintPatternPixelPreview(canvas, fields) {
  const bytes = fields.flatMap(field => field.value);
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  paintChrTile(pixels, 8, 0, 0, decodeChrTile(bytes, 0), [0x0F, 0x30, 0x10, 0x00], {transparent: false});
  canvas.width = canvas.height = 8;
  canvas.getContext('2d').putImageData(new ImageData(pixels, 8, 8), 0, 0);
}

export function mountPatternPixelEditor(host, object, {fields, onValue = () => {}}) {
  const selected = fields.map(name => object.fields.find(field => field.fieldName === name));
  if (selected.some(field => !field) || ![1, 2].includes(selected.length)
      || selected.some(field => field.value.length !== (selected.length === 1 ? 16 : 8)))
    throw new TypeError('像素字段必须含两个 8 B 位面或一段 16 B 位图');
  const key = object.id;
  host.innerHTML = `<div class="pattern-pixel-editor" data-pattern-editor="${esc(key)}">
    <code>${esc(key)}</code>${selected.some(field => field.writeback?.state === 'unpermitted')
      ? writeAccessMarker({writebackMissing: true}) : ''}
    <fieldset><legend>画笔</legend>${[0, 1, 2, 3].map(value => `<label><input
      type="radio" name="pattern-brush-${esc(key)}" value="${value}"${value === 1 ? ' checked' : ''}>${value}</label>`).join('')}</fieldset>
    <canvas width="8" height="8" data-pattern-canvas aria-label="8×8 像素"></canvas>
    ${resetToOriginalButton(key)}</div>`;
  const canvas = host.querySelector('[data-pattern-canvas]');
  let pending = 0, writes = Promise.resolve();
  const sync = () => {
    paintPatternPixelPreview(canvas, selected);
    applyResetToOriginalStates(host, new Map([[key, selected.some(field => field.hasOverride)]]), {busy: pending > 0});
  };
  const perform = action => {
    pending++;
    sync();
    writes = writes.then(action).then(() => {
      host.querySelector('[data-editor-error-block]')?.remove();
      sync();
      return onValue();
    }).catch(error => showEditorError(host, '像素编辑', error))
      .finally(() => {pending--; sync();});
    return writes;
  };
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 8 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 8 / rect.height);
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    const brush = Number(host.querySelector('input:checked').value);
    void perform(async () => {
      const bytes = selected.flatMap(field => field.value);
      const bit = 1 << (7 - x);
      for (let plane = 0; plane < 2; plane++) bytes[y + plane * 8] =
        (bytes[y + plane * 8] & ~bit) | (((brush >> plane) & 1) ? bit : 0);
      await object.database.writeFields(selected.map((field, index) => ({field,
        value: selected.length === 1 ? bytes : bytes.slice(index * 8, index * 8 + 8)})));
    });
  });
  host.querySelector('[data-reset-to-original]').addEventListener('click', () =>
    void perform(() => object.database.writeFields(selected.map(field =>
      ({field, value: field.defaultValue, reset: true})))));
  for (const field of selected) field.bind(host, sync);
  sync();
  host.dataset.fieldObjectReady = key;
}
