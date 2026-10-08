// @editor-module 流程树按分支与步骤组织组件，组件取值与选区引用所属步骤。
import {currentTextReference} from '../../core/resource-index.js';
import {fieldMenuFlowBranches} from '../../core/field-menu-tree.js';
import {state} from '../../core/state.js';
import {textRecordEditorTokens, textRecordEditorText} from '../../core/text-record-project.js';
import {interfaceComponentNodes} from './interface-components.js';

export const fieldMenuStepKey = step => `${step.stateId}:${step.entryId || ''}`;

function componentKey(node) {
  if (node.kind === 'screen') return 'screen';
  if (node.selection?.slot_id) return `slot:${node.selection.slot_id}`;
  if (node.button) return node.id;
  if (node.id.endsWith(':cursor-reference')) return 'cursor';
  const record = node.recordId || node.selection?.record_id || node.sourceRecord
    || node.facts?.find(fact => fact.label === '布局记录')?.value;
  return record ? `${node.kind}:${record}:${JSON.stringify(node.ranges || node.selection?.ranges || [])}`
    : node.id;
}

export function fieldMenuFlowComponentNodes(flow, steps, models, activeStep) {
  const activeKey = fieldMenuStepKey(activeStep);
  const root = models[steps.indexOf(activeStep)]?.nodes.find(node => node.kind === 'screen');
  const nodes = [{...root, id: `${flow.id}:component:screen`, kind: 'screen', label: flow.label, depth: 0}];
  for (const branch of fieldMenuFlowBranches(flow, steps)) {
    nodes.push({id: branch.id, kind: 'group', label: branch.label, depth: 1,
      textComponents: true, structureRecord: false});
    for (const step of branch.steps) {
      const key = fieldMenuStepKey(step);
      nodes.push({id: `${flow.pageId}:preview-step:${key}`, kind: 'group', depth: 2,
        label: step.label, previewEntry: 'screen', screenId: step.screenId, entryId: step.entryId,
        textComponents: true, structureRecord: false, facts: [{label: '步骤', value: step.label}]});
      for (const node of models[steps.indexOf(step)].nodes.filter(node => node.kind !== 'screen'))
        nodes.push({...node, id: `${flow.id}:step:${key}:component:${componentKey(node)}`,
          depth: 2 + Math.max(1, node.depth || 1), screenId: step.screenId, stateId: step.stateId,
          entryId: step.entryId, flowStepKey: key, flowComponent: true, flowActive: key === activeKey,
          flowSourceId: node.id,
          ...(componentKey(node) === 'cursor' ? {selection: {record_id: 'selection-cursor'}} : {}),
          cursorIndex: key === activeKey ? node.cursorIndex ?? null : null,
          facts: [...(node.facts || []), {label: '步骤', value: step.label}]});
    }
  }
  return nodes;
}

function scriptText(script) {
  const bytes = script.trim().split(/\s+/u).map(byte => parseInt(byte, 16));
  return textRecordEditorText({bytes, capacity: bytes.length, protected_ranges: []},
    state.project.text_record_encoding, state.project.text_record_edits).replace(/〔[^〕]*〕/gu, '').trim();
}

