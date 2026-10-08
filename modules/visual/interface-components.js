// @editor-module 组件身份来自构造，选区引用构造区域与当前绘制结果。
import {paintUiConstructionSemanticPreview, uiComponentSelectionBounds, UI_PREVIEW_VIEWPORT} from './ui-construction-preview.js';

function screenBounds(bounds) {
  const viewport = UI_PREVIEW_VIEWPORT;
  const x = Math.max(bounds.x, viewport.x), y = Math.max(bounds.y, viewport.y);
  const right = Math.min(bounds.x + bounds.width, viewport.x + viewport.width);
  const bottom = Math.min(bounds.y + bounds.height, viewport.y + viewport.height);
  return right > x && bottom > y ? {x: x - viewport.x, y: y - viewport.y,
    width: right - x, height: bottom - y} : null;
}

function drawnBounds(node, components, slots) {
  if (node.kind === 'screen') return {...UI_PREVIEW_VIEWPORT};
  if (node.selection?.slot_id) return slots.filter(slot => slot.id === node.selection.slot_id)
    .map(slot => screenBounds(slot.bounds)).filter(Boolean).reduce((bounds, next) => {
      if (!bounds) return next;
      const x = Math.min(bounds.x, next.x), y = Math.min(bounds.y, next.y);
      return {x, y, width: Math.max(bounds.x + bounds.width, next.x + next.width) - x,
        height: Math.max(bounds.y + bounds.height, next.y + next.height) - y};
    }, null);
  if (node.selection?.bounds) {
    const bounds = screenBounds(node.selection.bounds);
    const record = node.sourceRecord || node.recordId;
    return bounds && components.some(source => (!record || source.recordId === record)
      && source.bounds.x < bounds.x + bounds.width
      && source.bounds.x + source.bounds.width > bounds.x && source.bounds.y < bounds.y + bounds.height
      && source.bounds.y + source.bounds.height > bounds.y) ? bounds : null;
  }
  const record = node.id.endsWith(':cursor-reference') ? 'selection-cursor'
    : node.selection?.record_id || node.recordId || (node.kind === 'layout'
      ? node.facts?.find(fact => fact.label === '布局记录')?.value : null);
  return record ? uiComponentSelectionBounds(components, {record_id: record,
    ranges: node.selection?.ranges || node.ranges}) : null;
}

export function interfaceComponentNodes(nodes, preview, components = null, slots = []) {
  const available = nodes.filter(node => node.kind !== 'state'
    && !node.id.includes(':runtime:') && !node.id.includes(':preview:'));
  if (!preview || !components) return available;
  return available.map(node => ({...node, drawnBounds: drawnBounds(node, components, slots)}));
}

async function interfaceComponentProjection(nodes, preview) {
  if (!preview) return {nodes: interfaceComponentNodes(nodes, preview), components: null};
  const canvas = document.createElement('canvas');
  const result = await paintUiConstructionSemanticPreview(canvas, {...preview, selection: null});
  return {nodes: interfaceComponentNodes(nodes, preview, result.components, result.slots), components: result.components};
}

export async function interfaceComponentBounds(node, preview) {
  if (!node || !preview) return null;
  if (Object.hasOwn(node, 'drawnBounds')) return node.drawnBounds;
  const result = await interfaceComponentProjection([node], preview);
  return result.nodes[0]?.drawnBounds || null;
}
