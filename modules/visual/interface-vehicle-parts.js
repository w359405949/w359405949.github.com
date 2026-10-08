// @editor-module 战车部件详情嵌入动作与布局的字段对象控件并绘制当前图像。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {vehicleStatusPartArtForSelector, vehiclePortraitImage} from '../vehicle/components.js';
import {showEditorError} from '../../ui/editor-error.js';
import '../battle/components.js';

export function vehiclePartControlsMarkup() {
  return '<section data-interface-vehicle-parts><label>部件图像<select data-interface-vehicle-part></select></label>'
    + '<canvas data-interface-vehicle-part-preview aria-label="部件图像预览"></canvas>'
    + '<div data-interface-vehicle-part-fields></div><nav aria-label="界面"><a href="?view=interfaceui&amp;interface=party-strength">强度 ↗</a></nav></section>';
}

export async function bindVehiclePartControls(root, {repaint = () => {},
  previewCanvas = root.querySelector('[data-common-interface-cursor]')} = {}) {
  for (const host of root.querySelectorAll('[data-interface-vehicle-parts]')) {
    if (host.dataset.partsReady) continue;
    host.dataset.partsReady = 'loading';
    const status = await db.getResourceDocument('ui-vehicle-status');
    const selector = await db.getResourceDocument('vehicle-visual-selector');
    const picker = host.querySelector('[data-interface-vehicle-part]');
    picker.innerHTML = status.portrait_part_art.map(row => `<option value="${esc(row.id)}">${esc(row.id)}</option>`).join('');
    let generation = 0;
    const mount = async () => {
      const current = ++generation, row = status.portrait_part_art.find(row => row.id === picker.value);
      const actionHandle = row.action_reference.resource_id;
      const action = await db.getFieldObject('battle-action', actionHandle);
      const layoutHandle = action.fields.find(field => field.fieldName === 'layout_reference').value;
      const layout = await db.getFieldObject('battle-object-layout', layoutHandle);
      if (current !== generation || !host.isConnected) return;
      const previous = host.querySelector('[data-interface-vehicle-part-fields]');
      const fieldsHost = document.createElement('div'); fieldsHost.dataset.interfaceVehiclePartFields = '';
      previous.replaceWith(fieldsHost);
      for (const object of [action, layout]) {
        const section = document.createElement('section'); fieldsHost.append(section);
        await object.mount(section, object === action ? {fixedShape: true, suppressedFieldKeys: new Set(action.fields
          .filter(field => field.fieldName === 'palette_id').map(field => JSON.stringify(
            [field.resourceId, field.entityHandle, field.fieldName])))} : {});
      }
      const paint = async () => {
        const bank = selector.status_sprite_chr_banks.find(item => item.chassis_id === row.chassis_id).chr_bank;
        const art = (await vehicleStatusPartArtForSelector(status, row.chassis_id, bank)).find(art => art.id === row.id);
        if (current !== generation || !host.isConnected) return;
        const canvas = host.querySelector('[data-interface-vehicle-part-preview]');
        canvas.width = canvas.height = 128;
        const context = canvas.getContext('2d'); context.fillStyle = '#000'; context.fillRect(0, 0, 128, 128);
        const pixels = context.getImageData(0, 0, 128, 128);
        vehiclePortraitImage({kind: 'status', raster: pixels, statusDocument: status,
          partArt: [art], parts: [{art_id: art.id, physical_column: 0, x: 64, y: 64}]});
        context.putImageData(pixels, 0, 0);
        context.fillStyle = '#40b8ff'; context.fillRect(63, 63, 3, 1); context.fillRect(64, 62, 1, 3);
        if (previewCanvas?.isConnected) {
          previewCanvas.width = previewCanvas.height = 128;
          previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
        }
      };
      for (const field of [...action.fields, ...layout.fields]) field.bind(fieldsHost, () => {
        if (field.fieldName === 'layout_reference' && field.value !== layoutHandle)
          void mount().catch(error => showEditorError(host, '战车部件', error));
        else void paint().then(repaint).catch(error => showEditorError(host, '战车部件', error));
      });
      const palette = await db.getFieldObject('sprite-palette', 'sprite-palette:colors');
      for (const field of palette.fields.filter(field => ['value18', 'value19'].includes(field.fieldName)))
        field.bind(fieldsHost, () => {void paint().then(repaint).catch(error => showEditorError(host, '战车部件', error));});
      await paint();
    };
    picker.addEventListener('change', () => {void mount().catch(error => showEditorError(host, '战车部件', error));});
    await mount(); host.dataset.partsReady = 'true';
  }
}
