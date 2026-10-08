// @editor-module 保管物预览按当前字段取得物品与配对状态。
export function storagePreviewEntries(fields, slot, {sorted = false} = {}) {
  const entries = Array.from({length: 64}, (_, index) => ({
    id: fields.object(`save.slot.${slot}.property_storage.item.${index}`).value,
    condition: fields.object(`save.slot.${slot}.property_storage.paired_condition.${index}`).value,
  }));
  return sorted ? entries.sort((left, right) => right.id - left.id) : entries;
}
