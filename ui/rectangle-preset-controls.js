// @editor-module 清除矩形控件通过所属字段对象转换坐标并同笔修改原点与尺寸。
import {fieldOwner} from '../core/field-owners.js';
import {esc} from '../core/dom.js';
import {resetToOriginalButton, applyResetToOriginalStates, bindFieldResetToOriginalButtons} from './table.js';
import {mountLinkedFieldChoice} from './field-object-editor.js';
import {writeAccessMarker} from './write-access-marker.js';
import {showEditorError} from './editor-error.js';

export function mountWindowClearSelectorControls(host, object) {
  const field = object.fields[0];
  host.innerHTML = `${writeAccessMarker({writebackMissing: field.writeback?.state === 'unpermitted'})}
    <span data-window-clear-choice></span>${resetToOriginalButton(object.id)}`;
  mountLinkedFieldChoice(host.querySelector('[data-window-clear-choice]'), object, [field.fieldName],
    fieldOwner(object.resourceId).windowClearChoices.map(value => ({values: [value],
      label: `预设 ${value.toString(16).toUpperCase().padStart(2, '0')}`})), {label: '确认窗口'});
  bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]));
  host.dataset.fieldObjectReady = object.id;
}

export async function mountRectanglePresetControls(host, object, {rectanglePreset, transferPreset, onValue = () => {}}) {
  const database = object.database, resource = object.resourceId, owner = fieldOwner(resource);
  const transfer = Boolean(transferPreset), id = transferPreset || rectanglePreset;
  const document = await database.getResourceDocument(resource);
  const preset = (transfer ? document.tile_transfer_presets : document.rectangle_presets).find(preset => preset.id === id);
  if (!preset) throw new TypeError(`矩形预设 ${id} 未发布`);
  const objects = await Promise.all([preset.origin_block, transfer ? preset.geometry_block : preset.dimensions_block]
    .map(name => database.getFieldObject(resource, `${resource}:${name}`)));
  const fields = objects.flatMap(object => object.fields);
  const columns = [['column', '来源列', 0, 31], ['row', '来源行', 0, 31], ['width', '宽度', 1, 32], ['rows', '行数', 1, 32],
    ...(transfer ? [['destinationColumn', '目标列', 0, 31], ['destinationRow', '目标行', 0, 29]] : [])];
  host.innerHTML = `<div data-rectangle-preset="${esc(id)}"><code>${esc(resource)}:${esc(id)}</code>
    ${fields.some(field => field.writeback?.state === 'unpermitted') ? writeAccessMarker({writebackMissing: true}) : ''}
    ${columns
      .map(([name, label, min, max]) => `<label>${label}<input type="number" data-rectangle-value="${name}" min="${min}" max="${max}" step="1"></label>`).join('')}
    ${resetToOriginalButton(id)}<canvas width="256" height="256" data-rectangle-preview aria-label="矩形范围预览"></canvas></div>`;
  let generation = 0, pending = 0, writes = Promise.resolve();
  const sync = async () => {
    const current = ++generation;
    const document = await database.getResourceDocument(resource);
    const rectangle = transfer ? owner.tileTransferPreset(document, id) : owner.rectanglePreset(document, id);
    if (current !== generation || !host.isConnected) return;
    const values = {column: rectangle.logical_origin % 32, row: Math.floor(rectangle.logical_origin / 32),
      width: rectangle.width_tiles, rows: rectangle.rows,
      destinationColumn: rectangle.column_offset, destinationRow: rectangle.row_offset};
    for (const input of host.querySelectorAll('[data-rectangle-value]')) input.value = values[input.dataset.rectangleValue];
    applyResetToOriginalStates(host, new Map([[id, fields.some(field => field.hasOverride)]]), {busy: pending > 0});
    const context = host.querySelector('[data-rectangle-preview]').getContext('2d');
    context.fillStyle = '#111'; context.fillRect(0, 0, 256, 256);
    context.strokeStyle = '#444'; context.lineWidth = 1;
    for (let line = 0; line <= 256; line += 8) {
      context.beginPath(); context.moveTo(line, 0); context.lineTo(line, 256); context.stroke();
      context.beginPath(); context.moveTo(0, line); context.lineTo(256, line); context.stroke();
    }
    context.fillStyle = '#84b8ff88';
    context.fillRect(values.column * 8, values.row * 8, values.width * 8, values.rows * 8);
    if (transfer) {
      context.strokeStyle = '#f8ce59'; context.lineWidth = 2;
      context.strokeRect(values.destinationColumn * 8 + 1, values.destinationRow * 8 + 1,
        values.width * 8 - 2, values.rows * 8 - 2);
    }
  };
  const perform = action => {
    pending++;
    writes = writes.then(action).then(() => {
      host.querySelector('[data-editor-error-block]')?.remove();
      return onValue();
    })
      .catch(error => showEditorError(host, '清除矩形', error)).finally(async () => {pending--; await sync();});
  };
  for (const input of host.querySelectorAll('[data-rectangle-value]')) input.addEventListener('change', () => {
    if ([...host.querySelectorAll('[data-rectangle-value]')].some(input => !input.checkValidity() || input.value === '')) return;
    const geometry = Object.fromEntries([...host.querySelectorAll('[data-rectangle-value]')]
      .map(input => [input.dataset.rectangleValue, Number(input.value)]));
    perform(async () => {
      const document = await database.getResourceDocument(resource);
      const changes = transfer ? owner.tileTransferFieldChanges(document, id, geometry)
        : owner.rectangleFieldChanges(document, id, geometry);
      await database.writeFields(changes.map(change => ({field: fields.find(field =>
        field.entityHandle === change.entityHandle && field.fieldName === change.fieldName), value: change.value})));
    });
  });
  host.querySelector('[data-reset-to-original]').addEventListener('click', () =>
    perform(() => database.writeFields(fields.map(field => ({field, value: field.defaultValue, reset: true})))));
  for (const field of fields) field.bind(host, () => {void sync();});
  await sync();
  host.dataset.fieldObjectReady = object.id;
}
