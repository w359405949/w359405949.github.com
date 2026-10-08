// @editor-module 公共界面元素页嵌入光标与对话等待标记的字段对象控件。
import {state} from '../../core/state.js';
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {genericMetaspriteObject} from '../../render/metasprite.js';
import {paintUiConstructionSemanticPreview, paintUiDialogueWaitMarker} from './ui-construction-preview.js';
import {mountFieldObjectField} from '../../ui/field-object-editor.js';
import {dataTable, resetToOriginalButton, bindFieldResetToOriginalButtons} from '../../ui/table.js';
import {renderGameUiWorkbench, bindGameUiWorkbench, selectedGameUiWorkbenchNode} from '../../views/game-ui-workbench.js';
import {showEditorError} from '../../ui/editor-error.js';
import {writeAccessMarker} from '../../ui/write-access-marker.js';
import {interfacePatternMarkup, bindInterfacePatterns} from './interface-patterns.js';
import {INTERFACE_PAGE_DEFINITIONS} from '../../core/ui-page-registry.js';
import {withCurrentOwnerRecord, currentOwnerReferenceImpact} from '../../ui/owner-reference-impact.js';
import {fieldOwner} from '../../core/field-owners.js';
import {composeCorePatternTable} from '../../core/media-assets.js';
import {decodeChrTile, paintChrTile} from '../../render/chr-raster.js';
import {commonDataControlsMarkup, bindInterfaceDataControls} from './interface-data-controls.js';
import {vehiclePartControlsMarkup, bindVehiclePartControls} from './interface-vehicle-parts.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../../core/field-submenu-code-sources.js';

const namespace = 'interface-page:common-elements';
const nodes = [{id: 'common-elements:cursor', kind: 'image', label: '光标', depth: 0,
  inspectorMarkup: '<div class="screen-workbench-inspector-body"><p class="mono" data-common-sprite-handle></p><div data-common-cursor-fields></div></div>'},
  {id: 'common-elements:highlight', kind: 'image', label: '高亮', depth: 0,
    inspectorMarkup: '<div class="screen-workbench-inspector-body"><p class="mono" data-common-sprite-handle></p><div data-common-cursor-fields></div><div data-common-highlight-position></div></div>'},
  {id: 'common-elements:equipment', kind: 'image', label: '装备标记', depth: 0,
    inspectorMarkup: '<label>标记<select data-common-equipment-marker></select></label><div data-common-cursor-fields></div>'},
  {id: 'common-elements:palette', kind: 'image', label: '光标与装备颜色', depth: 0,
    inspectorMarkup: '<div data-common-palette-fields></div>'},
  {id: 'common-elements:font', kind: 'image', label: '拉丁与数字字形', depth: 0,
    inspectorMarkup: interfacePatternMarkup('font')},
  {id: 'common-elements:status-words', kind: 'text', label: '状态字样', depth: 0,
    inspectorMarkup: '<div data-common-status-words></div>'},
  {id: 'common-elements:vehicle-palette', kind: 'image', label: '战车部件颜色', depth: 0,
    inspectorMarkup: '<div data-common-vehicle-palette></div>'},
  {id: 'common-elements:patterns', kind: 'image', label: '菜单字样与边框', depth: 0,
    inspectorMarkup: interfacePatternMarkup('menu')},
  {id: 'common-elements:vehicle-patterns', kind: 'image', label: '战车部件图块', depth: 0,
    inspectorMarkup: interfacePatternMarkup('vehicle')},
  {id: 'common-elements:vehicle-parts', kind: 'image', label: '战车部件布局', depth: 0,
    inspectorMarkup: vehiclePartControlsMarkup()},
  {id: 'common-elements:rectangles', kind: 'layout', label: '清除矩形', depth: 0,
    inspectorMarkup: commonDataControlsMarkup('rectangle')},
  {id: 'common-elements:transfers', kind: 'layout', label: '类别文字传送', depth: 0,
    inspectorMarkup: commonDataControlsMarkup('transfer')},
  {id: 'common-elements:equipment-position', kind: 'layout', label: '装备标记位置', depth: 0,
    inspectorMarkup: commonDataControlsMarkup('equipment')},
  {id: 'common-elements:role-fields', kind: 'text', label: '人物状态引用', depth: 0,
    inspectorMarkup: commonDataControlsMarkup('role')},
  {id: 'common-elements:wait-marker', kind: 'image', label: '对话等待标记', depth: 0,
    inspectorMarkup: '<div class="screen-workbench-inspector-body"><div data-common-wait-marker-fields></div><div data-common-wait-marker-pixels></div></div>'}];
