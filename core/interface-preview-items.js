// @editor-module 临时物品只覆盖界面预览的取值，不写字段对象。

export function interfacePreviewItemValue(preview, source, value) {
  const override = preview?.runtime_context?.item_overrides?.[source];
  if (!override) return value;
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return override.value ?? value;
  return value.map((entry, index) => {
    const selected = override[index];
    return selected === undefined ? entry : entry && typeof entry === 'object'
      ? {...entry, item_id: selected} : selected;
  });
}

export function registerInterfacePreviewItem(preview, id, source, value, index = null, extra = {}) {
  if (!preview.runtime_context?.item_overrides) return;
  const slots = preview.preview_item_slots ||= {};
  slots[id] = {source, value, index, ...extra};
}
