// @editor-module 战车部件详情嵌入矩阵、动作和图块布局所属字段对象的控件。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {vehiclePartTypeCandidates} from '../../core/ui-vehicle-layout-owner.js';
import {resolveFieldSubmenuPreview} from '../../render/field-submenu-preview.js';
import {vehicleStatusPartArtForSelector} from '../vehicle/components.js';
import {mountFieldObjectField, mountFieldObjectText, mountFieldObjectColumns,
  mountLinkedFieldChoice} from '../../ui/field-object-editor.js';
import {dataTable, resetToOriginalButton, bindFieldResetToOriginalButtons} from '../../ui/table.js';

export function vehiclePartLayoutMarkup(preview) {
  return preview?.layers?.some(layer => layer.kind === 'vehicle_status_parts')
    ? '<div data-vehicle-part-layout></div>' : '';
}

export async function bindVehiclePartLayout(root, preview, {repaint = () => {}, rerender = null} = {}) {
  const host = root.querySelector('[data-vehicle-part-layout]');
  if (!host) return;
  preview = await resolveFieldSubmenuPreview(preview);
  const layer = preview?.layers?.find(layer => layer.kind === 'vehicle_status_parts');
  if (!layer?.parts?.length) return;
  const status = await db.getResourceDocument('ui-vehicle-status', null);
  const objects = await db.getFieldObjects('ui-vehicle-status');
  if (!host.isConnected) return;
  const chassis = layer.parts[0].chassis_id;
  const rows = status.portrait_parts.filter(row => row.chassis_id === chassis);
  host.innerHTML = dataTable({columns: [{key: 'physical_column', label: '物理列', width: 64},
    ...['part_type', 'x', 'y'].map(name => ({key: name,
      label: {part_type: '部件类型', x: 'X', y: 'Y'}[name], width: name === 'part_type' ? 90 : 70,
      cell: row => `<span data-vehicle-part-field="${row.physical_column}:${name}"></span>`})),
    {key: 'reset', label: '', reset: true, width: 48,
      cell: row => resetToOriginalButton(`column:${row.physical_column}`)}], rows,
    rowId: row => `column:${row.physical_column}`, reportStatus: false});
  let ready = false;
  const resetFields = new Map();
  for (const row of rows) {
    const handle = `ui-vehicle-status:${chassis.toString(16).toUpperCase()}:${row.physical_column}`;
    const object = objects.find(object => object.id === handle);
    if (!object) throw new TypeError(`战车部件字段缺失：${handle}`);
    resetFields.set(`column:${row.physical_column}`, object.fields);
    for (const field of object.fields) {
      const cell = host.querySelector(`[data-vehicle-part-field="${row.physical_column}:${field.fieldName}"]`);
      const options = {entityHandle: handle, fieldName: field.fieldName,
        onValue: () => {if (ready) void (field.fieldName === 'part_type' ? (rerender || repaint)() : repaint());}};
      if (field.fieldName === 'part_type') mountFieldObjectText(cell, object, {...options,
        label: '部件类型', maxLength: 2, format: value => value, parse: value => {
          const type = value.trim().toUpperCase();
          if (!vehiclePartTypeCandidates(status, row).includes(type))
            throw new TypeError('请选择当前底盘已确认的部件类型及状态变体');
          return type;
        }});
      else mountFieldObjectField(cell, object, options);
    }
  }
  bindFieldResetToOriginalButtons(host, resetFields, {database: db, afterReset: repaint});
  host.insertAdjacentHTML('beforeend', `${partInterfaceLinks()}<div data-vehicle-part-images></div>`);
  const imageHost = host.querySelector('[data-vehicle-part-images]');
  const [actionDocument, layoutDocument] = await Promise.all([
    db.getResourceDocument('battle-action', null), db.getResourceDocument('battle-object-layout', null)]);
  const actionObjects = await db.getFieldObjects('battle-action');
  const layoutObjects = await db.getFieldObjects('battle-object-layout');
  if (!host.isConnected) return;
  const actionIds = new Set(rows.flatMap(row => Object.values(row.part_type_by_state_case)).filter(Boolean));
  const layouts = new Map(layoutDocument.records.map(row => [row.handle, row]));
  const confirmedLayouts = new Set(status.portrait_part_art.map(row => row.layout_reference.resource_id));
  let currentArtPromise;
  for (const id of actionIds) {
    const object = actionObjects.find(object => object.id === `battle-action:${id}`);
    const action = actionDocument.records.find(row => row.handle === object?.id);
    if (!object || !action) throw new TypeError(`部件动作缺失：${id}`);
    const section = document.createElement('details');
    section.innerHTML = `<summary>${esc(object.id)}</summary><div data-part-action-shape></div>${
      resetToOriginalButton(object.id)}<div data-part-layout-tiles></div>`;
    imageHost.append(section);
    const choices = [...confirmedLayouts].flatMap(handle => {
      const count = layouts.get(handle)?.shape_contract?.tile_count;
      return Array.from({length: 8}, (_, index) => index + 1).filter(columns =>
        count % columns === 0 && count / columns <= 8).map(columns => ({
          values: [handle, columns, count / columns], label: `${handle} · ${columns}×${count / columns}`}));
    });
    mountLinkedFieldChoice(section.querySelector('[data-part-action-shape]'), object,
      ['layout_reference', 'columns', 'rows'], choices, {label: '布局 · 列×行'});
    bindFieldResetToOriginalButtons(section, new Map([[object.id,
      object.fields.filter(field => ['layout_reference', 'columns', 'rows'].includes(field.fieldName))]]),
    {database: db, afterReset: rerender || repaint});
    for (const field of object.fields) field.bind(section, () => {if (ready) void (rerender || repaint)();});
    const layout = layoutObjects.find(row => row.id === action.layout_reference);
    if (!layout) throw new TypeError(`部件图块布局缺失：${action.layout_reference}`);
    await mountFieldObjectColumns(section.querySelector('[data-part-layout-tiles]'), layout,
      ['x_quarter_tiles', 'y_quarter_tiles', 'tile_references']);
    for (const field of layout.fields) field.bind(section, () => {
      if (ready) void (field.fieldName === 'tile_references' ? (rerender || repaint)() : repaint());
    });
    const incoming = actionDocument.records.filter(row => row.layout_reference === layout.id).map(row => row.handle);
    section.insertAdjacentHTML('beforeend', `<p>${esc(layout.id)} · ${esc(incoming.join('、'))}</p>${partInterfaceLinks()}`);
    const tiles = (layer.art || layer.document.portrait_part_art).find(row => row.chassis_id === chassis
      && row.action_reference.resource_id === object.id)?.tiles || [];
    const pixelSection = document.createElement('details');
    pixelSection.innerHTML = '<summary>图块像素</summary>';
    section.append(pixelSection);
    let pixelsMounted = false;
    pixelSection.addEventListener('toggle', async () => {
      if (!pixelSection.open || pixelsMounted) return;
      pixelsMounted = true;
      try {
        const chr = await db.getResourceDocument('shared-chr-bank', null);
        const seen = new Set();
        for (const tile of tiles) {
          const reference = tile.chr_reference;
          const key = `${reference.bank_id}:${reference.tile_id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const bankIndex = chr.banks.findIndex(bank => bank.id === reference.bank_id);
          if (bankIndex < 0) throw new TypeError('部件图块没有已登记的 CHR bank');
          const [pixelObject] = await db.getFieldObjects('shared-chr-bank',
            {offset: bankIndex * 64 + reference.tile_id, limit: 1});
          const pixelHost = document.createElement('div');
          pixelSection.append(pixelHost);
          await pixelObject.mount(pixelHost);
          for (const field of pixelObject.fields) field.bind(pixelHost, () => void repaint());
          currentArtPromise ||= db.getResourceDocument('vehicle-visual-selector', null).then(selectors =>
            Promise.all(selectors.status_sprite_chr_banks.map(async selector =>
              (await vehicleStatusPartArtForSelector(status, selector.chassis_id, selector.chr_bank))
                .filter(art => art.chassis_id === selector.chassis_id))).then(rows => rows.flat()));
          const consumers = (await currentArtPromise).filter(art => art.tiles.some(tile =>
            tile.chr_reference.bank_id === reference.bank_id && tile.chr_reference.tile_id === reference.tile_id));
          pixelHost.insertAdjacentHTML('beforeend', `<p>${esc([...new Set(consumers.map(art =>
            `底盘 ${art.chassis_id.toString(16).toUpperCase()} · ${art.action_reference.resource_id}`))].join('、'))}</p>${partInterfaceLinks()}`);
        }
      } catch (error) {
        pixelSection.insertAdjacentHTML('beforeend', `<p role="status">${esc(error.message)}</p>`);
      }
    });
  }
  ready = true;
}

function partInterfaceLinks() {
  const params = new URLSearchParams({view: 'interfaceui', interface: 'party-strength',
    interfaceScreen: 'ui-screen:interface:vehicle-status:state:vehicle-status.part-detail'});
  return `<p><a class="editor-inline-link" href="?${esc(params.toString())}">强度部件详情</a> · <a class="editor-inline-link" href="?${esc(params.toString())}&amp;interfaceEntry=vehicle-status.overview-part-detail">战车状况部件详情</a></p>`;
}