let equipmentMarker = null;

async function commonSpriteSource(kind) {
  if (kind === 'equipment' && equipmentMarker === null) {
    const values = await fieldSubmenuCodeValues(['shop-equipment-category-marker-0']);
    equipmentMarker = fieldSubmenuCodeValue(values, 'shop-equipment-category-marker-0');
  }
  const selection = await db.getResourceDocument('selection-layout');
  const codeSource = kind === 'highlight' ? selection?.highlights?.metasprite_id_source
    : selection?.common_cursor?.metasprite_id_source;
  if (!codeSource) throw new TypeError('公共精灵缺少构造引用');
  const id = kind === 'equipment' ? equipmentMarker
    : (await db.getField(codeSource.resource_id, codeSource.entity_handle, codeSource.field)).value;
  if (!Number.isInteger(id)) throw new TypeError('公共精灵缺少对象编号');
  const source = state.project?.ui?.construction?.menu_dispatch_data?.previews
    ?.find(preview => preview.interface_state_id === 'walking-dialogue.start');
  const profile = source?.layers?.find(layer => layer.kind === 'generic_metasprite')?.pattern_profiles;
  if (!profile?.length || !source?.sprite_palette_source) throw new TypeError('公共精灵缺少图案页或颜色构造');
  return {id, selection, pattern_profiles: profile, sprite_palette_source: source.sprite_palette_source};
}

export function commonInterfaceElementNodes() {return nodes;}

export function renderCommonInterfaceElements() {
  const selected = selectedGameUiWorkbenchNode(namespace, nodes)?.id;
  const wait = selected === 'common-elements:wait-marker';
  const kind = selected === 'common-elements:highlight' ? 'highlight' : selected === 'common-elements:equipment' ? 'equipment' : 'cursor';
  return renderGameUiWorkbench({namespace, id: 'interface-page-workbench',
    className: 'interface-page-workbench interface-page-workbench-common-elements',
    treeTitle: '组件树', nodes,
    canvasMarkup: `<canvas width="64" height="64" ${wait ? 'data-common-interface-wait-marker' : 'data-common-interface-cursor'}
      data-common-sprite-kind="${kind}"
      aria-label="${esc(selectedGameUiWorkbenchNode(namespace, nodes)?.label || '公共界面元素')}预览"></canvas>`});
}

async function paintCursor(root, {isCurrent = () => root.isConnected} = {}) {
  const canvas = root.querySelector('[data-common-interface-cursor]');
  if (!canvas || !isCurrent()) return;
  const source = await commonSpriteSource(canvas.dataset.commonSpriteKind);
  if (!isCurrent()) return;
  const objectId = source.id;
  const selection = canvas.dataset.commonSpriteKind === 'highlight' ? source.selection : null;
  const positions = selection ? selection.highlights.x_fields.map(handle =>
    selection.coordinates.find(row => row.handle === handle).coordinate) : [120];
  const object = await genericMetaspriteObject(objectId);
  if (!isCurrent()) return;
  if (!object?.sprites?.length) throw new TypeError('公共精灵缺少图块');
  const xs = positions.flatMap(x => object.sprites.flatMap(sprite => [x + sprite.x, x + sprite.x + 8]));
  const ys = object.sprites.flatMap(sprite => [112 + sprite.y + 1, 112 + sprite.y + 9]);
  const width = selection ? Math.max(256, Math.max(...xs) + 8) : Math.max(48, Math.max(...xs) - Math.min(...xs) + 16);
  const height = Math.max(48, Math.max(...ys) - Math.min(...ys) + 16);
  const viewport = {x: selection ? Math.min(0, Math.min(...xs) - 8)
    : Math.ceil((Math.min(...xs) + Math.max(...xs) - width) / 16) * 8,
    y: Math.round((Math.min(...ys) + Math.max(...ys) - height) / 16) * 8, width, height};
  await paintUiConstructionSemanticPreview(canvas, {
    id: 'common-interface-cursor',
    sprite_palette_source: source?.sprite_palette_source,
    layers: positions.map(x => ({kind: 'generic_metasprite', object_id: objectId, anchor_x: x, anchor_y: 112,
      oam_y_bias: 1, pattern_profiles: source.pattern_profiles})),
  }, {isCurrent: () => isCurrent() && canvas.isConnected,
    componentViewport: viewport});
}

