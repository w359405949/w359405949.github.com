// @editor-module 服务组件树引用发布阶段、回应正文与字段对象控件。
import {state} from '../core/state.js';
import {esc} from '../core/dom.js';
import {db} from '../core/project-db.js';
import {currentTextReferenceLink} from '../core/resource-index.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {sceneServicePreviewEntries} from '../render/service-preview.js';
import {isTerminalDisplayBranch} from '../core/terminal-service-branches.js';
import {terminalPreviewInputsMarkup} from '../ui/terminal-preview-inputs.js';
import {gameUiWorkbenchNodes} from './game-ui-workbench.js';
import {interfaceWindowTree} from '../modules/visual/interface-buttons.js';
import {interfaceComponentNodes} from '../modules/visual/interface-components.js';
import {uiRecordComponentLabel, distinctUiComponentLabels} from '../core/ui-component-labels.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

// 控制器阶段职责取自 project/evidence/reverse-engineering/device-service-input/observations.json。
const controllerStageLabels = Object.freeze({
  '00': '控制器构造', '01': '等待按键', '02': '按键分派',
  '03': 'OPEN 设置事件', '04': 'CLOSE 清除事件',
});

function serviceStageLabel(branch) {
  return ['application-command:36', 'application-command:38'].includes(branch.command)
    ? controllerStageLabels[branch.id.split(':').at(-1)] || null : null;
}

function serviceDisplayLabel(entry, states, fallback) {
  return entry?.label && !/^[a-z0-9]+(?:[-:][a-z0-9]+)+$/iu.test(entry.label)
    ? entry.label : states.find(state => state.id === entry?.preview?.interface_state_id)?.label || fallback;
}

function servicePreviewComponents(parent, depth) {
  const preview = parent.servicePreview;
  if (!preview) return [];
  const seen = new Set();
  const layers = (preview.layers || []).filter(layer => ['layout', 'script'].includes(layer.kind)
    && layer.record && layer.record !== parent.recordId && !seen.has(layer.record) && seen.add(layer.record));
  const components = layers.map(layer => ({id: `${parent.id}:component:${layer.record}`,
    kind: layer.kind === 'layout' ? 'layout' : 'text', label: uiRecordComponentLabel(layer.record,
      {layout: layer.kind === 'layout', fallback: `${parent.label}文字`}),
    depth: 1, textComponents: layer.kind === 'layout', structureRecord: false,
    serviceStage: parent.serviceStage, serviceFragment: parent.serviceFragment, servicePreview: preview,
    selection: {record_id: layer.record},
    facts: layer.kind === 'layout' ? [{label: '布局记录', value: layer.record}] : [],
    controlsMarkup: layer.kind === 'layout'
      ? '<a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a>'
      : currentTextReferenceLink(layer.record),
  }));
  return interfaceComponentNodes(interfaceWindowTree(gameUiWorkbenchNodes(components, preview), [], preview), preview)
    .map(node => ({...node, depth: depth + Math.max(0, node.depth - 1)}));
}

