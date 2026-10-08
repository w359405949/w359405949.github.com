// @editor-module 商店组件树引用当前画面的文字、窗口与定长槽位。
import {state} from '../../core/state.js';
import {textRecordComponents, textRecordEditorTokens, itemNameRecordId} from '../../core/text-record-project.js';
import {db} from '../../core/project-db.js';
import {uiTextComponentLabel, uiRecordComponentLabel, uiImageComponentLabel} from '../../core/ui-component-labels.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../../core/field-submenu-code-sources.js';
import {interfaceTextSlot} from '../../render/interface-slots.js';
import {fieldMenuIconNodes} from './field-menu.js';

import {interfaceStateTree} from '../../render/interface-state-tree.js';
import {interfaceBoundsOverlap as overlaps, intersectInterfaceBounds as intersect,
  interfaceComponentBounds as boundsOf} from '../../render/interface-state-regions.js';

async function goodsWidgets(region, components, record, family) {
  if (!['item', 'shell'].includes(family.value_namespace?.namespace)) return [];
  const names = ['shop-goods-page-size', 'shop-goods-origin', 'service-list-row-step', 'shop-goods-row-record'];
  const values = await fieldSubmenuCodeValues(names), read = name => fieldSubmenuCodeValue(values, name);
  const rowRecord = `record:02:${String(read('shop-goods-row-record')).padStart(3, '0')}`;
  if (!components.some(component => component.recordId === rowRecord)) return [];
  const shells = family.value_namespace?.namespace === 'shell' ? await db.getResourceDocument('shell-record') : null;
  const start = Math.min(Math.max(0, (region.preview.runtime_context?.shop_item_index || 0)
    - read('shop-goods-page-size') + 1), record.slots.length - 1);
  return Array.from({length: read('shop-goods-page-size')}, (_, index) => {
    const itemSlot = start + index < record.slots.length ? start + index : null;
    const value = record.slots[itemSlot]?.value;
    const item = state.project.game_data.items.records.find(item => item.id === value);
    const nameRecord = shells ? `record:${shells.name_region.asset_id.split('.').at(-1).toUpperCase()}:${String(value).padStart(3, '0')}`
      : item && itemNameRecordId(item);
    const slot = interfaceTextSlot(`list:goods:${index}`, `商品 ${index + 1}`,
      read('shop-goods-origin') + index * read('service-list-row-step'), {width: 144, pixelYOffset: -8});
    const sources = components.filter(row => row.recordId === nameRecord && overlaps(row.bounds, slot.bounds));
    const priceSources = components.filter(row => itemSlot != null && row.recordId === rowRecord && row.offset > 0)
      .flatMap(row => {const bounds = intersect(row.bounds, slot.bounds); return bounds ? [{...row, bounds}] : [];});
    return [{...slot, kind: 'group', depth: 2, region: region.id, itemSlot, components: [...sources, ...priceSources]},
      {id: `${slot.id}:name`, label: '商品名称', kind: 'text', depth: 3, region: region.id,
        itemSlot, bounds: boundsOf(sources) || {...slot.bounds, width: 112}, components: sources},
      {id: `${slot.id}:price`, label: '价格', kind: 'dynamic', depth: 3, region: region.id,
        itemSlot, price: true, bounds: boundsOf(priceSources) || {...slot.bounds,
          x: slot.bounds.x + 112, width: 32}, components: priceSources}];
  }).flat();
}