export async function bindCommonInterfaceElements(root, {rerender = async () => {}, isCurrent: currentPage = () => true} = {}) {
  bindGameUiWorkbench({namespace, nodes, root, rerender});
  root = root.querySelector('#interface-page-workbench');
  if (!root) return;
  const isCurrent = () => currentPage() && root.isConnected;
  const repaintCursor = () => paintCursor(root, {isCurrent}).catch(error => {
    if (isCurrent()) showEditorError(root, '公共界面元素', error);
  });
  const selected = selectedGameUiWorkbenchNode(namespace, nodes)?.id;
  if (root.querySelector('[data-interface-vehicle-parts]')) {
    await bindVehiclePartControls(root);
    return;
  }
  if (root.querySelector('[data-interface-data-kind]')) {
    const repaint = async () => {
      const canvas = root.querySelector('[data-common-interface-cursor]');
      const previews = state.project.ui.construction.menu_dispatch_data.previews;
      if (selected === 'common-elements:role-fields') {
        const source = previews.find(preview => preview.interface_state_id === 'character-status.detail');
        if (!source) throw new TypeError('人物状态缺少构造引用');
        await paintUiConstructionSemanticPreview(canvas, source, {isCurrent});
      } else if (selected === 'common-elements:equipment-position') {
        const document = await db.getResourceDocument('ui-equipment-control');
        const rows = document.blocks.find(block => block.id === 'equipment-row-values').values;
        const columns = document.blocks.find(block => block.id === 'equipment-column-values').values;
        const source = await commonSpriteSource('equipment');
        await paintUiConstructionSemanticPreview(canvas, {id: 'common-equipment-positions',
          sprite_palette_source: source.sprite_palette_source, layers: rows.flatMap(y => columns.map(x =>
            ({kind: 'generic_metasprite', object_id: source.id, anchor_x: x, anchor_y: y, oam_y_bias: 1,
              pattern_profiles: source.pattern_profiles})))}, {isCurrent});
      }
    };
    await bindInterfaceDataControls(root, {repaint});
    await repaint();
    return;
  }
  const previews = state.project?.ui?.construction?.menu_dispatch_data?.previews || [];
  const cursorId = selected === 'common-elements:cursor' ? (await commonSpriteSource('cursor')).id : null;
  const consumers = previews.filter(preview => {
    if (selected === 'common-elements:palette') return preview.sprite_palette_source?.resource_id === 'actor-visual';
    if (selected === 'common-elements:cursor') return preview.selection_cursor
      || preview.layers?.some(layer => layer.kind === 'generic_metasprite' && Number(layer.object_id) === cursorId);
    if (selected === 'common-elements:status-words') return preview.references?.some(reference =>
      reference.reference?.resource_id === 'fixed-text-slot');
    if (['common-elements:vehicle-patterns', 'common-elements:vehicle-palette'].includes(selected))
      return preview.layers?.some(layer => layer.kind === 'vehicle_status_parts');
    if (selected === 'common-elements:highlight') return Boolean(preview.menu_highlight);
    if (['common-elements:equipment', 'common-elements:equipment-position'].includes(selected))
      return preview.layers?.some(layer => layer.equipment_slots);
    if (selected === 'common-elements:wait-marker') return preview.layers?.some(layer => layer.dialogue_runtime);
    return preview.selection_cursor || preview.layers?.some(layer => layer.kind === 'script');
  });
  const interfaces = new Set(consumers.flatMap(preview => preview.interface_ids || []));
  const users = INTERFACE_PAGE_DEFINITIONS.filter(page => page.id !== 'common-elements'
    && (page.stateIds?.length ? consumers.some(preview => page.stateIds.some(id =>
      preview.interface_state_id === id || preview.interface_state_ids?.includes(id)))
      : (page.interfaceIds || [page.id]).some(id => interfaces.has(id))));
  const affected = withCurrentOwnerRecord({kind: 'ui-component-data', users}, state.project,
    () => currentOwnerReferenceImpact());
  const inspector = root.querySelector('.workspace-inspector');
  if (inspector) inspector.insertAdjacentHTML('beforeend', `<nav aria-label="界面" class="interface-component-users">${affected.map(page =>
    `<a href="?view=interfaceui&amp;interface=${esc(page.id)}">${esc(page.label)} ↗</a>`).join(' · ')}</nav>`);
  const paletteHost = root.querySelector('[data-common-palette-fields]');
  if (paletteHost) {
    const objects = await db.getFieldObjects('actor-visual');
    for (const object of objects.filter(object => object.fields.every(field => field.fieldName.startsWith('color_')))) {
      const section = document.createElement('section');
      paletteHost.append(section);
      await object.mount(section);
      for (const field of object.fields) field.bind(section, () => {void repaintCursor();});
    }
    await repaintCursor();
    return;
  }
  const vehiclePaletteHost = root.querySelector('[data-common-vehicle-palette]');
  if (vehiclePaletteHost) {
    const object = await db.getFieldObject('sprite-palette', 'sprite-palette:colors');
    await object.mount(vehiclePaletteHost, {suppressedFieldKeys: new Set(object.fields
      .filter(field => field.fieldName !== 'value18' && field.fieldName !== 'value19')
      .map(field => JSON.stringify([field.resourceId, field.entityHandle, field.fieldName])))});
    vehiclePaletteHost.insertAdjacentHTML('beforeend', vehiclePartControlsMarkup());
    await bindVehiclePartControls(vehiclePaletteHost, {previewCanvas: root.querySelector('[data-common-interface-cursor]')});
    return;
  }
  const statusHost = root.querySelector('[data-common-status-words]');
  if (statusHost) {
    const objects = (await db.getFieldObjects('fixed-text-slot')).filter(object =>
      object.fields.every(field => field.recordId.startsWith('ui-status:')));
    const canvas = root.querySelector('[data-common-interface-cursor]');
    const fields = objects.flatMap(object => object.fields);
    const paint = async () => {
      const patterns = await composeCorePatternTable();
      if (!canvas.isConnected) return;
      canvas.width = 16;
      canvas.height = fields.length * 8;
      const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      fields.forEach((field, row) => {
        const bytes = fieldOwner('fixed-text-slot').serializeField(field);
        bytes.forEach((glyph, column) => paintChrTile(pixels, 16, column * 8, row * 8,
          decodeChrTile(patterns, glyph), [0x0F, 0x30, 0x10, 0x00], {transparent: false}));
      });
      canvas.getContext('2d').putImageData(new ImageData(pixels, 16, canvas.height), 0, 0);
    };
    for (const object of objects) {
      const section = document.createElement('section');
      statusHost.append(section);
      await object.mount(section);
      for (const field of object.fields) field.bind(section, () => {void paint();});
    }
    await paint();
    return;
  }
  if (root.querySelector('[data-interface-patterns]')) {
    await bindInterfacePatterns(root, {previewCanvas: root.querySelector('[data-common-interface-cursor]')});
    return;
  }
  const waitHost = root.querySelector('[data-common-wait-marker-fields]');
  if (waitHost) {
    await bindWaitMarker(waitHost, root, {isCurrent});
    return;
  }
  const host = root.querySelector('[data-common-cursor-fields]');
  const marker = root.querySelector('[data-common-equipment-marker]');
  if (marker) {
    const names = Array.from({length: 12}, (_, index) => `shop-equipment-category-marker-${index}`);
    const values = await fieldSubmenuCodeValues(names);
    const markers = [...new Set(names.map(name => fieldSubmenuCodeValue(values, name)))];
    if (!markers.includes(equipmentMarker)) equipmentMarker = markers[0];
    marker.innerHTML = markers.map(id => `<option value="${id}">metasprite:${id.toString(16).toUpperCase().padStart(2, '0')}</option>`).join('');
    marker.value = equipmentMarker;
    marker.addEventListener('change', () => {equipmentMarker = Number(marker.value); void rerender();});
  }
  const canvas = root.querySelector('[data-common-interface-cursor]');
  const source = await commonSpriteSource(canvas.dataset.commonSpriteKind);
  const label = root.querySelector('[data-common-sprite-handle]');
  if (label) label.textContent = `metasprite:${source.id.toString(16).toUpperCase().padStart(2, '0')}`;
  const cursor = await genericMetaspriteObject(source.id);
  const objects = await db.getFieldObjects('metasprite-record');
  if (!host?.isConnected) return;
  const capacity = (cursor.source_fields.length - 2) / 4;
  const rows = [{index: -1, label: '图块数', source: cursor.source_fields[1]}, ...Array.from({length: capacity}, (_sprite, index) => ['Y', '图块', '属性', 'X'].map((label, offset) => ({
    index, label, source: cursor.source_fields[2 + index * 4 + offset],
  }))).flat()];
  host.innerHTML = dataTable({columns: [
    {key: 'index', label: '图块', width: 40, cell: row => row.index < 0 ? '' : String(row.index + 1)},
    {key: 'label', label: '字段', width: 48},
    {key: 'value', label: '值', width: 64, cell: row => `<span data-common-cursor-field="${esc(row.source.entity_handle)}"></span>`},
    {key: 'reset', label: '', reset: true, width: 32, cell: row => resetToOriginalButton(row.source.entity_handle)},
  ], rows, rowId: row => row.source.entity_handle, reportStatus: false});
  const fields = new Map();
  for (const row of rows) {
    const handle = row.source.entity_handle;
    const object = objects.find(object => object.fields.some(field => field.entityHandle === handle));
    const field = object?.fields.find(field => field.entityHandle === handle && field.fieldName === 'value');
    if (!field) throw new TypeError(`公共光标字段缺失：${handle}`);
    fields.set(handle, field);
    mountFieldObjectField(host.querySelector(`[data-common-cursor-field="${handle}"]`), object,
      {entityHandle: handle, fieldName: 'value', label: `图块 ${row.index + 1} ${row.label}`,
        onValue: () => {void repaintCursor();}});
  }
  bindFieldResetToOriginalButtons(host, fields, {afterReset: repaintCursor});
  const highlightHost = root.querySelector('[data-common-highlight-position]');
  if (highlightHost) {
    const document = await db.getResourceDocument('selection-layout');
    for (const handle of document.highlights.x_fields) {
      const section = window.document.createElement('section'); highlightHost.append(section);
      const object = await db.getFieldObject('selection-layout', handle);
      await object.mount(section);
      for (const field of object.fields) field.bind(section, () => {void repaintCursor();});
    }
  }
  await repaintCursor();
}