export function serviceFlowNodes(definition) {
  const commands = new Set(definition.commandIds.map(id => `application-command:${hex(id)}`));
  const catalog = state.project?.ui?.construction?.interfaces;
  const states = catalog?.interfaces.flatMap(entry => entry.states || []) || [];
  const context = interfacePreviewContext();
  const entries = sceneServicePreviewEntries(definition.commandIds.map(command => ({command,
    instance: context.service?.command === command ? context.service.argument : 0})), context.scene?.sceneId,
    context.service?.entryHandle);
  const nodes = [{id: `${definition.id}:interface`, kind: 'screen', label: definition.label, depth: 0,
    controlsMarkup: `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a>`,
  }];
  const phases = new Map();
  for (const branch of catalog?.application_branch_sources || []) {
    if (!commands.has(branch.command) || !isTerminalDisplayBranch(branch)) continue;
    const phasePreview = entries.find(entry => (branch.bodies.length ? branch.bodies : [null])
      .some(body => entry.fragmentId === (body?.id || branch.id)))?.preview;
    const phase = phasePreview?.interface_state_id || 'other-stages';
    if (!phases.has(phase)) phases.set(phase, {label: states
      .find(state => state.id === phase)?.label || '其他阶段', branches: []});
    phases.get(phase).branches.push(branch);
  }
  for (const [phase, group] of phases) {
    nodes.push({id: `${definition.id}:phase:${phase}`, kind: 'group', label: group.label, depth: 1,
      textComponents: true, structureRecord: false});
    for (const branch of group.branches) {
      const fragments = branch.bodies.length ? branch.bodies : [null];
      const stagePreview = entries.find(entry => fragments.some(body => entry.fragmentId === (body?.id || branch.id))
        && !entry.preview?.missing?.length)?.preview;
      const previewInputs = terminalPreviewInputsMarkup(stagePreview);
      const stageLabel = serviceStageLabel(branch);
      const purpose = stageLabel || [...new Set(entries.filter(entry => fragments.some(body =>
        entry.fragmentId === (body?.id || branch.id))).map(entry => serviceDisplayLabel(entry, states, ''))
        .filter(Boolean))].slice(0, 2).join(' / ') || `${definition.label}流程`;
      const label = [...new Set(branch.bodies.map(body => uiRecordComponentLabel(body.record,
        {fallback: purpose})))].join(' / ') || purpose;
      nodes.push({id: `${definition.id}:stage:${branch.id}`, kind: 'group', depth: 2,
        label: stageLabel || `${label}步骤`, textComponents: true,
        serviceStage: branch.id,
        servicePreview: stagePreview,
        controlsMarkup: `${previewInputs}<div data-service-flow-fields="${esc(branch.command)}" data-service-flow-source="${esc(branch.id)}"></div>`,
        facts: [{label: '阶段', value: branch.id}],
      });
      for (const body of fragments) {
        const fragment = body?.id || branch.id;
        const previews = entries.filter(entry => entry.fragmentId === fragment);
        const record = body?.record;
        const label = record ? uiRecordComponentLabel(record, {fallback: purpose}) : purpose;
        const node = {id: `${definition.id}:fragment:${fragment}`, kind: record ? 'text' : 'group',
          label: `${label}${record ? '正文' : '画面'}`, depth: 3, textComponents: true, structureRecord: false, serviceFragment: fragment,
          servicePreview: previews.find(entry => !entry.preview?.missing?.length)?.preview || previews[0]?.preview,
          controlsMarkup: `${terminalPreviewInputsMarkup(previews[0]?.preview)}${record ? currentTextReferenceLink(record) : ''}`,
          ...(record ? {recordId: record, editorId: `${definition.id}:${fragment}`, editorMode: 'capacity',
            selection: {record_id: record}} : {}),
          facts: [{label: '片段', value: fragment}],
        };
        nodes.push(node);
        if (previews.length > 1) for (const [index, entry] of previews.entries()) {
          const display = {id: `${definition.id}:fragment:${fragment}:display:${index}`, kind: 'group', depth: 4,
            label: serviceDisplayLabel(entry, states, purpose),
            textComponents: true, structureRecord: false,
            recordId: record, serviceFragment: fragment, servicePreview: entry.preview};
          nodes.push({...display, recordId: null}, ...servicePreviewComponents(display, 5));
        } else nodes.push(...servicePreviewComponents(node, 4));
      }
    }
  }
  if (definition.supportingNodes?.length) nodes.push({id: `${definition.id}:controls`, kind: 'group',
    label: '功能组件', depth: 1}, ...definition.supportingNodes.map(node => ({...node, depth: 2, structureRecord: false})));
  return distinctUiComponentLabels(nodes);
}

export function serviceFlowPreview(node) {
  const preview = node?.servicePreview;
  return preview && !preview.missing?.length ? preview : null;
}

export async function bindServiceFlowFields(root) {
  for (const host of root?.querySelectorAll('[data-service-flow-fields]') || []) {
    if (host.dataset.serviceFlowMounted) continue;
    host.dataset.serviceFlowMounted = '1';
    const command = host.dataset.serviceFlowFields;
    const branch = state.project?.ui?.construction?.interfaces?.application_branch_sources
      ?.find(row => row.id === host.dataset.serviceFlowSource);
    const offsets = new Set([...(branch?.operations || []), ...(branch?.callback_reads || [])]
      .map(row => row.prg_offset ?? row.offset));
    const objects = await db.getFieldObjects(command);
    if (!host.isConnected) return;
    for (const object of objects) {
      const handles = [...new Set(object.fields.filter(field => offsets.has(Number(field.entityHandle.split(':').at(-1))))
        .map(field => field.entityHandle))];
      if (!handles.length) continue;
      const container = host.ownerDocument.createElement('div');
      host.append(container);
      await object.mount(container, {rowHandles: handles});
    }
  }
}
