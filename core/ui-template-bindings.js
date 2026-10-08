// @editor-module 按状态、记录与自有场景选择已发布的界面模板绑定。
export function uiTemplateBindings(library) {
  return (library?.bindings || []).flatMap(binding => [binding,
    ...(binding.record_variants || []).map(variant => ({...variant,
      state: binding.state, interface: binding.interface})),
  ]);
}

export function uiTemplateBinding(library, stateId, {
  templateId = "", recordIds = [], sceneId = "",
} = {}) {
  const primary = library?.bindings?.find(binding => binding.state === stateId);
  if (!primary) return null;
  let candidates = uiTemplateBindings(library).filter(binding => binding.state === stateId);
  if (templateId) candidates = candidates.filter(binding => binding.template === templateId);
  if (sceneId) {
    const witnessed = candidates.filter(binding => library.templates?.find(
      template => template.id === binding.template)?.source?.scene === sceneId);
    if (witnessed.length) candidates = witnessed;
    else if (primary.record_variants?.length || templateId) return null;
    else if (!templateId && !recordIds.length) return primary;
  }
  if (recordIds.length) {
    const located = candidates.filter(binding => recordIds.every(record => [
      ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id || fill.record),
      ...(binding.deferred_records || []),
    ].includes(record)));
    if (located.length) candidates = located;
    else if (!templateId) return primary;
    else return null;
  }
  if (!templateId && !recordIds.length && !sceneId) return primary;
  return candidates.length === 1 ? candidates[0] : null;
}

export function uiScreenTemplateBinding(library, screen) {
  const sceneId = screen?.runtime_preview?.scene_id || String(screen?.runtime_preview?.path || "")
    .match(/(?:^|\/)scenes\/([^/]+)\/[^/]+$/)?.[1] || "";
  return uiTemplateBinding(library, screen?.interface_state_id, {sceneId});
}