async function bindWaitMarker(host, root, {isCurrent: currentPage}) {
  const [document, objects] = await Promise.all([
    db.getResourceDocument('text-render-runtime', null), db.getFieldObjects('text-render-runtime')]);
  const marker = document?.wait_marker;
  const canvas = root.querySelector('[data-common-interface-wait-marker]');
  if (!host.isConnected || !canvas?.isConnected) return;
  if (!marker) throw new TypeError('对话等待标记来源未发布');
  const pixelObject = await db.getFieldObject('core-latin', 'core-latin:slot-0x63');
  await pixelObject.mount(root.querySelector('[data-common-wait-marker-pixels]'), {pixels: true,
    onValue: () => paintUiDialogueWaitMarker(canvas, {isCurrent: () => currentPage() && canvas.isConnected})});
  const rows = [{label: '闪烁掩码', source: marker.frame_mask_source},
    {label: '显示图块', source: marker.visible_tile_source},
    {label: '隐藏图块', source: marker.hidden_tile_source}];
  host.innerHTML = dataTable({columns: [
    {key: 'label', label: '字段', width: 88},
    {key: 'value', label: '值', cell: row => `<span data-wait-marker-field="${esc(row.source.entity_handle)}"></span>${writeAccessMarker({writebackMissing: true})}`},
    {key: 'reset', label: '', reset: true, width: 32, cell: row => resetToOriginalButton(row.source.entity_handle)},
  ], rows, rowId: row => row.source.entity_handle, reportStatus: false});
  let dirty = true, phase = null;
  const fields = new Map();
  for (const row of rows) {
    const {entity_handle: handle, field: fieldName} = row.source;
    const object = objects.find(object => object.fields.some(field => field.entityHandle === handle));
    const field = object?.fields.find(field => field.entityHandle === handle && field.fieldName === fieldName);
    if (!field) throw new TypeError(`对话等待标记字段缺失：${handle}`);
    fields.set(handle, field);
    mountFieldObjectField(host.querySelector(`[data-wait-marker-field="${handle}"]`), object,
      {entityHandle: handle, fieldName, label: row.label, onValue: () => {dirty = true;}});
  }
  bindFieldResetToOriginalButtons(host, fields, {afterReset: () => {dirty = true;}});
  const mask = fields.get(marker.frame_mask_source.entity_handle);
  const isCurrent = () => currentPage() && canvas.isConnected && host.isConnected;
  const tick = time => {
    if (!isCurrent()) return;
    const frameCounter = Math.floor(time * 60 / 1000) & 0xFF;
    const nextPhase = frameCounter & mask.value;
    if (!dirty && nextPhase === phase) {requestAnimationFrame(tick); return;}
    dirty = false;
    phase = nextPhase;
    void paintUiDialogueWaitMarker(canvas, {frameCounter, isCurrent})
      .catch(error => {if (isCurrent()) showEditorError(host, '对话等待标记', error);})
      .finally(() => {if (isCurrent()) requestAnimationFrame(tick);});
  };
  await paintUiDialogueWaitMarker(canvas, {isCurrent});
  requestAnimationFrame(tick);
}
