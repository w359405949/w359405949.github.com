// @editor-module 界面组件嵌入所属字段对象的矩形、传送、装备位置与人物状态控件。
import {db} from '../../core/project-db.js';
import {state} from '../../core/state.js';
import {esc} from '../../core/dom.js';
import {fieldOwner} from '../../core/field-owners.js';
import {INTERFACE_PAGE_DEFINITIONS} from '../../core/ui-page-registry.js';
import {withCurrentOwnerRecord, currentOwnerReferenceImpact} from '../../ui/owner-reference-impact.js';
import {showEditorError} from '../../ui/editor-error.js';
import {paintUiConstructionSemanticPreview} from './ui-construction-preview.js';

function componentSources(preview) {
  const sources = [];
  for (const layer of preview?.layers || []) {
    if (layer.kind === 'window_clear') {
      sources.push({kind: 'rectangle', id: layer.source.preset || 'selector'});
      if (layer.source.selector_resource_id) sources.push({kind: 'selector', id: 'window-clear-selector'});
    }
    if (layer.category_transfer) sources.push(...['08', '0A'].map(id => ({kind: 'transfer', id})));
    if (layer.equipment_slots?.rows?.resource_id === 'ui-equipment-control')
      sources.push(...['equipment-row-values', 'equipment-column-values'].map(id => ({kind: 'equipment', id})));
  }
  if (preview?.interface_ids?.includes('character-status'))
    sources.push(...['experience-offset-table', 'sex-record-table'].map(id => ({kind: 'role', id})));
  return [...new Map(sources.map(source => [`${source.kind}:${source.id}`, source])).values()];
}

const owners = {rectangle: 'ui-tile-rectangle-service', transfer: 'text-render-runtime',
  selector: 'text-render-runtime', equipment: 'ui-equipment-control', role: 'ui-role-status'};
const labels = {rectangle: '清除矩形', transfer: '类别文字传送', selector: '确认窗口',
  equipment: '装备标记位置', role: '人物状态引用'};

export function interfaceDataControlNodes(preview, screenId) {
  const names = {'equipment-row-values': '装备标记行', 'equipment-column-values': '装备标记列',
    'sex-record-table': '性别文字', 'experience-offset-table': '经验值引用',
    'window-clear-selector': '确认窗口'};
  const rectangles = {'00': '主菜单清除区', '02': '子菜单清除区', '06': '传真清除区',
    '28': '战车概览清除区', '2E': '类别清除区', '38': '商店清除区',
    '3A': '商品清除区', '3C': '顾客选择清除区', '3E': '商品详情清除区', selector: '确认窗口清除区'};
  const transfers = {'08': '类别上行文字传送', '0A': '类别下行文字传送'};
  return componentSources(preview).map(({kind, id}) => ({
    id: `interface-data:${kind}:${id}`, kind: 'dynamic', depth: 1, screenId,
    label: names[id] || (kind === 'rectangle' ? rectangles[id] : kind === 'transfer' ? transfers[id] : null) || labels[kind],
    controlsMarkup: `<div data-interface-data-kind="${kind}" data-interface-data-id="${esc(id)}"></div>`,
  }));
}

export function commonDataControlsMarkup(kind) {
  const ids = kind === 'rectangle' ? ['00', '02', '06', '28', '2E']
    : kind === 'transfer' ? ['08', '0A'] : kind === 'role' ? ['sex-record-table', 'experience-offset-table']
    : ['equipment-row-values', 'equipment-column-values'];
  return ids.map(id => `<details open><summary>${labels[kind]} ${id}</summary>
    <div data-interface-data-kind="${kind}" data-interface-data-id="${id}"></div></details>`).join('')
    + (kind === 'rectangle' ? '<div data-interface-data-kind="selector" data-interface-data-id="window-clear-selector"></div>' : '');
}

export async function bindInterfaceDataControls(root, {repaint = () => {}} = {}) {
  for (const host of root.querySelectorAll('[data-interface-data-kind]')) {
    if (host.dataset.fieldObjectReady) continue;
    const kind = host.dataset.interfaceDataKind, resource = owners[kind];
    let id = host.dataset.interfaceDataId;
    if (id === 'selector') id = fieldOwner('text-render-runtime').windowClearPreset(
      await db.getResourceDocument('text-render-runtime'));
    const document = await db.getResourceDocument(resource);
    const preset = kind === 'rectangle' ? document.rectangle_presets.find(preset => preset.id === id)
      : kind === 'transfer' ? document.tile_transfer_presets.find(preset => preset.id === id) : null;
    const object = await db.getFieldObject(resource, `${resource}:${preset ? preset.origin_block : id}`);
    if (!host.isConnected) continue;
    const options = kind === 'rectangle' ? {rectanglePreset: id, onValue: repaint}
      : kind === 'transfer' ? {transferPreset: id, onValue: repaint} : {};
    await object.mount(host, options);
    if (kind === 'role' && id === 'sex-record-table') {
      const canvas = window.document.createElement('canvas');
      canvas.dataset.interfaceSexPreview = '';
      canvas.setAttribute('aria-label', '人物性别标签预览');
      host.append(canvas);
      const paint = () => paintUiConstructionSemanticPreview(canvas, {id: 'role-sex-labels',
        layers: object.fields.map((field, index) =>
          ({kind: 'script', record: `record:0D:${String(field.value).padStart(3, '0')}`, cursor: index * 5}))},
      {isCurrent: () => canvas.isConnected, componentViewport: {x: 0, y: 0, width: 128, height: 16}});
      for (const field of object.fields) field.bind(canvas, () => {
        void paint().catch(error => showEditorError(host, '人物性别标签', error));
      });
      await paint();
    }
    if (host.dataset.interfaceDataId === 'selector') {
      const selector = await db.getFieldObject('text-render-runtime', 'text-render-runtime:window-clear-selector');
      selector.fields[0].bind(host, () => {
        const selected = selector.fields[0].value.toString(16).toUpperCase().padStart(2, '0');
        if (selected === id || !host.isConnected) return;
        const replacement = host.cloneNode(false);
        delete replacement.dataset.fieldObjectReady;
        host.replaceWith(replacement);
        void bindInterfaceDataControls(root, {repaint}).catch(error => showEditorError(replacement, '确认窗口', error));
      });
    }
    if (!preset) for (const field of object.fields) field.bind(host, () => {void repaint();});
    const previews = state.project?.ui?.construction?.menu_dispatch_data?.previews || [];
    const consumers = previews.filter(preview => componentSources(preview).some(source =>
      source.kind === kind && (source.id === id || source.id === 'selector')));
    const interfaces = new Set(consumers.flatMap(preview => preview.interface_ids || []));
    const users = INTERFACE_PAGE_DEFINITIONS.filter(page => page.stateIds?.length
      ? consumers.some(preview => page.stateIds.some(id => preview.interface_state_id === id
        || preview.interface_state_ids?.includes(id)))
      : (page.interfaceIds || [page.id]).some(id => interfaces.has(id)));
    const affected = withCurrentOwnerRecord({kind: 'ui-component-data', users}, state.project, () => currentOwnerReferenceImpact());
    if (!host.closest('.interface-page-workbench')) host.insertAdjacentHTML('beforeend', `<nav aria-label="界面">${affected.map(page =>
      `<a href="?view=interfaceui&amp;interface=${esc(page.id)}">${esc(page.label)} ↗</a>`).join(' · ')}</nav>`);
  }
}
