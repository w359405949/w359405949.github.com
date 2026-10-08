// @editor-module 清洗按当前队伍战车清除状态与特殊携带物并记录服务返回。
function washServiceVehicles(fields, slot) {
  return [...fields[`save.slot.${slot}.entity_scene_object_slots`].slice(0, 4)].filter(id => id < 128);
}

export function completeVehicleWash(state) {
  const key = suffix => `save.slot.${state.context.slot}.${suffix}`;
  const get = suffix => {
    const id = key(suffix);
    if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
    return state.fields[id];
  };
  const put = (suffix, value) => {state.fields[key(suffix)] = value;};
  const targets = [];
  for (const vehicle of washServiceVehicles(state.fields, state.context.slot)) {
    const prefix = `vehicle.${vehicle}`;
    put(`${prefix}.condition_raw`, 0); put(`${prefix}.acid`, 0);
    const values = Array.from({length: 8}, (_, index) => get(`${prefix}.item.${index}`));
    const removed = values.filter(id => id === 0xDC || id === 0xDD);
    const weight = (get(`${prefix}.chassis_weight`) - 10 * removed.filter(id => id === 0xDD).length) & 0xFFFF;
    const kept = values.filter(id => id !== 0xDC && id !== 0xDD);
    while (kept.length < 8) kept.push(0);
    kept.forEach((id, index) => put(`${prefix}.item.${index}`, id));
    put(`${prefix}.chassis_weight`, weight);
    targets.push({vehicle, removed, weight});
  }
  put('global_event_flag.00', 1);
  state.domainResults.wash = {targets, quote: state.execution.quote, callbackStatus: 'returned',
    evidence: 'project/evidence/reverse-engineering/special-service-round2/observations.json#wash'};
  state.execution.transactions.push({type: 'wash', quote: state.execution.quote, targets});
}
