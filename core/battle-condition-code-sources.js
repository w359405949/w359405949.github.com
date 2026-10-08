// @editor-module 异常状态调用的游标值引用 battle-engine 已登记的只读字段。
export const BATTLE_CONDITION_CODE_PARAMETERS = Object.freeze(
  Array.from({length: 9}, (_, index) => Object.freeze({
    resource_id: 'battle-engine', entity_handle: `battle-engine:condition-cursor:${index}`,
    field: 'value', physical: Object.freeze({space: 'prg', offset: 0x2FD98 + index,
      length: 1, end_exclusive: 0x2FD99 + index}),
  })),
);

export async function battleConditionCursors(readField) {
  const fields = await Promise.all(BATTLE_CONDITION_CODE_PARAMETERS.map(source => readField(source)));
  return fields.map(field => field.value);
}
