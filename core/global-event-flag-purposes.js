// @editor-module 从符号表注释派生事件位用途。
export const globalEventFlagHandle = id => `global-event-flag:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;

export function globalEventFlagPurposes(annotations) {
  const labels = new Map(annotations.filter(row => row.binding?.slot === 1
    && Number.isInteger(row.binding.flag_id) && !/treasure/u.test(row.field_id || '')
    && row.semantic_status !== 'unproven' && !/查不实|未知|未确认/u.test(row.binding.label || ''))
    .map(row => [row.binding.flag_id, {label: row.binding.label,
      purposeTextReference: row.binding.purpose_text_reference}]));
  return Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id),
    ...(labels.get(id) || {label: '未知用途'})}));
}