function valuesForComponent(node, preview, slots) {
  if (node.id.endsWith(':component:cursor')) return preview.selection_cursor
    ? `选择 ${Number(preview.runtime_context?.choice_index ?? 0) + 1}；${preview.runtime_context?.cursor_hidden ? '隐藏' : '显示'}` : '隐藏';
  if (node.button && !node.selection?.slot_id) return node.flowActive ? node.label : '隐藏';
  const slot = slots.find(slot => slot.id === node.selection?.slot_id);
  const record = slot?.sourceRecord || node.sourceRecord || node.recordId || node.selection?.record_id;
  const layers = (preview.layers || []).filter(layer => layer.record === record);
  const ranges = node.ranges || node.selection?.ranges;
  const text = state.project?.text_record_edits?.records?.[record];
  const providers = text && ranges ? textRecordEditorTokens(text, state.project.text_record_encoding,
    state.project.text_record_edits).filter(token => [0xFA, 0xFB, 0xFC, 0xFD].includes(token.token)
      && ranges.some(range => token.offset >= range.offset && token.offset < range.offset + range.length))
    .map(token => String(token.operands[0])) : null;
  const values = layers.flatMap(layer => {
    const allowed = provider => providers ? providers.includes(provider)
      : !slot || layer.component_slot_providers?.[provider]?.id === slot.id;
    const bindings = Object.entries(layer.provider_constants || {}).filter(([provider]) => allowed(provider))
      .map(([, value]) => String(value));
    for (const [provider, pair] of Object.entries(layer.provider_record_pairs || {}))
      if (allowed(provider)) bindings.push(currentTextReference(`record:${Number(pair.region).toString(16).toUpperCase().padStart(2, '0')}:${String(pair.record).padStart(3, '0')}`).label);
    for (const [provider, target] of Object.entries(layer.provider_records || {})) {
      if (!allowed(provider)) continue;
      const supplied = layer.records?.find(record => record.id === target);
      bindings.push(supplied ? scriptText(supplied.raw_hex) : currentTextReference(target).label);
    }
    for (const [provider, script] of Object.entries(layer.provider_script_hex || {})) {
      if (!allowed(provider)) continue;
      bindings.push(scriptText(script));
    }
    return bindings;
  });
  return [...new Set(values)].join('；') || (slot?.id.startsWith('field-loadout:') ? '空' : record
    ? currentTextReference(record, node.kind === 'text'
      ? {ranges: node.ranges || node.selection?.ranges} : {}).label : '');
}

export function fieldMenuFlowComponentProjection(nodes, preview, components, slots = [], activeNodes = []) {
  const current = nodes.map(node => {
    const active = node.flowActive && activeNodes.find(active => active.id === node.flowSourceId
      || node.selection?.slot_id && active.selection?.slot_id === node.selection.slot_id);
    return active ? {...node, editors: active.editors, selection: active.selection || node.selection,
      controlsMarkup: active.controlsMarkup ?? node.controlsMarkup} : node;
  });
  const activeStep = nodes.find(node => node.flowComponent && node.flowActive);
  const flow = activeStep?.id.split(':step:')[0];
  if (flow) for (const active of activeNodes) {
    if (!active.fixedSlot || current.some(node => node.flowActive && node.selection?.slot_id === active.selection?.slot_id)) continue;
    const stepId = `${activeStep.flowStepKey}`;
    const parent = current.findIndex(node => node.previewEntry === 'screen' && fieldMenuStepKey({
      stateId: node.screenId.split(':state:')[1], entryId: node.entryId}) === stepId);
    let end = parent + 1;
    while (end < current.length && current[end].depth > 2) end++;
    current.splice(end, 0, {...active, id: `${flow}:step:${stepId}:component:${componentKey(active)}`,
      depth: 2 + Math.max(1, active.depth || 1), screenId: activeStep.screenId, entryId: activeStep.entryId,
      flowStepKey: stepId,
      flowComponent: true, flowActive: true, flowSourceId: active.id,
      facts: [...(active.facts || [])]});
  }
  return interfaceComponentNodes(current, preview, components, slots).map(node => {
    if (!node.flowComponent) return node;
    const bounds = node.flowActive ? node.drawnBounds : null;
    return {...node, drawnBounds: bounds,
      facts: [...node.facts, {label: '显示', value: bounds ? '显示' : '隐藏'},
        ...(bounds ? [{label: '位置', value: `${bounds.x}, ${bounds.y}`},
          {label: '尺寸', value: `${bounds.width} × ${bounds.height}`}] : []),
        {label: '当前值', value: bounds ? valuesForComponent(node, preview, slots) || '—' : '—'},
        ...(node.selection?.slot_id?.startsWith('field-loadout:equipment:') ? [{label: '装备标记',
          value: preview.equipment_slot_values?.[Number(node.selection.slot_id.split(':').at(-1))]?.marker_visible
            ? '显示' : '隐藏'}] : [])],
    };
  });
}
