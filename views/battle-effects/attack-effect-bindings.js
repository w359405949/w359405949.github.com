// @editor-module 攻击特效编辑器读取当前 target 的写回边界
/**
 * Return the published component count for one semantic asset in the active
 * browser target.  `null` means the project/target metadata is not available;
 * zero means it is available and the asset has no binding.
 */
export function attackEffectBindingComponentCount(manifest, resourceId) {
  const targetId = manifest?.default_target;
  const bindings = targetId
    ? manifest?.targets?.[targetId]?.bindings?.bindings
    : null;
  if (!Array.isArray(bindings)) return null;
  return bindings
    .filter(item => item?.asset_id === resourceId)
    .reduce((total, binding) => total + (binding.input?.components || []).length, 0);
}
