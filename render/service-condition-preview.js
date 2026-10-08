// @editor-module 服务条件只为当前预览准备临时字段与选择。
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {terminalPreviewState} from '../core/terminal-preview-state.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {facilityRuntimeCodeValues} from '../core/facility-runtime-code-sources.js';
import {constructServicePreviewState} from '../core/service-preview-state.js';
import {servicePreviewConditionSources} from '../core/service-preview-conditions.js';

export async function resolveServiceConditionPreview(preview, {readCodeField} = {}) {
  if (preview.service_preview_state) return preview;
  const conditions = servicePreviewConditionSources(preview,
    state.project?.ui?.construction?.menu_dispatch_data?.previews || []).flatMap(source =>
    source.conditions.map(condition => ({...condition, construct: env => {
      const original = env.preview;
      env.preview = source.preview;
      condition.construct(env);
      env.preview = original;
    }})));
  if (!conditions.length) return preview;
  const assets = new Set(conditions.flatMap(condition => condition.assets || []));
  const names = [...new Set(conditions.flatMap(condition => condition.codes || []))];
  const runtimeNames = [...new Set(conditions.flatMap(condition => condition.runtimeCodes || []))];
  const [fields, rawCodes, runtimeCodes, items, shells, overlays] = await Promise.all([
    ensureSaveCurrentFieldObjects(state), fieldSubmenuCodeValues(names, readCodeField),
    facilityRuntimeCodeValues(runtimeNames, readCodeField),
    assets.has('items') ? db.getResourceDocument('item-entry') : null,
    assets.has('shells') ? db.getResourceDocument('shell-record') : null,
    assets.has('overlays') ? db.getResourceDocument('shared-indexed-byte-overlays') : null,
  ]);
  return constructServicePreviewState(preview, {fields, context: interfacePreviewContext(),
    terminal: preview.terminal_response?.lottery || preview.vehicle_trade ? terminalPreviewState(preview) : {}, items, shells,
    codes: {...Object.fromEntries(names.map(name => [name, fieldSubmenuCodeValue(rawCodes, name)])),
      ...runtimeCodes, ammunition_capacities: overlays?.level_value_codebook,
      ammunition_capacity_zero: overlays?.zero_prefixed_ascending_bit_masks?.[0]}}, conditions);
}
