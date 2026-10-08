// @editor-module 八槽携带栏按已确认的首零计数与移位协议处理。
export function carriedInventoryCount(items) {
  const first = items.indexOf(0);
  return first < 0 ? items.length : first;
}

export function removeCarriedItem(items, index) {
  if (items.length !== 8 || !Number.isInteger(index) || index < 0 || index >= carriedInventoryCount(items))
    throw new RangeError('所选道具不在当前八槽携带栏');
  const result = [...items];
  result.splice(index, 1); result.push(0);
  return result;
}
