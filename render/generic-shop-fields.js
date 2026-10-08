// @editor-module 商店组件声明所属商品、价格与正文的字段控件绑定。
export function genericShopWidgetFields(widget, {mode, record, family}) {
  const bindings = [];
  if (widget.region !== 'list' || !(widget.kind === 'layout' || widget.itemSlot != null)
      || !(mode?.startsWith('goods-') || ['herbal-goods', 'decoration-list'].includes(mode))) return bindings;
  if (!widget.price) bindings.push({resource: 'facility-config', handle: record.id,
    ...(widget.itemSlot != null ? {columns: [`slot:${widget.itemSlot}`]} : {options: {sceneInteractionConfiguration: true}})});
  const domain = family.value_namespace?.namespace;
  const slots = widget.itemSlot != null ? [record.slots[widget.itemSlot]] : record.slots;
  if (['item', 'shell'].includes(domain) && (widget.price || widget.kind !== 'text')) {
    for (const id of [...new Set(slots.map(slot => slot.value))]) {
      const hex = Number(id).toString(16).toUpperCase().padStart(2, '0');
      bindings.push({resource: domain === 'item' ? 'item-entry' : 'shell-record',
        handle: domain === 'item' ? `item-entry:item:${hex}` : `shell:${hex}`,
        columns: ['price.raw_code'], separate: true});
    }
  }
  return bindings;
}
