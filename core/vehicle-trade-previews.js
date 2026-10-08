// @editor-module 售车片段引用已确认的金额输入与交易回应构造。
const sources = new Map([
  ['application-dialogue-flow:2C:segment:00', 'amount'],
  ['application-dialogue-flow:2C:segment:01', 'amount'],
  ['application-dialogue-flow:2C:segment:02:action:00', 'insufficient'],
  ['application-dialogue-flow:2C:segment:03', 'decision'],
  ['application-dialogue-flow:2C:segment:04:action:00', 'rejected'],
  ['application-dialogue-flow:2C:segment:05:action:00', 'accepted'],
  ['application-dialogue-flow:2C:segment:05:action:01', 'warning'],
]);

export function vehicleTradeServicePreview(branch, body, previews, invocation = {}) {
  const source = body?.id || branch?.id;
  const kind = sources.get(source);
  if (!kind) return null;
  const template = previews?.find(row => row.id === `constructor:vehicle-trade-${kind === 'decision' ? 'rejected' : kind}`);
  if (!template) return null;
  return {...structuredClone(template), id: `constructor:${source}`,
    source_binding: source, source_branch: branch.id,
    vehicle_trade: {kind, ...(kind === 'decision' ? {
      default_amount: 60000, accepted_handle: 'application-command:2C:text-record:204702',
      rejected_handle: 'application-command:2C:text-record:204699',
    } : {})},
    facility_call_context: {...invocation}, confirmation_status: 'confirmed', structural: false,
    preview_basis: 'confirmed-service-state', missing: [], facility_preview_gaps: [],
    confirmed_state_binding: {preview_id: template.id, source, scope: 'registered-display-phase-only'}};
}
