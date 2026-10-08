// @editor-module 设施分支只组装发布的来源并保留逐项缺口。
import {executeFacilityCallState} from './facility-helper-semantics.js';

const gapLabels = {
  'branch-condition': '自然入口与分支选择未确认',
  'runtime-palette-binding': '分支显示阶段与调色板效果未绑定',
  'body-window-effects': '正文与窗口调用阶段未确认',
  'body-geometry': '正文几何来源缺失',
  'callback-body-geometry': '回调正文起点未确认',
  'callback-pointer-effects': '回调脚本指针效果未确认',
  'transitive-callback-semantics': '传递回调语义未确认',
  'callback-window-effects': '回调窗口效果未确认',
  'opcode-window-effects': '控制指令窗口效果未确认',
  'indexed-branch-call-state': '索引分支调用状态未确认',
  'runtime-record-selection': '运行正文选择未绑定',
  'parameter-values': '正文参数存在未绑定字段公式',
  'inherited-window-state': '窗口缺少当前继承现场',
  'window-construction-program': '分支窗口提交顺序未绑定',
  'glyph-cache-stage': '字形缓存选择与复用阶段未绑定，仅有默认线性分配来源',
  'display-phase': '显示阶段缺少当前现场',
  'body-preview': '该正文尚无构建预览',
  'segment-call-entry': '分段调用入口未确认',
};

function facilityBranchGaps(branch, body = null, windowContext = null) {
  if (branch?.disposition?.status === 'unreachable') return [];
  const missing = new Set([...(branch?.missing || []), ...(body?.missing || [])]);
  if (!branch?.runtime_execution_confirmed) missing.add('branch-condition');
  if (body && !body.preview) missing.add('body-preview');
  if (!windowContext?.state) {
    missing.add('inherited-window-state');
    missing.add('glyph-cache-stage');
    missing.add('display-phase');
  }
  if (!Array.isArray(windowContext?.program)) missing.add('window-construction-program');
  return [...missing].map(kind => ({kind, source: body?.id || branch?.id,
    reason: gapLabels[kind] || `尚缺来源：${kind}`}));
}

function facilityBranchFieldSources(catalog, branch, body = null) {
  const steps = branch?.call_state_program || [];
  const helpers = [...(catalog?.application_helper_sources || []), ...(catalog?.application_control_sources || [])];
  return {
    entry_chain: branch?.entry_chain || [],
    execution_role: branch?.execution_roles || [],
    read_condition: branch?.application_read_condition || null,
    callback_reads: branch?.callback_reads || [],
    callback_continuation: branch?.callback_continuation || null,
    body: body ? {selection: body.selection, records: body.records,
      geometry: body.geometry_reference, parameters: body.parameters} : null,
    window: branch?.window || null,
    calls: steps.map(step => ({...step,
      implementation_source: helpers.find(helper => helper.id === step.helper)?.source || null})),
    construction: branch?.construction_sources || null,
    window_routines: steps.flatMap(step => step.window_routine ? [
      catalog?.application_window_sources?.routines?.find(row => row.id === step.window_routine.id),
    ].filter(Boolean) : []),
    glyph_cache: catalog?.application_window_sources?.glyph_cache || null,
    palette: branch?.palette_binding || null,
    frame_commit: {catalog: catalog?.application_window_sources?.runtime_sources?.frame_commit || null,
      scope: catalog?.frame_commit_sources?.confirmed_scope || null,
      excluded: catalog?.frame_commit_sources?.excluded || []},
  };
}

export function resolveFacilityBranchPreview(catalog, branch, body = null, {
  invocation = {}, windowContext = null,
} = {}) {
  if (!branch) return null;
  const steps = branch.call_state_program || [];
  const bodyIndex = body ? steps.findIndex(step => step.action === body.id) : -1;
  const prefix = bodyIndex >= 0 ? steps.slice(0, bodyIndex) : steps;
  const helpers = [...(catalog?.application_helper_sources || []), ...(catalog?.application_control_sources || [])];
  const input = {...windowContext?.state, ...invocation};
  const callState = windowContext?.continuation ? {status: 'available', state: structuredClone(input), effects: []}
    : prefix.length || !body ? executeFacilityCallState({...branch, call_state_program: prefix},
      helpers, input, catalog?.application_window_sources)
      : {status: 'available', state: structuredClone(input), effects: []};
  const context = callState.status === 'available' ? {...invocation, ...callState.state} : invocation;
  const gaps = facilityBranchGaps(branch, body, windowContext);
  if (callState.status !== 'available') gaps.push(...(callState.missing || []).map(kind => ({
    kind: 'call-state', source: callState.stopped_at, reason: `调用状态缺少：${kind}`,
  })));
  return {...(body?.preview || {}), id: `constructor:${body?.id || branch.id}`,
    disposition: branch.disposition || null,
    source_binding: body?.id || null, source_branch: branch.id,
    scope: body ? 'body-occurrence-only' : 'conditional-segment-call-effects',
    confirmation_status: branch.confirmation_status, runtime_execution_confirmed: branch.runtime_execution_confirmed,
    structural: true, preview_basis: 'published-application-sources',
    field_sources: facilityBranchFieldSources(catalog, branch, body),
    branch_call_state: callState, control_surface: branch.control_surface,
    facility_call_context: invocation, facility_parameter_context: context,
    facility_palette_context: context,
    facility_palette_binding: branch.palette_binding,
    ...(windowContext ? {facility_window_context: {...structuredClone(windowContext),
      state: callState.status === 'available' ? callState.state : structuredClone(windowContext.state)}} : {}),
    facility_preview_gaps: [...gaps, ...(body?.callback_pointer_gaps || [])],
    missing: [...new Set(gaps.map(gap => gap.kind))],
    layers: (body?.preview?.layers || []).map(layer => ({...layer,
      facility_parameter_context: {...layer.facility_parameter_context, ...context}})),
  };
}
