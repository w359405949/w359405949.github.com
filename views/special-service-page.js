// @editor-module 专用服务页向公共宿主提供正文、字段引用与临时预览输入。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {servicePreviewContext} from '../core/service-preview-state.js';
import {currentViewUrl, replaceHistoryUrl} from '../core/router.js';
import {uiRecordComponentLabel, distinctUiComponentLabels} from '../core/ui-component-labels.js';
import {sceneServicePreviewEntries} from '../render/service-preview.js';
import {createShopStateWorkbench} from '../ui/shop-state-workbench.js';
import {bindRecordLinks} from '../ui/table.js';

const pages = new Map();

export function isSpecialServicePage(definition) {
  return [0x21, 0x22, 0x23, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x30].includes(definition?.commandId);
}

export async function renderSpecialServicePage(definition, {inspectorExtraMarkup = ''} = {}) {
  const commandId = `application-command:${definition.commandId.toString(16).toUpperCase().padStart(2, '0')}`;
  const context = interfacePreviewContext();
  const entries = sceneServicePreviewEntries([{command: definition.commandId,
    instance: context.service?.command === definition.commandId ? context.service.argument : 0}],
  context.scene?.sceneId, context.service?.entryHandle);
  const objects = await db.getFieldObjects(commandId);
  const bindings = objects.map(object => ({resource: commandId, handle: object.id, separate: true}));
  let page = pages.get(definition.id);
  if (page?.repository !== state.projectRepository) {
    page = {repository: state.projectRepository, selected: {family: 0x100 + definition.commandId,
      instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit'}};
    pages.set(definition.id, page);
  }
  const selected = page.selected;
  const previewFor = preview => {
    const body = entries.find(entry => `body:${entry.fragmentId}:${entry.preview.id}` === selected.widget);
    return body?.preview && !body.preview.missing?.length ? structuredClone(body.preview) : preview;
  };
  let toolbar = '';
  if ([0x21, 0x2A].includes(definition.commandId)) toolbar += `<label class="screen-workbench-selection">金额
    <input type="number" min="0" max="9999999" data-special-amount value="${esc(context.service_amount ?? '')}"></label>`;
  if (definition.commandId === 0x2A) toolbar += `<label class="screen-workbench-selection">姓名缓冲区
    <input type="text" data-special-name placeholder="十六进制字节，9F 结尾" value="${esc(context.runtime_name_buffer ?? '')}"></label>`;
  if (definition.commandId === 0x2B) toolbar += `<span class="screen-workbench-selection" role="group" aria-label="镜片运行时槽位">镜片槽位
    ${[0, 1, 2, 3].map(index => `<label><input type="checkbox" data-special-lens="${index}"${state.laserLensPreviewSlots?.includes(index) ? ' checked' : ''}>${index + 1}</label>`).join('')}</span>`;
  page.workbench = createShopStateWorkbench({namespace: `special-service:${definition.id}`,
    selection: () => selected, fixedFamily: selected.family, evidenceVisible: false,
    previewScene: true, pathsInPreview: true, getEntry: () => state.interfacePageEntry || '',
    inspectorMarkup: `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a>${inspectorExtraMarkup}
      ${definition.commandId === 0x2A ? `<p class="muted">${esc(entries.find(entry => entry.preview.shop_menu?.game_defect)?.preview.shop_menu.game_defect || '')}</p>` : ''}`,
    widgetFields: widget => widget?.id === 'screen' || widget?.id === 'service-fields' ? bindings : [],
    bindInspector: host => bindRecordLinks(host, route => {location.href = route;}),
    componentNodes: model => {
      const bodies = entries.filter(entry => entry.record).map(entry => {
        const node = model.graph.nodes.find(node => node.action?.id === entry.fragmentId
          && node.publishedPreview?.id === entry.preview.id)
          || model.graph.nodes.find(node => node.publishedPreview?.id === entry.preview.id)
          || model.graph.nodes.find(node => node.action?.id === entry.fragmentId);
        return {id: `body:${entry.fragmentId}:${entry.preview.id}`, label: `${uiRecordComponentLabel(entry.record)}正文`,
          kind: 'text', depth: 2, nodeId: node?.id, serviceFragment: entry.fragmentId,
          textEditor: {recordId: entry.record, mode: 'capacity'}};
      });
      return distinctUiComponentLabels([{id: 'service-fields', label: '服务字段', kind: 'group', depth: 1},
        {id: 'service-bodies', label: '回应正文', kind: 'group', depth: 1}, ...bodies]);
    },
    previewFor, previewToolbarMarkup: toolbar,
    decoratePreview: preview => {
      if (definition.commandId === 0x2A && preview.shop_menu?.runtime_name_buffer) return {...preview,
        layers: preview.layers.map(layer => layer.facility_parameter_bindings?.some(binding =>
          binding.value_source?.operation === 'school-reset-name-buffer') ? {...layer,
          facility_parameter_context: {...layer.facility_parameter_context,
            runtimeNameBuffer: servicePreviewContext(preview, interfacePreviewContext()).runtime_name_buffer}} : layer)};
      if (definition.commandId !== 0x2B || !preview.shop_menu?.laser_arrangement) return preview;
      const arrangement = preview.runtime_context?.lens_arrangement;
      const layer = {kind: 'laser_lens_runtime', phase: preview.shop_menu.laser_empty_result ? 'result' : 'arrangement',
        slots: arrangement ? arrangement.flatMap((id, index) => id ? [index] : []) : state.laserLensPreviewSlots || []};
      return {...preview, layers: [...preview.layers.filter(layer => layer.kind !== 'laser_lens_runtime'), layer]};
    },
    onNodeChange: node => {
      const body = entries.find(entry => `body:${entry.fragmentId}:${entry.preview.id}` === selected.widget);
      state.interfacePageEntry = body?.fragmentId || node?.action?.id || node?.segment?.id || null;
      selected.entryRequest = state.interfacePageEntry || '';
      replaceHistoryUrl(currentViewUrl());
    },
    bindPreviewControls: (root, {refresh}) => {
      for (const [selector, field] of [['[data-special-amount]', 'service_amount'], ['[data-special-name]', 'runtime_name_buffer']])
        root.querySelector(selector)?.addEventListener('change', event => {
          interfacePreviewContext()[field] = field === 'service_amount'
            ? event.target.value === '' ? undefined : Number(event.target.value) : event.target.value.trim() || undefined;
          void refresh();
        });
      root.querySelectorAll('[data-special-lens]').forEach(input => input.addEventListener('change', () => {
        state.laserLensPreviewSlots = [...root.querySelectorAll('[data-special-lens]:checked')]
          .map(input => Number(input.dataset.specialLens));
        void refresh();
      }));
    },
  });
  return {stateWorkbenchMarkup: await page.workbench.render()};
}

export function bindSpecialServicePage(root, options) {
  return pages.get(state.interfacePage)?.workbench.bind(root, options);
}
