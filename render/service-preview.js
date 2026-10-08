// @editor-module 服务状态组装发布的分支来源并保留缺口。
import {state} from "../core/state.js";
import {resolveFacilityBranchPreview} from "../core/facility-branch-preview.js";
import {facilityServiceStatePreviews} from "../core/facility-service-previews.js";
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {controllerServicePreview} from '../core/terminal-service-previews.js';
import {isTerminalDisplayBranch} from '../core/terminal-service-branches.js';

function serviceBodyPreview(branch, body, invocation = {}, windowContext = null) {
  const catalog = state.project?.ui?.construction?.interfaces;
  return resolveFacilityBranchPreview(catalog, branch, body, {invocation, windowContext});
}

function serviceStatePreviews(branch, body, invocation) {
  return facilityServiceStatePreviews(branch, body,
    state.project?.ui?.construction?.menu_dispatch_data?.previews, invocation,
    state.project?.ui?.construction?.interfaces?.application_branch_sources);
}

export function serviceInvocation(application, sceneId, entryHandle, facilities = state.project?.facilities) {
  const invocation = {sceneId, argument: application.instance, entryHandle};
  if (entryHandle || ![0x36, 0x37, 0x38].includes(application.command)) return invocation;
  const instances = facilities?.facilities
    ?.find(row => row.id === 'computer-controller')?.instances || [];
  const candidates = instances.filter(row => row.command_id === application.command
    && (sceneId == null || row.scene_id === sceneId));
  const entry = candidates.find(row => row.instance_id === application.instance)
    || (sceneId == null ? candidates[0] : null);
  if (!entry) return invocation;
  return {...invocation, sceneId: entry.scene_id, argument: entry.instance_id,
    entryHandle: `scene:${entry.scene_id.toString(16).toUpperCase().padStart(2, '0')}:investigation:${entry.point_id.toString(16).toUpperCase().padStart(2, '0')}`};
}

export function sceneServicePreviewEntries(applications, sceneId, entryHandle = null) {
  const catalog = state.project?.ui?.construction?.interfaces;
  return (applications || []).flatMap(application => {
    const command = `application-command:${Number(application.command).toString(16).toUpperCase().padStart(2, '0')}`;
    const invocation = serviceInvocation(application, sceneId, entryHandle);
    return (catalog?.application_branch_sources || []).filter(branch => branch.command === command
      && branch.disposition?.status !== 'unreachable' && isTerminalDisplayBranch(branch))
      .flatMap(branch => (branch.bodies.length ? branch.bodies : [null]).flatMap(body => {
        const confirmed = serviceStatePreviews(branch, body, invocation);
        return confirmed.length ? confirmed.map(preview => ({
          fragmentId: body?.id || branch.id,
          record: body?.record || null, label: preview.visible_state || preview.id, preview,
        })) : [{fragmentId: body?.id || branch.id, record: body?.record || null, label: body?.id || branch.id,
          preview: serviceBodyPreview(branch, body, invocation)}];
      }));
  });
}

export function resolveServicePreview(preview, screen, definition, selection = null) {
  const context = interfacePreviewContext();
  if (['constructor:noah-password-terminal', 'constructor:noah-password-terminal-result'].includes(preview?.id)) {
    const instances = state.project?.facilities?.facilities?.find(row => row.id === 'computer-controller')?.instances || [];
    const entry = instances.find(row => row.command_id === 0x37 && row.scene_id === context.scene?.sceneId
      && row.instance_id === context.service?.argument);
    const entryHandle = entry ? `scene:${entry.scene_id.toString(16).toUpperCase().padStart(2, '0')}:investigation:${entry.point_id.toString(16).toUpperCase().padStart(2, '0')}`
      : 'scene:CD:investigation:63';
    const resolved = controllerServicePreview(state.project.ui.construction.menu_dispatch_data.previews,
      `application-dialogue-flow:37:segment:${preview.id.endsWith('-result') ? '05' : '00'}`, {entryHandle});
    if (resolved) preview = {...resolved, interface_state_id: preview.interface_state_id,
      interface_state_ids: preview.interface_state_ids};
  }
  if (preview && context.service && definition?.commandIds?.includes(context.service.command)) {
    preview = {...preview, facility_call_context: {...preview.facility_call_context,
      ...(context.scene ? {sceneId: context.scene.sceneId} : {}), argument: context.service.argument},
      runtime_context: {...preview.runtime_context, shop_instance: context.service.argument,
        facility_instance: context.service.argument}};
  }
  if (!definition?.commandIds?.length || preview && !preview.structural) return preview;
  const catalog = state.project?.ui?.construction?.interfaces;
  const interfaceState = (catalog?.interfaces || []).flatMap(owner => owner.states || [])
    .find(candidate => candidate.id === screen?.interface_state_id);
  const records = (interfaceState?.evidence?.records || []).map(record => record.id);
  const selected = selection?.record_id;
  const requested = selected && records.includes(selected) ? [selected] : records;
  const commands = new Set(definition.commandIds.map(id =>
    `application-command:${id.toString(16).toUpperCase().padStart(2, "0")}`));
  for (const record of requested) {
    for (const branch of catalog?.application_branch_sources || []) {
      if (!commands.has(branch.command)) continue;
      const body = branch.bodies.find(candidate => candidate.record === record);
      if (!body) continue;
      const invocation = {...preview?.facility_call_context,
        ...(context.scene ? {sceneId: context.scene.sceneId} : {}),
        ...(context.service && definition.commandIds.includes(context.service.command)
          ? {argument: context.service.argument} : {})};
      const confirmed = serviceStatePreviews(branch, body, invocation);
      const resolved = confirmed.find(candidate => candidate.interface_state_id === screen?.interface_state_id)
        || confirmed[0];
      if (resolved) return resolved;
      return {...serviceBodyPreview(branch, body, invocation,
        preview?.facility_window_context), id: screen.id,
        viewport: {x: 0, y: 0, width: 256, height: 240},
      };
    }
  }
  return preview;
}