export async function genericShopWidgets(result, node, record, family) {
  return interfaceStateTree({label: node.label, regions: result?.regions, includeEmpty: false}, async (region, components, ancestors) => {
    const widgets = [];
    const layouts = components.filter(row => row.recordId?.startsWith('record:03:'));

    if (region.id === 'selection') {
      const slots = (region.slots || []).filter(slot => /^submenu-(role|vehicle):/u.test(slot.id)
        && overlaps(slot.bounds, region.bounds));
      if (slots.length) {
        for (const slot of slots) {
          const bounds = intersect(slot.bounds, region.bounds);
          if (bounds) widgets.push({...slot, bounds, kind: 'dynamic', depth: 2, region: region.id,
            components: components.filter(row => overlaps(row.bounds, bounds))});
        }
      } else {
        const preview = state.project.ui.construction.menu_dispatch_data.previews.find(row =>
          row.interface_state_id === 'field-command-menu.main');
        for (const icon of fieldMenuIconNodes(preview)) {
          const bounds = intersect(icon.selection.bounds, region.bounds);
          if (bounds) widgets.push({...icon, labelMarkup: null, bounds, depth: 2, region: region.id,
            components: components.filter(row => overlaps(row.bounds, bounds))});
        }
      }
      return {layoutComponents: layouts, children: widgets};
    }
    const goods = region.id === 'list' ? await goodsWidgets(region, components, record, family) : [];
    widgets.push(...goods);
    const consumed = new Set(goods.flatMap(widget => widget.components.map(row => row.recordId)));
    const leaves = components.filter((component, index) => !components.slice(index + 1).some(other =>
      other.recordId !== component.recordId && JSON.stringify(other.bounds) === JSON.stringify(component.bounds)));
    const body = [];
    for (const recordId of new Set(leaves.map(component => component.recordId))) {
      if (recordId?.startsWith('record:03:')) continue;
      if (consumed.has(recordId)) continue;
      const record = state.project.text_record_edits?.records?.[recordId];
      const parts = record ? textRecordComponents(record, state.project.text_record_encoding,
        state.project.text_record_edits) : [];
      if (!parts.length) {
        const sources = leaves.filter(row => row.recordId === recordId), bounds = boundsOf(sources);
        if (bounds) widgets.push({id: `${region.id}:${recordId || 'image'}`, label: uiImageComponentLabel(recordId),
          kind: 'image', region: region.id, depth: 2, bounds, components: sources});
        continue;
      }
      for (const [index, part] of parts.entries()) {
        const sources = leaves.filter(row => row.recordId === recordId
          && part.ranges.some(range => row.offset >= range.offset && row.offset < range.offset + range.length));
        if (!sources.length) continue;
        const literal = record && textRecordEditorTokens(record, state.project.text_record_encoding,
          state.project.text_record_edits).some(token => token.kind === 'text'
            && part.ranges.some(range => token.offset >= range.offset && token.offset < range.offset + range.length));
        if (region.id === 'dialogue' && literal) {body.push(...sources); continue;}
        const rows = region.id === 'list' || region.id === 'selection'
          ? [...new Set(sources.map(row => row.bounds.y))] : [null];
        for (const [rowIndex, y] of rows.entries()) {
          const rowSources = y == null ? sources : sources.filter(row => row.bounds.y === y);
          const ranges = rowSources.map(row => ({offset: row.offset, length: row.length}));
          widgets.push({id: `${region.id}:${recordId}:${index}:${rowIndex}`, kind: part.kind, depth: 2,
            label: region.id === 'name' && recordId.startsWith('record:11:')
              ? [...ancestors, ...widgets].some(widget => widget.label === '店名') ? '商店类别' : '店名'
              : uiTextComponentLabel(record, {...part, ranges}, region.preview) || uiRecordComponentLabel(recordId),
            region: region.id, bounds: boundsOf(rowSources), components: rowSources});
        }
      }
    }
    if (body.length) widgets.push({id: `${region.id}:body`, label: '对话正文', kind: 'text', depth: 2,
      region: region.id, bounds: boundsOf(body), components: body});
    for (const slot of region.slots || []) {
      const bounds = intersect(slot.bounds, region.bounds);
      if (!bounds) continue;
      const existing = [...ancestors, ...widgets].find(widget => widget.id === slot.id);
      if (existing) {
        existing.bounds = boundsOf([{bounds: existing.bounds}, {bounds}]);
        existing.components.push(...components.filter(row => overlaps(row.bounds, bounds)));
        continue;
      }
      widgets.push({...slot, bounds, kind: 'dynamic', depth: 2, region: region.id,
        components: components.filter(row => overlaps(row.bounds, bounds))});
    }
    return {layoutComponents: layouts, children: widgets};
  });
}
