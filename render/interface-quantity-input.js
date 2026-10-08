// @editor-module 数量协议在同一预览快照中保留上限、输入与接受值。
export function prepareInterfaceQuantity(state, maximum, kind) {
  if (!Number.isInteger(maximum) || maximum < 0 || maximum > 65535)
    throw new RangeError('数量上限缺少已确认的整数范围');
  state.execution.quantity = {kind, maximum, value: 0, accepted: null};
  state.context.service_amount = 0;
}

export function setInterfaceQuantity(state, value) {
  const quantity = state.execution.quantity;
  if (!quantity || !Number.isInteger(value) || value < 0 || value > quantity.maximum)
    throw new RangeError('数量须在当前容量范围内');
  quantity.value = value; quantity.accepted = null;
  state.context.service_amount = value;
  return state;
}

export function acceptInterfaceQuantity(state) {
  const quantity = state.execution.quantity;
  quantity.accepted = quantity.value;
  return quantity.accepted;
}
