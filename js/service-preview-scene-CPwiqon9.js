import { fieldSubmenuCodeSource, db } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { interfacePreviewContext, selectInterfacePreviewBoundScene } from './element-tree-C1bWRgTl.js';
import { executeFacilityWindowRoutine, resumeFacilityWindowCycle, enumerateSceneInteractionObjects, sceneInteractionDestinations } from './battle-result-state-machine-BbK2hSud.js';
import { loadSceneElevators } from './timeline-player-YCH7Y-3h.js';

// @editor-module 设施辅助例程只执行已发布的调用状态语义。

function executeFacilityHelper(helper, input = {}, operands = [], windows) {
  if (helper?.confirmation_status !== "confirmed" || !helper.implementation)
    return {status: "unavailable", missing: helper?.missing || ["helper-semantics"]};
  const state = structuredClone(input);
  state.cpu ||= {};
  const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
  const requireByte = key => {
    if (!byte(state[key])) throw new Error(key);
    return state[key];
  };
  const requireVector = (key, index) => {
    const values = state[key];
    if (!(Array.isArray(values) || ArrayBuffer.isView(values)) || !byte(values[index]))
      throw new Error(`${key}[${index}]`);
    return values;
  };
  const flags = value => {
    state.cpu.zero = value === 0;
    state.cpu.negative = (value & 128) !== 0;
    return value;
  };
  let continuation = null;
  const selectBranch = index => {
    if (!byte(operands[index])) throw new Error(`branch_operands[${index}]`);
    const selector = operands[index];
    state.cpu.y = index + 1;
    state.cpu.a = selector;
    flags((selector - 254) & 255);
    state.cpu.carry = selector >= 254;
    continuation = selector >= 254 ? {return_marker: selector} : {next_segment_index: selector};
  };
  try {
    switch (helper.implementation) {
      case "select-configuration-value": {
        const index = (requireByte("selection_index") + 1) & 255;
        state.cpu.y = index;
        state.configuration_value = state.cpu.a = flags(requireVector("configuration", index)[index]);
        break;
      }
      case "set-field-mode":
        state.field_mode = state.cpu.a = flags(5);
        break;
      case "set-instance-from-y-minus-one":
        state.instance = state.cpu.y = flags((requireByte("y") - 1) & 255);
        break;
      case "double-selection-index": {
        const index = requireByte("selection_index");
        state.cpu.carry = (index & 128) !== 0;
        state.selection_kind = state.cpu.a = flags((index * 2) & 255);
        break;
      }
      case "increment-engine-upgrade": {
        const index = requireByte("vehicle_index");
        const values = requireVector("engine_upgrades", index);
        state.cpu.x = index;
        values[index] = flags((values[index] + 1) & 255);
        break;
      }
      case "count-active-vehicles": {
        let remaining = 4;
        for (let index = 3; index >= 0; index--) {
          const value = requireVector("vehicle_slots", index)[index];
          if (value & 128) remaining--;
          state.cpu.a = value;
        }
        state.remaining_vehicle_count = remaining;
        state.cpu.x = flags(0);
        break;
      }
      case "clear-role-status-high-bit": {
        const index = requireByte("role_index");
        const values = requireVector("role_status", index);
        state.cpu.x = index;
        values[index] = flags(values[index] & 127);
        state.cpu.carry = false;
        break;
      }
      case "save-selected-file":
        state.selected_file = state.cpu.x = flags((requireByte("selection_index") + 1) & 255);
        break;
      case "clear-selection-window": {
        const result = executeFacilityWindowRoutine(windows, 'window-FA99', state);
        if (result.status !== 'available') return result;
        Object.assign(state, result.state);
        state.cpu.y = state.rectangle_width;
        state.cpu.a = state.rectangle_pointer >> 8;
        state.cpu.x = flags(0);
        state.cpu.carry = false;
        break;
      }
      case "store-selected-capacity": {
        const index = requireByte("vehicle_index");
        const values = requireVector("packed_capacity", index);
        state.cpu.x = index;
        values[index] = state.cpu.a = flags((values[index] & 192) | requireByte("selected_capacity"));
        break;
      }
      case "select-special-inventory":
        state.configuration_kind = state.selection_kind = 2;
        state.configuration_pointer = 0x6496;
        state.cpu.a = flags(0x64);
        state.cpu.x = 4;
        state.cpu.carry = false;
        break;
      case "classify-inventory-item": {
        const item = requireByte("item_id");
        const index = [1, 0x41, 0x99, 0xCB].findLastIndex(threshold => item >= threshold);
        state.cpu.carry = index < 0;
        if (index < 0) {
          state.cpu.a = item;
          state.cpu.x = flags(255);
        } else {
          state.configuration_kind = [2, 0, 3, 1][index];
          state.configuration_pointer = [0x6496, 0x6674, 0x64AE, 0x65CF][index];
          state.cpu.x = index * 2;
          state.cpu.a = flags(state.configuration_pointer >> 8);
        }
        break;
      }
      case "zero-selection-kind":
        state.selection_kind = 0;
        break;
      case "two-selection-kind":
        state.selection_kind = state.cpu.y = flags(2);
        break;
      case "capture-selection-index":
        state.configuration_value = state.cpu.a = flags(requireByte("selection_index"));
        break;
      case "reset-selection-index":
        state.selection_index = state.cpu.a = flags(0);
        break;
      case "clear-quantity":
        state.quantity_low_byte = state.quantity_middle_byte = state.quantity_high_byte = 0;
        state.cpu.a = flags(0);
        break;
      case "copy-money-difference": {
        const values = requireVector("money_difference", 0);
        requireVector("money_difference", 1);
        requireVector("money_difference", 2);
        state.money = Array.from(values).slice(0, 3);
        state.cpu.a = values[0];
        state.cpu.x = flags(255);
        break;
      }
      case "set-quantity-low-byte":
        if (!byte(operands[0])) throw new Error("quantity operand");
        state.quantity_low_byte = state.cpu.a = flags(operands[0]);
        break;
      case "select-text-region-seven":
      case "select-text-region-sixteen":
        state.text_region = state.cpu.a = flags(helper.implementation === "select-text-region-seven" ? 7 : 16);
        break;
      case "branch-condition-index":
        selectBranch(requireByte("condition_index"));
        break;
      case "branch-role-status-negative":
      case "branch-role-status-ff": {
        const index = requireByte("role_index");
        const value = requireVector("role_status", index)[index];
        state.cpu.x = index;
        selectBranch(helper.implementation === "branch-role-status-negative" ? +(value >= 128) : +(value === 255));
        break;
      }
      case "branch-actor-count-one":
        state.remaining_vehicle_count = requireByte("actor_count");
        selectBranch(+(state.actor_count !== 1));
        break;
      case "branch-special-vehicle-present":
        selectBranch(+(requireByte("special_vehicle") !== 0));
        break;
      case "branch-slot-values-equal":
        selectBranch(+(requireByte("slot_left") === requireByte("slot_right")));
        break;
      case "branch-slot-value-zero":
        selectBranch(+(requireByte("slot_left") === 0));
        break;
      case "branch-field-progress-threshold":
        selectBranch(+(requireByte("field_progress") < 0x60));
        break;
      default:
        return {status: "unavailable", missing: ["helper-implementation"]};
    }
  } catch (error) {
    return {status: "unavailable", missing: [error.message]};
  }
  return {status: "available", state, window_effects: helper.window_effects, ...continuation};
}

function executeFacilityCallState(branch, helpers, input = {}, windows, windowContext = {}) {
  if (!branch?.call_state_program?.length)
    return {status: "unavailable", missing: ["branch-call-state-program"]};
  let state = structuredClone(input);
  const effects = [];
  for (const step of branch?.call_state_program || []) {
    if (step.kind === "helper" || step.kind === "control") {
      const helper = helpers.find(helper => helper.id === step.helper);
      state.y = step.entry_state.y;
      state.cpu = {...state.cpu, ...step.entry_state.cpu};
      const result = executeFacilityHelper(helper, state, step.operands, windows);
      if (result.status !== "available") return {...result, state, effects, stopped_at: step.source};
      state = result.state;
      effects.push(...result.window_effects);
      if (result.next_segment_index !== undefined || result.return_marker !== undefined)
        return {status: "available", state, effects,
          ...(result.next_segment_index !== undefined ? {next_segment_index: result.next_segment_index}
            : {return_marker: result.return_marker})};
    } else if (step.kind === "jump") {
      return {status: "available", state, effects, next_segment_index: step.segment_index};
    } else if (step.kind === "return") {
      return {status: "available", state, effects, return_marker: step.marker};
    } else if (step.window_routine?.id === 'window-F1DD') {
      const entry = executeFacilityWindowRoutine(windows, step.window_routine.id, state, windowContext);
      const result = entry.status === 'pending' ? resumeFacilityWindowCycle(windows, entry, windowContext) : entry;
      return {status: 'unavailable', state: result.state || state,
        effects: [...effects, ...(result.effects || [])], stopped_at: step.source,
        missing: result.missing || ['menu-callback-effects', 'menu-branch-continuation']};
    } else {
      return {status: "unavailable", state, effects, stopped_at: step.source,
        missing: step.missing};
    }
  }
  return {status: "available", state, effects};
}

// @editor-module 设施分支只组装发布的来源并保留逐项缺口。

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

function resolveFacilityBranchPreview(catalog, branch, body = null, {
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

// @editor-module 同布局服务回应复用发布构造并改读当前正文。
// 读取链见 project/evidence/service-flow-preview-closure/response-layouts.json。
const responses = new Map([
  ["application-dialogue-flow:14:segment:10:action:00", ["constructor:vehicle-rental-service-loan-ack", "application-command:14:text-record:202249", null, "借车回应"]],
  ["application-dialogue-flow:10:segment:31:action:00", ["constructor:vehicle-equipment-shop-sale-offer", "application-command:10:runtime-record-slot:16", null, "拒绝收购"]],
  ["application-dialogue-flow:10:segment:32:action:00", ["constructor:vehicle-equipment-shop-sale-offer", "application-command:10:runtime-record-slot:17", null, "出售报价"]],
  ["application-dialogue-flow:10:segment:33:action:00", ["constructor:vehicle-equipment-shop-sale-offer", "application-command:10:runtime-record-slot:19", null, "出售取消"]],
  ["application-dialogue-flow:10:segment:34:action:00", ["constructor:vehicle-equipment-shop-sale-inventory", "application-command:10:runtime-record-slot:18", null, "成交回应"]],
  ["application-dialogue-flow:11:segment:31:action:00", ["constructor:vehicle-item-shop-sale-offer", "application-command:11:runtime-record-slot:16", null, "拒绝收购"]],
  ["application-dialogue-flow:11:segment:32:action:00", ["constructor:vehicle-item-shop-sale-offer", "application-command:11:runtime-record-slot:17", null, "出售报价"]],
  ["application-dialogue-flow:11:segment:33:action:00", ["constructor:vehicle-item-shop-sale-offer", "application-command:11:runtime-record-slot:19", null, "出售取消"]],
  ["application-dialogue-flow:11:segment:34:action:00", ["constructor:vehicle-item-shop-sale-inventory", "application-command:11:runtime-record-slot:18", null, "成交回应"]],
  ["application-dialogue-flow:10:segment:02:action:00", ["constructor:vehicle-equipment-shop-buy-sell", "application-command:10:text-record:202838", null, "请再来！"]],
  ["application-dialogue-flow:10:segment:07:action:00", ["constructor:vehicle-equipment-shop-buy-sell", "application-command:10:runtime-record-slot:2", null, "还有事吗？"]],
  ["application-dialogue-flow:10:segment:05:action:00", ["constructor:vehicle-equipment-shop-confirm", "application-command:10:runtime-record-slot:1", null, "其它地方也有"]],
  ["application-dialogue-flow:10:segment:10:action:00", ["constructor:vehicle-equipment-shop-confirm", "application-command:10:runtime-record-slot:4", null, "什么都不买，"]],
  ["application-dialogue-flow:10:segment:19:action:01", ["constructor:vehicle-equipment-shop-confirm", "application-command:10:runtime-record-slot:0", null, "买什么？"]],
  ["application-dialogue-flow:10:segment:38:action:00", ["constructor:vehicle-equipment-shop-confirm", "application-command:10:text-record:203001", null, "车没了，"]],
  ["application-dialogue-flow:10:segment:16:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:runtime-record-slot:10", null, "不能再装了！"]],
  ["application-dialogue-flow:10:segment:18:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:text-record:202916", null, "这个人死了吗？"]],
  ["application-dialogue-flow:10:segment:19:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:runtime-record-slot:12", null, "谢谢！"]],
  ["application-dialogue-flow:10:segment:42:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:text-record:203013", null, "那不是出租坦克吗？"]],
  ["application-dialogue-flow:10:segment:46:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:runtime-record-slot:9", null, "，"]],
  ["application-dialogue-flow:10:segment:49:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:runtime-record-slot:8", null, "不能再装了！"]],
  ["application-dialogue-flow:10:segment:52:action:00", ["constructor:vehicle-equipment-shop-vehicle-select", "application-command:10:text-record:203049", null, "超重了，还要装吗？"]],
  ["application-dialogue-flow:11:segment:02:action:00", ["constructor:vehicle-item-shop-buy-sell", "application-command:11:text-record:202838", null, "请再来！"]],
  ["application-dialogue-flow:11:segment:07:action:00", ["constructor:vehicle-item-shop-buy-sell", "application-command:11:runtime-record-slot:2", null, "还有事吗？"]],
  ["application-dialogue-flow:11:segment:05:action:00", ["constructor:vehicle-item-shop-confirm", "application-command:11:runtime-record-slot:1", null, "其它地方也有"]],
  ["application-dialogue-flow:11:segment:09:action:00", ["constructor:vehicle-item-shop-confirm", "application-command:11:runtime-record-slot:3", null, "钱不够，真穷啊！"]],
  ["application-dialogue-flow:11:segment:10:action:00", ["constructor:vehicle-item-shop-confirm", "application-command:11:runtime-record-slot:4", null, "什么都不买，"]],
  ["application-dialogue-flow:11:segment:19:action:01", ["constructor:vehicle-item-shop-confirm", "application-command:11:runtime-record-slot:0", null, "买什么？"]],
  ["application-dialogue-flow:11:segment:38:action:00", ["constructor:vehicle-item-shop-confirm", "application-command:11:text-record:203001", null, "车没了，"]],
  ["application-dialogue-flow:11:segment:16:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:runtime-record-slot:10", null, "不能再装了！"]],
  ["application-dialogue-flow:11:segment:18:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:text-record:202916", null, "这个人死了吗？"]],
  ["application-dialogue-flow:11:segment:19:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:runtime-record-slot:12", null, "谢谢！"]],
  ["application-dialogue-flow:11:segment:42:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:text-record:203013", null, "那不是出租坦克吗？"]],
  ["application-dialogue-flow:11:segment:46:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:runtime-record-slot:9", null, "，"]],
  ["application-dialogue-flow:11:segment:49:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:runtime-record-slot:8", null, "不能再装了！"]],
  ["application-dialogue-flow:11:segment:52:action:00", ["constructor:vehicle-item-shop-vehicle-select", "application-command:11:text-record:203049", null, "超重了，还要装吗？"]],
  ["application-dialogue-flow:12:segment:02:action:00", ["constructor:human-equipment-shop-buy-sell", "application-command:12:text-record:202838", null, "请再来！"]],
  ["application-dialogue-flow:12:segment:07:action:00", ["constructor:human-equipment-shop-buy-sell", "application-command:12:runtime-record-slot:2", null, "还有别的事吗？"]],
  ["application-dialogue-flow:12:segment:05:action:00", ["constructor:human-equipment-shop-confirm", "application-command:12:runtime-record-slot:1", null, "要卖的东西还有呢！"]],
  ["application-dialogue-flow:12:segment:09:action:00", ["constructor:human-equipment-shop-confirm", "application-command:12:runtime-record-slot:3", null, "稍等一下！"]],
  ["application-dialogue-flow:12:segment:10:action:00", ["constructor:human-equipment-shop-confirm", "application-command:12:runtime-record-slot:4", null, "若什么都不买，"]],
  ["application-dialogue-flow:12:segment:33:action:00", ["constructor:human-equipment-shop-sale-offer", "application-command:12:runtime-record-slot:19", null, "再考虑！"]],
  ["application-dialogue-flow:12:segment:32:action:00", ["constructor:human-equipment-shop-sale-offer", "application-command:12:runtime-record-slot:17", null, "出售报价"]],
  ["application-dialogue-flow:12:segment:34:action:00", ["constructor:human-equipment-shop-sale-inventory", "application-command:12:runtime-record-slot:18", null, "谢谢！"]],
  ["application-dialogue-flow:12:segment:19:action:01", ["constructor:human-equipment-shop-confirm", "application-command:12:runtime-record-slot:0", null, "要哪个？"]],
  ["application-dialogue-flow:12:segment:38:action:00", ["constructor:human-equipment-shop-confirm", "application-command:12:text-record:203001", null, "车没了，"]],
  ["application-dialogue-flow:12:segment:16:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:runtime-record-slot:10", null, "拿的"]],
  ["application-dialogue-flow:12:segment:18:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:text-record:202916", null, "这个人死了吗？"]],
  ["application-dialogue-flow:12:segment:19:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:runtime-record-slot:12", null, "好啊，！"]],
  ["application-dialogue-flow:12:segment:42:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:text-record:203013", null, "那不是出租坦克吗？"]],
  ["application-dialogue-flow:12:segment:46:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:runtime-record-slot:9", null, "不能"]],
  ["application-dialogue-flow:12:segment:49:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:runtime-record-slot:8", null, "您的东西也满了！"]],
  ["application-dialogue-flow:12:segment:52:action:00", ["constructor:human-equipment-shop-actor-select", "application-command:12:text-record:203049", null, "超重了，还要装吗？"]],
  ["application-dialogue-flow:13:segment:02:action:00", ["constructor:human-item-shop-buy-sell", "application-command:13:text-record:202838", null, "请再来！"]],
  ["application-dialogue-flow:13:segment:07:action:00", ["constructor:human-item-shop-buy-sell", "application-command:13:runtime-record-slot:2", null, "还有别的事吗？"]],
  ["application-dialogue-flow:13:segment:05:action:00", ["constructor:human-item-shop-confirm", "application-command:13:runtime-record-slot:1", null, "要卖的东西还有呢！"]],
  ["application-dialogue-flow:13:segment:09:action:00", ["constructor:human-item-shop-confirm", "application-command:13:runtime-record-slot:3", null, "真遗憾，"]],
  ["application-dialogue-flow:13:segment:10:action:00", ["constructor:human-item-shop-confirm", "application-command:13:runtime-record-slot:4", null, "不想买，按B键！"]],
  ["application-dialogue-flow:13:segment:33:action:00", ["constructor:human-item-shop-sale-offer", "application-command:13:runtime-record-slot:19", null, "出售取消"]],
  ["application-dialogue-flow:13:segment:32:action:00", ["constructor:human-item-shop-sale-offer", "application-command:13:runtime-record-slot:17", null, "出售报价"]],
  ["application-dialogue-flow:13:segment:34:action:00", ["constructor:human-item-shop-sale-inventory", "application-command:13:runtime-record-slot:18", null, "谢谢！"]],
  ["application-dialogue-flow:13:segment:19:action:01", ["constructor:human-item-shop-confirm", "application-command:13:runtime-record-slot:0", null, "要哪个？"]],
  ["application-dialogue-flow:13:segment:38:action:00", ["constructor:human-item-shop-confirm", "application-command:13:text-record:203001", null, "车没了，"]],
  ["application-dialogue-flow:13:segment:16:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:runtime-record-slot:10", null, "拿的东西"]],
  ["application-dialogue-flow:13:segment:18:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:text-record:202916", null, "这个人死了吗？"]],
  ["application-dialogue-flow:13:segment:19:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:runtime-record-slot:12", null, "好啊，！"]],
  ["application-dialogue-flow:13:segment:42:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:text-record:203013", null, "那不是出租坦克吗？"]],
  ["application-dialogue-flow:13:segment:46:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:runtime-record-slot:9", null, "不能"]],
  ["application-dialogue-flow:13:segment:49:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:runtime-record-slot:8", null, "你拿的东西"]],
  ["application-dialogue-flow:13:segment:52:action:00", ["constructor:human-item-shop-actor-select", "application-command:13:text-record:203049", null, "超重了，还要装吗？"]],
  ["application-dialogue-flow:14:segment:03:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202210", null, "出租战车"]],
  ["application-dialogue-flow:14:segment:04:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202213", null, "出租坦克"]],
  ["application-dialogue-flow:14:segment:06:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202223", null, "是的，"]],
  ["application-dialogue-flow:14:segment:14:action:00", ["constructor:vehicle-rental-service-vehicle-list", "application-command:14:text-record:202276", null, "不能再借战车！"]],
  ["application-dialogue-flow:14:segment:16:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202283", null, "那我们就回收了，"]],
  ["application-dialogue-flow:14:segment:18:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202292", null, "呀！"]],
  ["application-dialogue-flow:14:segment:22:action:00", ["constructor:vehicle-rental-service-rental-menu", "application-command:14:text-record:202311", null, "不能在车上放死人！"]],
  ["application-dialogue-flow:15:segment:02:action:00", ["constructor:special-shell-shop-reception", "application-command:15:text-record:202543", "region_id", "买炮弹的话，"]],
  ["application-dialogue-flow:15:segment:09:action:00", ["constructor:special-shell-shop-reception", "application-command:15:text-record:202576", "region_id", "没带车呀？"]],
  ["application-dialogue-flow:15:segment:17:action:00", ["constructor:special-shell-shop-reception", "application-command:15:text-record:202609", "region_id", "想花钱，再来。"]],
  ["application-dialogue-flow:15:segment:04:action:00", ["constructor:special-shell-shop-buy-sell", "application-command:15:text-record:202550", "region_id", "噢！买吗？"]],
  ["application-dialogue-flow:16:segment:01:action:00", ["constructor:inn-service-price-confirm", "application-command:16:text-record:202098", null, "再见！"]],
  ["application-dialogue-flow:16:segment:07:action:00", ["constructor:inn-service-price-confirm", "application-command:16:text-record:202122", null, "对不起，钱不够。"]],
  ["application-dialogue-flow:16:segment:09:action:00", ["constructor:inn-service-price-confirm", "application-command:16:text-record:202132", null, "其他房间可以吗？"]],
  ["application-dialogue-flow:17:segment:07:action:00", ["constructor:bar-service-order-confirm", "application-command:17:text-record:202011", "region_id", "钱不够啊，"]],
  ["application-dialogue-flow:17:segment:03:action:00", ["constructor:bar-service-hunter-refusal", "application-command:17:text-record:201996", "region_id", "那么再来吧。"]],
  ["application-dialogue-flow:17:segment:14:action:00", ["constructor:bar-service-hunter-refusal", "application-command:17:text-record:202035", "region_id", "喝得真干净！"]],
  ["application-dialogue-flow:17:segment:12:action:00", ["constructor:bar-service-eligibility", "application-command:17:text-record:202029", "region_id", "不要给死的"]],
  ["application-dialogue-flow:18:segment:07:action:00", ["constructor:bar-service-alternate-order-confirm", "application-command:18:text-record:202070", "region_id", "钱不够。"]],
  ["application-dialogue-flow:18:segment:01:action:00", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202044", "region_id", "再好的朋友，"]],
  ["application-dialogue-flow:18:segment:02:action:00", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202048", "region_id", "来，干杯！"]],
  ["application-dialogue-flow:18:segment:02:action:02", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202050", "region_id", "喝得真干净！"]],
  ["application-dialogue-flow:18:segment:03:action:00", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202054", "region_id", "美酒留在明天吧。"]],
  ["application-dialogue-flow:18:segment:10:action:00", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202078", "region_id", "哪位想喝？"]],
  ["application-dialogue-flow:18:segment:12:action:00", ["constructor:bar-service-drinker-select", "application-command:18:text-record:202088", "region_id", "再好的朋友，"]],
  ["application-dialogue-flow:19:segment:01:action:00", ["constructor:interior-decoration-shop-reception", "application-command:19:text-record:203994", "region_id", "欢迎再来。"]],
  ["application-dialogue-flow:19:segment:06:action:00", ["constructor:interior-decoration-shop-delivery", "application-command:19:text-record:204011", "region_id", "对不起，钱不够。"]],
  ["application-dialogue-flow:19:segment:06:action:01", ["constructor:interior-decoration-shop-delivery", "application-command:19:text-record:204012", "region_id", "欢迎再来。"]],
  ["application-dialogue-flow:1E:segment:02:action:00", ["constructor:herbal-medicine-vendor-price", "application-command:1E:text-record:202768", null, "请再来！"]],
  ["application-dialogue-flow:1E:segment:10:action:00", ["constructor:herbal-medicine-vendor-price", "application-command:1E:text-record:202798", null, "真遗憾，"]],
  ["application-dialogue-flow:1E:segment:11:action:00", ["constructor:herbal-medicine-vendor-price", "application-command:1E:text-record:202801", null, "不想买，按B键！"]],
  ["application-dialogue-flow:1E:segment:12:action:00", ["constructor:human-item-shop-actor-select", "application-command:1E:text-record:202804", null, "谁拿呢？"]],
  ["application-dialogue-flow:1E:segment:14:action:00", ["constructor:human-item-shop-actor-select", "application-command:1E:text-record:202813", null, "拿的东西"]],
  ["application-dialogue-flow:1E:segment:15:action:00", ["constructor:human-item-shop-actor-select", "application-command:1E:text-record:202817", null, "你拿的东西"]],
  ["application-dialogue-flow:1E:segment:16:action:00", ["constructor:human-item-shop-actor-select", "application-command:1E:text-record:202820", null, "这个人死了吗？"]],
  ["application-dialogue-flow:20:segment:02:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202344", null, "请再来！"]],
  ["application-dialogue-flow:20:segment:05:action:01", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202356", null, "请再来！"]],
  ["application-dialogue-flow:20:segment:09:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202377", null, "还需要补充吗？"]],
  ["application-dialogue-flow:20:segment:10:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202381", null, "什么！"]],
  ["application-dialogue-flow:20:segment:12:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202387", null, "什么！"]],
  ["application-dialogue-flow:20:segment:12:action:01", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202388", null, "找好地方，"]],
  ["application-dialogue-flow:20:segment:16:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202407", null, "是吗？"]],
  ["application-dialogue-flow:20:segment:20:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202424", null, "那么就没有"]],
  ["application-dialogue-flow:20:segment:25:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202444", null, "什么！"]],
  ["application-dialogue-flow:20:segment:26:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202449", null, "装好了！"]],
  ["application-dialogue-flow:20:segment:35:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202495", null, "已经装满了！"]],
  ["application-dialogue-flow:20:segment:37:action:00", ["constructor:vehicle-supply-service-supply-type", "application-command:20:text-record:202505", null, "补充多少，"]],
  ["application-dialogue-flow:21:segment:01:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203669", "region_id", "你呀！真让我感动，"]],
  ["application-dialogue-flow:21:segment:03:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203678", "region_id", "混蛋，这个家伙！"]],
  ["application-dialogue-flow:21:segment:03:action:01", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203679", "region_id", "你呀！真让我感动，"]],
  ["application-dialogue-flow:21:segment:05:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203684", "region_id", "哪里有什么战车？"]],
  ["application-dialogue-flow:21:segment:07:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203691", "region_id", "什么？"]],
  ["application-dialogue-flow:21:segment:08:action:02", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203697", "region_id", "这次就便宜你啦！"]],
  ["application-dialogue-flow:21:segment:10:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203709", "region_id", "你怀疑我"]],
  ["application-dialogue-flow:21:segment:11:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203714", "region_id", "全部修好了，"]],
  ["application-dialogue-flow:21:segment:12:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203716", "region_id", "那么在这之前，在记忆"]],
  ["application-dialogue-flow:21:segment:14:action:01", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203727", "region_id", "这次就便宜你啦！"]],
  ["application-dialogue-flow:21:segment:18:action:01", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203743", "region_id", "这次就便宜你啦！"]],
  ["application-dialogue-flow:21:segment:19:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203749", "region_id", "这次回来，"]],
  ["application-dialogue-flow:21:segment:20:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203751", "region_id", "什么？你要隐退"]],
  ["application-dialogue-flow:21:segment:23:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203766", "region_id", "你是给父母"]],
  ["application-dialogue-flow:21:segment:24:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203771", "region_id", "想成为坚强的人"]],
  ["application-dialogue-flow:21:segment:27:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203784", "region_id", "一要面子就"]],
  ["application-dialogue-flow:21:segment:27:action:01", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203785", "region_id", "一点心意，"]],
  ["application-dialogue-flow:21:segment:30:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203799", "region_id", "真的收下了？"]],
  ["application-dialogue-flow:21:segment:32:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203805", "region_id", "你是给父母"]],
  ["application-dialogue-flow:21:segment:33:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203810", "region_id", "是的！"]],
  ["application-dialogue-flow:21:segment:35:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203816", "region_id", "混蛋！"]],
  ["application-dialogue-flow:21:segment:38:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203829", "region_id", "没钱还摆阔，"]],
  ["application-dialogue-flow:21:segment:39:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203831", "region_id", "最好别半途而废，"]],
  ["application-dialogue-flow:21:segment:40:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203837", "region_id", "好象能赚钱了，"]],
  ["application-dialogue-flow:21:segment:41:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203839", "region_id", "没钱还摆阔！"]],
  ["application-dialogue-flow:21:segment:41:action:01", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203840", "region_id", "一点心意，"]],
  ["application-dialogue-flow:21:segment:42:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203842", "region_id", "就这么一点钱，"]],
  ["application-dialogue-flow:21:segment:43:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203844", "region_id", "这么多钱，"]],
  ["application-dialogue-flow:21:segment:51:action:00", ["constructor:private-father-menu-greeting", "application-command:21:text-record:203872", "region_id", "谢谢！"]],
  ["application-dialogue-flow:22:segment:03:action:00", ["constructor:minchi-revival-service-reception", "application-command:22:text-record:202151", null, "尸体烂了，"]],
  ["application-dialogue-flow:22:segment:04:action:00", ["constructor:minchi-revival-service-menu", "application-command:22:text-record:202153", null, "……"]],
  ["application-dialogue-flow:22:segment:08:action:00", ["constructor:minchi-revival-service-result", "application-command:22:text-record:202172", null, "怎么不是"]],
  ["application-dialogue-flow:23:segment:02:action:00", ["constructor:chassis-modification-service-reception", "application-command:23:text-record:203269", "region_id", "连车都没有，"]],
  ["application-dialogue-flow:23:segment:04:action:00", ["constructor:chassis-modification-service-vehicle-select", "application-command:23:text-record:203277", "region_id", "要了解战车性能的话"]],
  ["application-dialogue-flow:23:segment:06:action:00", ["constructor:chassis-modification-service-vehicle-select", "application-command:23:text-record:203283", "region_id", "出租战车不"]],
  ["application-dialogue-flow:23:segment:07:action:00", ["constructor:chassis-modification-service-vehicle-select", "application-command:23:text-record:203286", "region_id", "其它战车要改装吗？"]],
  ["application-dialogue-flow:23:segment:09:action:00", ["constructor:chassis-modification-service-vehicle-select", "application-command:23:text-record:203296", "region_id", "这辆车得"]],
  ["application-dialogue-flow:23:segment:10:action:00", ["constructor:chassis-modification-service-vehicle-select", "application-command:23:text-record:203299", "region_id", "是吗？"]],
  ["application-dialogue-flow:23:segment:13:action:00", ["constructor:chassis-modification-service-capacity-quote", "application-command:23:text-record:203317", "region_id", "战车已改装过了。"]],
  ["application-dialogue-flow:23:segment:17:action:00", ["constructor:chassis-modification-service-capacity-quote", "application-command:23:text-record:203330", "region_id", "钱不够，"]],
  ["application-dialogue-flow:23:segment:21:action:00", ["constructor:chassis-modification-service-capacity-quote", "application-command:23:text-record:203348", "region_id", "的守备力"]],
  ["application-dialogue-flow:24:segment:00:action:00", ["constructor:private-special-buyer-reception", "application-command:24:text-record:203060", "region_id", "想卖什么？"]],
  ["application-dialogue-flow:24:segment:03:action:00", ["constructor:special-item-buyer-offer", "application-command:24:text-record:203074", "region_id", "不是偷的吧？"]],
  ["application-dialogue-flow:24:segment:11:action:00", ["constructor:special-item-buyer-appraisal", "application-command:24:text-record:203101", "region_id", "收购拒绝"]],
  ["application-dialogue-flow:24:segment:13:action:00", ["constructor:special-item-buyer-offer", "application-command:24:text-record:203110", "region_id", "笑脸掩饰不了不幸，"]],
  ["application-dialogue-flow:25:segment:01:action:00", ["constructor:wanted-information-office-menu", "application-command:25:text-record:204620", "region_id", "请您再来！"]],
  ["application-dialogue-flow:25:segment:05:action:00", ["constructor:wanted-information-office-menu", "application-command:25:text-record:204640", "region_id", "看一下墙上"]],
  ["application-dialogue-flow:25:segment:06:action:00", ["constructor:wanted-information-office-menu", "application-command:25:text-record:204642", "region_id", "就连最好"]],
  ["application-dialogue-flow:25:segment:07:action:00", ["constructor:wanted-information-bounty-claim", "application-command:25:text-record:204644", "region_id", "成功了。"]],
  ["application-dialogue-flow:25:segment:10:action:00", ["constructor:wanted-information-bounty-claim", "application-command:25:text-record:204655", "region_id", "好象钱包装不下。"]],
  ["application-dialogue-flow:25:segment:13:action:00", ["constructor:wanted-information-bounty-claim", "application-command:25:text-record:204677", "region_id", "哎？说什么？"]],
  ["application-dialogue-flow:25:segment:14:action:00", ["constructor:wanted-information-bounty-claim", "application-command:25:text-record:204680", "region_id", "这样一来，"]],
  ["application-dialogue-flow:26:segment:04:action:00", ["constructor:storage-service-deposit-withdraw", "application-command:26:text-record:203465", "region_id", "随时都能取，"]],
  ["application-dialogue-flow:26:segment:06:action:00", ["constructor:storage-service-deposit-withdraw", "application-command:26:text-record:203470", "region_id", "里边都放满了。"]],
  ["application-dialogue-flow:26:segment:22:action:00", ["constructor:storage-service-deposit-withdraw", "application-command:26:text-record:203541", "region_id", "还有别的事吗？"]],
  ["application-dialogue-flow:26:segment:50:action:00", ["constructor:storage-service-deposit-withdraw", "application-command:26:text-record:203652", "region_id", "您没"]],
  ["application-dialogue-flow:26:segment:10:action:00", ["constructor:storage-service-category", "application-command:26:text-record:203492", "region_id", "没有见到车…"]],
  ["application-dialogue-flow:26:segment:13:action:00", ["constructor:storage-service-actor-select", "application-command:26:text-record:203504", "region_id", "别动那辆战车，"]],
  ["application-dialogue-flow:26:segment:19:action:00", ["constructor:storage-service-deposit-location", "application-command:26:text-record:203525", "region_id", "工具存放位置"]],
  ["application-dialogue-flow:26:segment:23:action:00", ["constructor:storage-service-actor-select", "application-command:26:text-record:203544", "region_id", "是哪辆车？"]],
  ["application-dialogue-flow:26:segment:27:action:00", ["constructor:storage-service-actor-select", "application-command:26:text-record:203560", "region_id", "敢从尸体上走下来，"]],
  ["application-dialogue-flow:26:segment:38:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203601", "region_id", "你是跑出来的吧！"]],
  ["application-dialogue-flow:26:segment:39:action:00", ["constructor:storage-service-withdraw-actor-select", "application-command:26:text-record:203604", "region_id", "谁拿呢？"]],
  ["application-dialogue-flow:26:segment:40:action:00", ["constructor:storage-service-withdraw-actor-select", "application-command:26:text-record:203607", "region_id", "装在哪辆车上？"]],
  ["application-dialogue-flow:26:segment:29:action:00", ["constructor:storage-service-confirm", "application-command:26:text-record:203566", "region_id", "这个不能存！"]],
  ["application-dialogue-flow:26:segment:30:action:00", ["constructor:storage-service-confirm", "application-command:26:text-record:203569", "region_id", "没有车就不能转交。"]],
  ["application-dialogue-flow:26:segment:31:action:00", ["constructor:storage-service-confirm", "application-command:26:text-record:203572", "region_id", "取下那个就"]],
  ["application-dialogue-flow:26:segment:33:action:00", ["constructor:storage-service-withdraw-confirm", "application-command:26:text-record:203582", "region_id", "取出确认"]],
  ["application-dialogue-flow:26:segment:43:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203620", "region_id", "已经不能拿了。"]],
  ["application-dialogue-flow:26:segment:44:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203624", "region_id", "已经不能装了。"]],
  ["application-dialogue-flow:26:segment:46:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203631", "region_id", "装备转交"]],
  ["application-dialogue-flow:26:segment:47:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203634", "region_id", "物品转交"]],
  ["application-dialogue-flow:26:segment:48:action:00", ["constructor:storage-service-withdraw-response", "application-command:26:text-record:203640", "region_id", "还有什么要取？"]],
  ["application-dialogue-flow:28:segment:02:action:00", ["constructor:engine-modification-service-reception", "application-command:28:text-record:203167", "region_id", "车在哪儿？"]],
  ["application-dialogue-flow:28:segment:04:action:00", ["constructor:engine-modification-service-vehicle-select", "application-command:28:text-record:203175", "region_id", "请再来。"]],
  ["application-dialogue-flow:28:segment:06:action:00", ["constructor:engine-modification-service-eligibility", "application-command:28:text-record:203181", "region_id", "出租坦克不能改造。"]],
  ["application-dialogue-flow:28:segment:08:action:00", ["constructor:engine-modification-service-eligibility", "application-command:28:text-record:203189", "region_id", "什么，发动机的功率"]],
  ["application-dialogue-flow:28:segment:10:action:00", ["constructor:engine-modification-service-eligibility", "application-command:28:text-record:203195", "region_id", "发动机在哪呢？"]],
  ["application-dialogue-flow:28:segment:13:action:00", ["constructor:engine-modification-service-price-confirm", "application-command:28:text-record:203209", "region_id", "钱不够！"]],
  ["application-dialogue-flow:29:segment:01:action:00", ["constructor:vehicle-repair-service-reception", "application-command:29:text-record:203883", "region_id", "若是修车的话，"]],
  ["application-dialogue-flow:29:segment:04:action:00", ["constructor:vehicle-repair-service-inspection", "application-command:29:text-record:203893", "region_id", "哇，坏得好厉害！"]],
  ["application-dialogue-flow:29:segment:07:action:00", ["constructor:vehicle-repair-service-quote", "application-command:29:text-record:203903", "region_id", "钱不够啊！"]],
  ["application-dialogue-flow:29:segment:07:action:01", ["constructor:vehicle-repair-service-quote", "application-command:29:text-record:203904", "region_id", "到哪儿去都行，"]],
  ["application-dialogue-flow:29:segment:10:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203915", "region_id", "是吗？那就算了。"]],
  ["application-dialogue-flow:29:segment:13:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203928", "region_id", "选择一下，"]],
  ["application-dialogue-flow:29:segment:15:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203935", "region_id", "钱不够啊！"]],
  ["application-dialogue-flow:29:segment:16:action:01", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203941", "region_id", "好了，修完了！"]],
  ["application-dialogue-flow:29:segment:16:action:02", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203942", "region_id", "认真维护战车，"]],
  ["application-dialogue-flow:29:segment:18:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203949", "region_id", "坏了还不修吗？"]],
  ["application-dialogue-flow:29:segment:24:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203975", "region_id", "钱不够啊！"]],
  ["application-dialogue-flow:29:segment:25:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203978", "region_id", "好吧！"]],
  ["application-dialogue-flow:29:segment:25:action:01", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203981", "region_id", "好了，修完了！"]],
  ["application-dialogue-flow:29:segment:26:action:00", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203986", "region_id", "还有没有要修理的！"]],
  ["application-dialogue-flow:29:segment:26:action:01", ["constructor:vehicle-repair-service-total", "application-command:29:text-record:203987", "region_id", "认真维护战车，"]],
  ["application-dialogue-flow:2A:segment:02:action:00", ["constructor:school-donation-service-result", "application-command:2A:text-record:203393", null, "是吗？"]],
  ["application-dialogue-flow:2A:segment:06:action:00", ["constructor:school-donation-service-result", "application-command:2A:text-record:203410", null, "捐款成功"]],
  ["application-dialogue-flow:2A:segment:07:action:00", ["constructor:school-donation-service-result", "application-command:2A:text-record:203413", null, "募捐这么多，"]],
  ["application-dialogue-flow:2B:segment:02:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204715", "region_id", "明白了！"]],
  ["application-dialogue-flow:2B:segment:03:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204725", "region_id", "镜片，镜片，镜片"]],
  ["application-dialogue-flow:2B:segment:04:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204727", "region_id", "你带来镜片了吗？"]],
  ["application-dialogue-flow:2B:segment:05:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204737", "region_id", "啊！"]],
  ["application-dialogue-flow:2B:segment:06:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204739", "region_id", "镜片，镜片，境片！"]],
  ["application-dialogue-flow:2B:segment:14:action:00", ["constructor:laser-cannon-lens-service-reception", "application-command:2B:text-record:204783", "region_id", "你没带激光炮，"]],
  ["application-dialogue-flow:2B:segment:10:action:00", ["constructor:laser-cannon-lens-service-arrangement", "application-command:2B:text-record:204759", "region_id", "这样可以吗？"]],
  ["application-dialogue-flow:2E:segment:01:action:00", ["constructor:vehicle-wash-service-reception", "application-command:2E:text-record:203127", null, "对不起，"]],
  ["application-dialogue-flow:2E:segment:04:action:00", ["constructor:vehicle-wash-service-reception", "application-command:2E:text-record:203143", null, "什么！没带钱啊。"]],
  ["application-dialogue-flow:2E:segment:06:action:00", ["constructor:vehicle-wash-service-reception", "application-command:2E:text-record:203150", null, "车外的人，"]],
  ["application-dialogue-flow:2F:segment:01:action:00", ["constructor:paralysis-massage-service-reception", "application-command:2F:text-record:201930", null, "请再来！"]],
  ["application-dialogue-flow:2F:segment:03:action:00", ["constructor:paralysis-massage-service-reception", "application-command:2F:text-record:201938", null, "哎呀，"]],
  ["application-dialogue-flow:2F:segment:03:action:01", ["constructor:paralysis-massage-service-reception", "application-command:2F:text-record:201939", null, "请再来！"]],
  ["application-dialogue-flow:2F:segment:09:action:01", ["constructor:paralysis-massage-service-reception", "application-command:2F:text-record:201966", null, "请再来！"]],
  ["application-dialogue-flow:2F:segment:10:action:00", ["constructor:paralysis-massage-service-result", "application-command:2F:text-record:201968", null, "身体的"]],
  ["application-dialogue-flow:2F:segment:10:action:01", ["constructor:paralysis-massage-service-result", "application-command:2F:text-record:201972", null, "请再来！"]],
  ["application-dialogue-flow:30:segment:01:action:00", ["constructor:vehicle-rental-service-return-confirm", "application-command:30:text-record:202322", "region_id", "欢迎再来。"]],
  ["application-dialogue-flow:30:segment:02:action:00", ["constructor:vehicle-rental-service-return-confirm", "application-command:30:text-record:202325", "region_id", "您好象一辆也没借。"]],
  ["application-dialogue-flow:34:segment:00:action:00", ["constructor:save-management-greeting", "application-command:34:text-record:201876", null, "回应"]],
  ["application-dialogue-flow:34:segment:03:action:00", ["constructor:save-management-greeting", "application-command:34:text-record:201893", null, "请慢走，小心点。"]],
  ["application-dialogue-flow:34:segment:08:action:00", ["constructor:save-management-greeting", "application-command:34:text-record:201920", null, "重新储存吗？"]],
]);

const goodsFamilies = new Map([['application-command:10', 0], ['application-command:11', 1],
  ['application-command:12', 2], ['application-command:13', 3]]);

function facilityServiceResponsePreview(branch, body, previews, templateId = null) {
  const binding = responses.get(body?.id);
  if (!binding) return null;
  const [defaultId, handle, regionField, label] = binding;
  const id = templateId || defaultId;
  const template = previews?.find(row => row.id === id);
  if (!template?.shop_menu || !template.layers.some(layer => layer.shop_welcome)) return null;
  const preview = {...template};
  if (template.glyph_cache_entry) preview.glyph_cache_entry = {...template.glyph_cache_entry};
  if (branch.command === 'application-command:21' && preview.menu_highlight)
    preview.menu_highlight = {...preview.menu_highlight, show_cursor: false};
  const parameters = body.parameters;
  const menu = {...preview.shop_menu, resource_id: branch.command, welcome_handle: handle};
  if (body.id === 'application-dialogue-flow:2A:segment:06:action:00') {
    menu.runtime_name_buffer = true;
    menu.game_defect = '游戏缺陷：成功回应未写姓名缓冲区；复位入口读出零字节与队伍状态词，前序操作可改变乱码。';
  }
  delete menu.storage_actor_welcome_handles;
  if (branch.command === 'application-command:1E' && menu.mode === 'goods-actor-select') {
    menu.retained_preview_id = 'constructor:herbal-medicine-vendor-goods';
    preview.layers = preview.layers.filter(layer => !layer.shop_actor_markers);
    preview.glyph_cache_entry.application_stages = ['constructor:herbal-medicine-vendor-question',
      'constructor:herbal-medicine-vendor-goods', 'constructor:herbal-medicine-vendor-price'];
  }
  if (branch.command === 'application-command:18' && menu.mode === 'service-actor-select') {
    menu.config_family = 8;
    menu.retained_preview_id = 'constructor:bar-service-alternate-order-list';
    preview.glyph_cache_entry.application_stages = ['constructor:bar-service-alternate-order-list',
      'constructor:bar-service-alternate-order-confirm'];
  }
  if (branch.command === 'application-command:18' && menu.mode === 'service-dialogue') {
    menu.config_family = 8;
    menu.retained_preview_id = 'constructor:bar-service-alternate-drinker-select';
    preview.glyph_cache_entry.application_stages = ['constructor:bar-service-alternate-order-list',
      'constructor:bar-service-alternate-order-confirm', 'constructor:bar-service-alternate-drinker-select'];
  }
  for (const field of ['welcome_slot', 'welcome_script', 'welcome_alias', 'callback_record_base',
    'engine_eligibility_handle', 'role_status_records', 'required_role_status', 'wash_result',
    'wash_price_handle', 'laser_empty_result', 'wanted_information_actor']) delete menu[field];
  if (!parameters.some(binding => binding.value_source?.operation === 'current-wanted-name')) delete menu.wanted_claim;
  if (regionField) menu.welcome_region_field = regionField;
  else delete menu.welcome_region_field;
  if (!preview.service_response_keep_selection_cursor && !['application-dialogue-flow:1E:segment:12:action:00',
    'application-dialogue-flow:18:segment:10:action:00'].includes(body.id)) delete preview.selection_cursor;
  delete preview.selection_cursors;
  return {...preview, id: `constructor:${body.id}${templateId ? `:${templateId.replace(/^constructor:/u, '')}` : ''}`,
    visible_state: templateId ? `${preview.interface_state} · ${label}` : label,
    shop_menu: menu, service_response: {template_id: id, record_selection: {
      resource_id: branch.command, entity_handle: handle, field: 'record_id'}, parameters,
      config_family: goodsFamilies.get(branch.command)},
    runtime_context: {...preview.runtime_context,
      confirmed_waits: preview.service_response_confirmed_waits ?? 0},
    field_sources: [...preview.field_sources, ...['record_id', ...(regionField ? [regionField] : [])]
      .map(field => ({role: '回应正文', reference: {
        resource_id: branch.command, entity_handle: handle, field}}))],
    layers: preview.layers.map(layer => layer.shop_welcome ? {...layer, record: body.record,
      inline_confirm: false, facility_parameter_bindings: parameters,
      facility_parameter_context: {}} : layer)};
}

// @editor-module 售货机回应复用整屏构造；绑定依据见终端服务证据。
const vendingResponses = Object.freeze([
  {segment: '01', handle: 'application-command:1B:text-record:204342', label: '商品选择'},
  {segment: '07', handle: 'application-command:1B:text-record:204369', label: '携带容量不足'},
  {segment: '08', handle: 'application-command:1B:text-record:204372', label: '投币回应'},
  {segment: '09', handle: 'application-command:1B:text-record:204378', record: 'record:10:111', label: '人物选择', party: 'characters'},
  {segment: '11', handle: 'application-command:1B:text-record:204387', label: '金额不足'},
]);
const shellVendingResponses = Object.freeze([
  {segment: '01', offset: 204427, record: 'record:10:108', label: '商品选择'},
  {segment: '04', offset: 204444, record: 'record:10:114', label: '无战车'},
  {segment: '05', offset: 204447, record: 'record:10:111', label: '战车选择', party: 'vehicles'},
  {segment: '09', offset: 204463, record: 'record:10:110', label: '投币回应'},
  {segment: '14', offset: 204487, record: 'record:10:117', label: '炮弹容量不足'},
  {segment: '15', offset: 204490, record: 'record:10:112', label: '金额不足'},
]);
const dualVendingResponses = Object.freeze([
  {segment: '01', offset: 204538, record: 'record:10:108', label: '商品选择'},
  {segment: '05', offset: 204538, record: 'record:10:111', label: '战车选择', party: 'vehicles',
    source: 'application-dialogue-flow:1D:segment:05'},
  {segment: '07', offset: 204566, record: 'record:10:114', label: '无战车'},
  {segment: '08', offset: 204572, record: 'record:10:110', label: '投币回应'},
  {segment: '10', offset: 204581, record: 'record:10:112', label: '金额不足'},
]);
const vendingRetainedStates = Object.freeze({
  '1B': ['02', '03', '04', '05', '10', '17'],
  '1C': ['00', '02', '03', '16'],
  '1D': ['00', '02', '03', '04', '09', '11'],
});

function vendingServiceResponseEntries(familyId = 11) {
  const command = familyId === 11 ? '1B' : familyId === 12 ? '1C' : familyId === 13 ? '1D' : null;
  if (!command) return [];
  return (familyId === 11 ? vendingResponses : familyId === 12 ? shellVendingResponses : dualVendingResponses).map(row => ({...row,
    command, familyId, handle: row.handle || `application-command:${command}:text-record:${row.offset}`,
    source: row.source || `application-dialogue-flow:${command}:segment:${row.segment}:action:00`}));
}

function vendingServiceResponsePreview(previews, source) {
  const lottery = vendingLotteryPreview(previews, source);
  if (lottery) return lottery;
  const retained = /^application-dialogue-flow:(1B|1C|1D):segment:(\d{2})$/u.exec(source || '');
  const dualParty = retained?.[1] === '1D' && retained[2] === '05';
  const dualPurchase = retained?.[1] === '1D' && retained[2] === '06';
  const inventoryCheck = retained?.[1] === '1B' && retained[2] === '06';
  const shellPurchase = retained?.[1] === '1C' && ['08', '12'].includes(retained[2]);
  const shellCheck = retained?.[1] === '1C' && ['06', '07', '10', '11', '13', '22'].includes(retained[2])
    ? retained[2] : null;
  const responseSource = shellPurchase || shellCheck ? 'application-dialogue-flow:1C:segment:09:action:00'
    : inventoryCheck ? 'application-dialogue-flow:1B:segment:08:action:00'
    : dualPurchase ? 'application-dialogue-flow:1D:segment:08:action:00'
    : retained && (vendingRetainedStates[retained[1]].includes(retained[2]) || dualParty)
    ? `application-dialogue-flow:${retained[1]}:segment:01:action:00` : source;
  const binding = [11, 12, 13].flatMap(vendingServiceResponseEntries).find(row => row.source === responseSource);
  const template = previews?.find(row => row.id === 'constructor:vending-machine-screen');
  if (!binding || !template?.facility_screen) return null;
  const preview = structuredClone(template);
  const party = dualParty ? 'vehicles' : binding.party;
  const selectionHandle = `application-command:${binding.command}:selection-layout:${binding.familyId === 11 ? 204337 : binding.familyId === 12 ? 204421 : 204533}`;
  return {...preview, id: `constructor:${source}`, visible_state: shellCheck ? '炮弹购买回应' : inventoryCheck ? '购买容量回应' : party ? '购买对象选择' : binding.label,
    terminal_response: {template_id: template.id, source, wait_marker: !party && binding.segment !== '01', party,
      inventory_check: inventoryCheck,
      shell_check: shellCheck,
      scope: shellCheck ? 'shell-purchase-response' : inventoryCheck ? 'inventory-response' : party ? 'party-selection'
        : dualPurchase || shellPurchase ? 'post-selection-coin-response'
          : retained ? 'retained-goods-screen' : 'fixed-body-response'},
    facility_screen: {...preview.facility_screen, resource_id: `application-command:${binding.command}`,
      configuration_family: binding.familyId,
      selection_handle: selectionHandle, body_handle: binding.handle,
      body_region_field: 'region_id'},
    runtime_context: {...preview.runtime_context},
    field_sources: [...preview.field_sources.filter(row => row.reference?.resource_id !== 'application-command:1B'),
      {role: '索引14价格码', reference: fieldSubmenuCodeSource('vending-shell-overflow-price-code')},
      ...(inventoryCheck ? [{role: '人物携带容量', reference: fieldSubmenuCodeSource('vending-role-inventory-capacity')},
        ...['record_id', 'region_id'].map(field => ({role: '容量不足回应', reference: {
          resource_id: 'application-command:1B', entity_handle: 'application-command:1B:text-record:204369', field}}))] : []),
      ...(party ? ['vending-party-selector', 'vending-party-name-origin', 'shop-actor-name-record',
        'shop-vehicle-name-record'].map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})) : []),
      ...(shellCheck ? ['vending-shell-type-capacity', 'vending-loaded-weapon-item-limit',
        'vending-loaded-weapon-count-mask']
        .map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})) : []),
      ...(shellCheck === '22' ? Array.from({length: 6}, (_, index) => ({role: '商品购买分支',
        reference: {resource_id: 'application-command:1C',
          entity_handle: 'application-command:1C:choice-branches:204521', field: `target:${index}`}})) : []),
      ...(shellCheck ? [204487, 204490].flatMap(offset => ['record_id', 'region_id'].map(field => ({role: '炮弹购买失败回应',
        reference: {resource_id: 'application-command:1C', entity_handle: `application-command:1C:text-record:${offset}`, field}}))) : []),
      ...['selector', 'count'].map(field => ({role: '商品选择', reference: {
        resource_id: `application-command:${binding.command}`, entity_handle: selectionHandle, field}})),
      ...['record_id', 'region_id'].map(field => ({
      role: binding.label, reference: {resource_id: `application-command:${binding.command}`,
        entity_handle: binding.handle, field}}))]};
}

function vendingLotteryPreview(previews, source) {
  const match = /^application-dialogue-flow:(1B|1C|1D):segment:(\d{2})(?::action:00)?$/u.exec(source || '');
  if (!match) return null;
  const first = match[1] === '1C' ? 17 : 12;
  const stage = Number(match[2]) - first;
  if (stage < 0 || stage > 4) return null;
  const offsets = match[1] === '1B' ? [204393, 204396, 204408, 204412]
    : match[1] === '1C' ? [204499, 204502, 204514, 204518] : [204590, 204593, 204605, 204609];
  const goods = vendingServiceResponsePreview(previews, `application-dialogue-flow:${match[1]}:segment:01:action:00`);
  if (!goods) return null;
  const bodyHandles = Object.fromEntries(['won', 'recipient', 'capacity', 'cancel'].map((name, index) =>
    [name, `application-command:${match[1]}:text-record:${offsets[index]}`]));
  bodyHandles.goods = goods.facility_screen.body_handle;
  return {...goods, id: `constructor:${source}`, visible_state: ['抽奖结果', '奖品领取对象', '奖品容量判断', '奖品容量不足', '取消领取'][stage],
    terminal_response: {...goods.terminal_response, source, scope: 'lottery-result-stable-display',
      lottery: {stage, body_handles: bodyHandles}, party: stage === 1 ? 'characters' : null,
      wait_marker: stage !== 1},
    facility_screen: {...goods.facility_screen, body_handle: bodyHandles[stage === 0 ? 'won' : stage === 3 ? 'capacity' : 'cancel']},
    field_sources: [...goods.field_sources,
      ...['vending-lottery-ball-object', 'vending-lottery-win-x', 'vending-role-inventory-capacity',
        'vending-party-selector', 'vending-party-name-origin', 'shop-actor-name-record',
        ...Array.from({length: 16}, (_, index) => `vending-lottery-x-${index}`),
        ...Array.from({length: 16}, (_, index) => `vending-lottery-y-${index}`)]
        .map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})),
      ...Object.values(bodyHandles).flatMap(handle => ['record_id', 'region_id'].map(field => ({role: '抽奖回应',
        reference: {resource_id: goods.facility_screen.resource_id, entity_handle: handle, field}})))]};
}

function elevatorServicePreview(source) {
  if (source !== 'application-dialogue-flow:1F:segment:00') return null;
  return {id: 'constructor:elevator-list', visible_state: '楼层选择',
    interface_state_id: 'unresolved-dynamic-list-application.list',
    viewport: {x: 0, y: 0, width: 256, height: 240},
    pattern_profiles: ['common-ui-bg:0A-80-BF', 'common-ui-frame:CB-C0-FF'],
    glyph_cache_source: 'field-pools', glyph_cache_entry: {dialogue: true},
    layers: [{kind: 'script', record: 'record:03:019', cursor: 0, elevator_frame: true}],
    ui_palette_source: {palette_index: 3, color_parameters: ['field-ui-palette-background',
      'field-ui-palette-foreground', 'field-ui-palette-light', 'field-ui-palette-dark']},
    sprite_palette_source: {resource_id: 'actor-visual', field: 'field_sprite_palettes'},
    facility_screen: {kind: 'elevator', resource_id: 'application-command:1F',
      frame_handle: 'application-command:1F:layout-record:204300',
      selection_handle: 'application-command:1F:selection-layout:204306'},
    field_sources: ['record_id', 'selector', 'count'].map((field, index) => ({
      role: index ? '楼层选择' : '楼层窗口', reference: {resource_id: 'application-command:1F',
        entity_handle: index ? 'application-command:1F:selection-layout:204306'
          : 'application-command:1F:layout-record:204300', field}}))};
}

function controllerServicePreview(previews, source, invocation = {}) {
  const match = /^application-dialogue-flow:(36|37|38):segment:(00|01|02|03|04|05|06|07)$/u.exec(source || '');
  const template = previews?.find(row => row.id === 'constructor:computer-controller-screen');
  if (!match || !template || !invocation.entryHandle) return null;
  const command = match[1], sceneResource = invocation.entryHandle.split(':').slice(0, 2).join(':');
  const feedback = command === '37' && ['05', '06', '07'].includes(match[2]);
  const success = feedback && match[2] === '06';
  const flagExit = command !== '37' && ['03', '04'].includes(match[2]);
  if (command !== '37' && ['05', '06', '07'].includes(match[2])) return null;
  const preview = structuredClone(template);
  const frame = command === '37' ? 204245 : 204048;
  const selector = command === '37' ? 204253 : 204053;
  const sourceFields = preview.field_sources.filter(row => !['scene:8B', 'application-command:36'].includes(row.reference?.resource_id));
  const parameters = ['controller-status-fallback',
    ...Array.from({length: 7}, (_, index) => `controller-status-record-${16 + index}`),
    ...(command === '37' ? ['controller-password-length', 'controller-password-fill', 'controller-password-terminator',
      'controller-password-cursor-object', 'controller-password-cursor-x', 'controller-password-cursor-y',
      'controller-password-cursor-step',
      ...Array.from({length: 23}, (_, index) => `controller-event-flag-${index}`),
      ...Array.from({length: 24}, (_, index) => `controller-password-byte-${index}`),
      ...Array.from({length: 4}, (_, index) => `controller-password-offset-${index}`)] : []),
    ...(feedback ? ['controller-password-success-record', 'controller-password-error-record', 'controller-password-clear-selector',
      'controller-password-clear-origin-low', 'controller-password-clear-origin-high',
      'controller-password-clear-width', 'controller-password-clear-rows'] : [])];
  return {...preview, id: `constructor:${source}`, visible_state: feedback ? success ? '密码通过' : '密码比较结果' : command === '37' ? '密码输入' : '控制器待机',
    ...(feedback ? {interface_state_id: 'control-terminals.feedback', interface_state_ids: ['control-terminals.feedback'],
      terminal_response: {template_id: template.id, scope: success ? 'password-success-display' : 'password-input-comparison'}} : {}),
    ...(flagExit ? {terminal_response: {template_id: template.id, scope: 'retained-controller-before-scene-unfold'}} : {}),
    facility_screen: {...preview.facility_screen, resource_id: `application-command:${command}`,
      password_feedback: feedback ? success ? 'success' : 'compare' : null,
      password_stage: command === '37' ? match[2] : null,
      expected_handler: 8 + Number.parseInt(command, 16) - 0x36,
      entry_resource: sceneResource, entry_handle: invocation.entryHandle,
      frame_handle: `application-command:${command}:layout-record:${frame}`,
      selection_handle: `application-command:${command}:selection-layout:${selector}`},
    field_sources: [...sourceFields, ...parameters.map(name => ({role: name, reference: fieldSubmenuCodeSource(name)})),
      ...['handler_selector', 'instance_id'].map(field => ({
      role: '终端入口', reference: {resource_id: sceneResource, entity_handle: invocation.entryHandle, field}})),
      {role: '终端窗口', reference: {resource_id: `application-command:${command}`,
        entity_handle: `application-command:${command}:layout-record:${frame}`, field: 'record_id'}},
      ...['selector', 'count'].map(field => ({role: '终端键盘', reference: {resource_id: `application-command:${command}`,
        entity_handle: `application-command:${command}:selection-layout:${selector}`, field}}))]};
}

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

function vehicleTradeServicePreview(branch, body, previews, invocation = {}) {
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

// @editor-module 服务调用片段只引用已确认的界面状态构造。
// 绑定的 ROM 读取链见 project/evidence/service-flow-preview-closure/bindings.json。
// 改造建议的 ROM 读取链见 project/evidence/service-flows-vehicle/advice.json。
const bindings = new Map([
  ["application-dialogue-flow:15:segment:07:action:00", ["constructor:special-shell-shop-special-goods"]],
  ["application-dialogue-flow:15:segment:10:action:00", ["constructor:special-shell-shop-special-actors"]],
  ["application-dialogue-flow:15:segment:12:action:00", ["constructor:special-shell-shop-special-type-limit"]],
  ["application-dialogue-flow:15:segment:15:action:00", ["constructor:special-shell-shop-special-decline"]],
  ["application-dialogue-flow:15:segment:18:action:00", ["constructor:special-shell-shop-ordinary-result", "constructor:special-shell-shop-special-result"]],
  ["application-dialogue-flow:15:segment:24:action:00", ["constructor:special-shell-shop-ordinary-quantity"]],
  ["application-dialogue-flow:15:segment:27:action:00", ["constructor:special-shell-shop-ordinary-quote"]],
  ["application-dialogue-flow:15:segment:28:action:00", ["constructor:special-shell-shop-ordinary-decline"]],
  ["application-dialogue-flow:15:segment:30:action:00", ["constructor:special-shell-shop-ordinary-result"]],
  ["application-dialogue-flow:15:segment:33:action:00", ["constructor:special-shell-shop-special-quote"]],
  ["application-dialogue-flow:15:segment:41:action:00", ["constructor:special-shell-shop-sale-decline"]],
  ["application-dialogue-flow:15:segment:42:action:00", ["constructor:special-shell-shop-special-quantity"]],
  ["application-dialogue-flow:15:segment:43:action:00", ["constructor:special-shell-shop-special-full"]],
  ["application-dialogue-flow:15:segment:45:action:00", ["constructor:special-shell-shop-sale-empty"]],
  ["application-dialogue-flow:15:segment:46:action:00", ["constructor:special-shell-shop-ordinary-no-weapons"]],
  ["application-dialogue-flow:15:segment:40:action:00", ["constructor:special-shell-shop-sale-quantity"]],
  ["application-dialogue-flow:15:segment:39:action:00", ["constructor:special-shell-shop-sale-offer"]],
  ["application-dialogue-flow:15:segment:20:action:00", ["constructor:special-shell-shop-buy-actors"]],
  ["application-dialogue-flow:15:segment:22:action:00", ["constructor:special-shell-shop-buy-weapons"]],
  ["application-dialogue-flow:15:segment:35:action:00", ["constructor:special-shell-shop-sale-actors"]],
  ["application-dialogue-flow:15:segment:44:action:00", ["constructor:special-shell-shop-sale-inventory"]],
  ["application-dialogue-flow:13:segment:28:action:00", ["constructor:human-item-shop-empty"]],
  ["application-dialogue-flow:13:segment:31:action:00", ["constructor:human-item-shop-unpriced"]],
  ["application-dialogue-flow:13:segment:54:action:00", ["constructor:human-item-shop-part-guard"]],
  ["application-dialogue-flow:12:segment:28:action:00", ["constructor:human-equipment-shop-empty"]],
  ["application-dialogue-flow:12:segment:31:action:00", ["constructor:human-equipment-shop-unpriced"]],
  ["application-dialogue-flow:12:segment:54:action:00", ["constructor:human-equipment-shop-part-guard"]],
  ["application-dialogue-flow:11:segment:28:action:00", ["constructor:vehicle-item-shop-empty"]],
  ["application-dialogue-flow:11:segment:44:action:00", ["constructor:vehicle-item-shop-rental-guard"]],
  ["application-dialogue-flow:11:segment:54:action:00", ["constructor:vehicle-item-shop-part-guard"]],
  ["application-dialogue-flow:10:segment:28:action:00", ["constructor:vehicle-equipment-shop-empty"]],
  ["application-dialogue-flow:10:segment:44:action:00", ["constructor:vehicle-equipment-shop-rental-guard"]],
  ["application-dialogue-flow:10:segment:54:action:00", ["constructor:vehicle-equipment-shop-part-guard"]],
  ["application-dialogue-flow:14:segment:08:action:00", ["constructor:vehicle-rental-service-vehicle-list"]],
  ["application-dialogue-flow:14:segment:08:callback:202232:read:0", ["constructor:vehicle-rental-service-vehicle-list"]],
  ["application-dialogue-flow:14:segment:01", ["constructor:vehicle-rental-service-terms"]],
  ["application-dialogue-flow:14:segment:02", ["constructor:vehicle-rental-service-terms"]],
  ["application-dialogue-flow:14:segment:05", ["constructor:vehicle-rental-service-rental-menu"]],
  ["application-dialogue-flow:14:segment:07", ["constructor:vehicle-rental-service-rental-menu"]],
  ["application-dialogue-flow:14:segment:09", ["constructor:vehicle-rental-service-vehicle-list"]],
  ["application-dialogue-flow:14:segment:10:action:01", ["constructor:vehicle-rental-service-actor-select"]],
  ["application-dialogue-flow:14:segment:11", ["constructor:vehicle-rental-service-actor-select"]],
  ["application-dialogue-flow:14:segment:12:action:00", ["constructor:vehicle-rental-service-boarded"]],
  ["application-dialogue-flow:14:segment:12:action:01", ["constructor:vehicle-rental-service-continue"]],
  ["application-dialogue-flow:14:segment:13:action:00", ["constructor:vehicle-rental-service-transferred"]],
  ["application-dialogue-flow:14:segment:13:action:01", ["constructor:vehicle-rental-service-continue-after-transfer"]],
  ["application-dialogue-flow:14:segment:14:action:00", ["constructor:vehicle-rental-service-limit", "constructor:vehicle-rental-service-limit-confirm"]],
  ["application-dialogue-flow:14:segment:15", ["constructor:vehicle-rental-service-limit-confirm"]],
  ["application-dialogue-flow:14:segment:17", ["constructor:vehicle-rental-service-rental-menu", "constructor:vehicle-rental-service-return-select"]],
  ["application-dialogue-flow:14:segment:19:action:00", ["constructor:vehicle-rental-service-return-select"]],
  ["application-dialogue-flow:14:segment:20", ["constructor:vehicle-rental-service-return-select"]],
  ["application-dialogue-flow:14:segment:21:action:00", ["constructor:vehicle-rental-service-return-result"]],
  ["application-dialogue-flow:14:segment:23", ["constructor:vehicle-rental-service-actor-select"]],
  ["application-dialogue-flow:10:segment:32:action:00", ["constructor:vehicle-equipment-shop-sale-offer", "constructor:vehicle-equipment-shop-sale-price"]],
  ["application-dialogue-flow:11:segment:32:action:00", ["constructor:vehicle-item-shop-sale-offer", "constructor:vehicle-item-shop-sale-price"]],
  ["application-dialogue-flow:10:segment:22:action:00", ["constructor:vehicle-equipment-shop-sale-actors"]],
  ["application-dialogue-flow:10:segment:24", ["constructor:vehicle-equipment-shop-sale-category"]],
  ["application-dialogue-flow:10:segment:25", ["constructor:vehicle-equipment-shop-sale-category"]],
  ["application-dialogue-flow:10:segment:27", ["constructor:vehicle-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:10:segment:29", ["constructor:vehicle-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:10:segment:30", ["constructor:vehicle-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:11:segment:22:action:00", ["constructor:vehicle-item-shop-sale-actors"]],
  ["application-dialogue-flow:11:segment:24", ["constructor:vehicle-item-shop-sale-category"]],
  ["application-dialogue-flow:11:segment:25", ["constructor:vehicle-item-shop-sale-category"]],
  ["application-dialogue-flow:11:segment:27", ["constructor:vehicle-item-shop-sale-inventory"]],
  ["application-dialogue-flow:11:segment:29", ["constructor:vehicle-item-shop-sale-inventory"]],
  ["application-dialogue-flow:11:segment:30", ["constructor:vehicle-item-shop-sale-inventory"]],
  ["application-dialogue-flow:10:segment:00:action:00", ["constructor:vehicle-equipment-shop-buy-sell", "constructor:vehicle-equipment-shop-welcome"]],
  ["application-dialogue-flow:10:segment:04:action:00", ["constructor:vehicle-equipment-shop-goods"]],
  ["application-dialogue-flow:10:segment:09:action:00", ["constructor:vehicle-equipment-shop-insufficient-funds"]],
  ["application-dialogue-flow:10:segment:11:action:00", ["constructor:vehicle-equipment-shop-confirm"]],
  ["application-dialogue-flow:10:segment:14:action:00", ["constructor:vehicle-equipment-shop-vehicle-select"]],
  ["application-dialogue-flow:11:segment:00:action:00", ["constructor:vehicle-item-shop-buy-sell", "constructor:vehicle-item-shop-welcome"]],
  ["application-dialogue-flow:11:segment:04:action:00", ["constructor:vehicle-item-shop-goods"]],
  ["application-dialogue-flow:11:segment:11:action:00", ["constructor:vehicle-item-shop-confirm"]],
  ["application-dialogue-flow:11:segment:14:action:00", ["constructor:vehicle-item-shop-vehicle-select"]],
  ["application-dialogue-flow:12:segment:00:action:00", ["constructor:human-equipment-shop-buy-sell", "constructor:human-equipment-shop-welcome"]],
  ["application-dialogue-flow:12:segment:04:action:00", ["constructor:human-equipment-shop-goods"]],
  ["application-dialogue-flow:12:segment:11:action:00", ["constructor:human-equipment-shop-confirm"]],
  ["application-dialogue-flow:12:segment:14:action:00", ["constructor:human-equipment-shop-actor-select"]],
  ["application-dialogue-flow:12:segment:22:action:00", ["constructor:human-equipment-shop-sale-actors"]],
  ["application-dialogue-flow:12:segment:24", ["constructor:human-equipment-shop-sale-category"]],
  ["application-dialogue-flow:12:segment:25", ["constructor:human-equipment-shop-sale-category"]],
  ["application-dialogue-flow:12:segment:27", ["constructor:human-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:12:segment:29", ["constructor:human-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:12:segment:30", ["constructor:human-equipment-shop-sale-inventory"]],
  ["application-dialogue-flow:13:segment:00:action:00", ["constructor:human-item-shop-buy-sell", "constructor:human-item-shop-welcome"]],
  ["application-dialogue-flow:13:segment:04:action:00", ["constructor:human-item-shop-goods"]],
  ["application-dialogue-flow:13:segment:11:action:00", ["constructor:human-item-shop-confirm"]],
  ["application-dialogue-flow:13:segment:14:action:00", ["constructor:human-item-shop-actor-select"]],
  ["application-dialogue-flow:13:segment:22:action:00", ["constructor:human-item-shop-sale-actors"]],
  ["application-dialogue-flow:13:segment:24", ["constructor:human-item-shop-sale-category"]],
  ["application-dialogue-flow:13:segment:25", ["constructor:human-item-shop-sale-category"]],
  ["application-dialogue-flow:13:segment:27", ["constructor:human-item-shop-sale-inventory"]],
  ["application-dialogue-flow:13:segment:29", ["constructor:human-item-shop-sale-inventory"]],
  ["application-dialogue-flow:13:segment:30", ["constructor:human-item-shop-sale-inventory"]],
  ["application-dialogue-flow:14:segment:00:action:00", ["constructor:vehicle-rental-service-rental-menu", "constructor:vehicle-rental-service-reception", "constructor:vehicle-rental-service-terms"]],
  ["application-dialogue-flow:15:segment:00:action:00", ["constructor:special-shell-shop-buy-sell", "constructor:special-shell-shop-reception"]],
  ["application-dialogue-flow:16:segment:00:action:00", ["constructor:inn-service-reception"]],
  ["application-dialogue-flow:16:segment:02:action:00", ["constructor:inn-service-room-ack"]],
  ["application-dialogue-flow:16:segment:03:action:00", ["constructor:inn-service-room-select"]],
  ["application-dialogue-flow:16:segment:05:action:00", ["constructor:inn-service-price-confirm"]],
  ["application-dialogue-flow:16:segment:08:action:00", ["constructor:inn-service-rest-result"]],
  ["application-dialogue-flow:17:segment:00:action:00", ["constructor:bar-service-order-list"]],
  ["application-dialogue-flow:17:segment:01:action:00", ["constructor:bar-service-eligibility"]],
  ["application-dialogue-flow:17:segment:02:action:00", ["constructor:bar-service-hunter-refusal"]],
  ["application-dialogue-flow:17:segment:02:action:01", ["constructor:bar-service-drink-result"]],
  ["application-dialogue-flow:17:segment:04:action:00", ["constructor:bar-service-order-confirm"]],
  ["application-dialogue-flow:17:segment:05", ["constructor:bar-service-order-confirm"]],
  ["application-dialogue-flow:17:segment:10:action:00", ["constructor:bar-service-drinker-select"]],
  ["application-dialogue-flow:18:segment:04:action:00", ["constructor:bar-service-alternate-order-confirm"]],
  ["application-dialogue-flow:18:segment:05:action:00", ["constructor:bar-service-alternate-order-list"]],
  ["application-dialogue-flow:18:segment:05", ["constructor:bar-service-alternate-order-list"]],
  ["application-dialogue-flow:18:segment:10:action:00", ["constructor:bar-service-alternate-drinker-select"]],
  ["application-dialogue-flow:18:segment:02:action:01", ["constructor:bar-service-alternate-drink-result"]],
  ["application-dialogue-flow:19:segment:00:action:00", ["constructor:interior-decoration-shop-reception", "constructor:interior-decoration-shop-introduction", "constructor:interior-decoration-shop-question", "constructor:interior-decoration-shop-list"]],
  ["application-dialogue-flow:19:segment:04:action:00", ["constructor:interior-decoration-shop-offer"]],
  ["application-dialogue-flow:19:segment:08:action:00", ["constructor:interior-decoration-shop-limit", "constructor:interior-decoration-shop-limit-detail"]],
  ["application-dialogue-flow:19:segment:09:action:00", ["constructor:interior-decoration-shop-delivery"]],
  ["application-dialogue-flow:19:segment:10:action:00", ["constructor:interior-decoration-shop-continue"]],
  ["application-dialogue-flow:1A:segment:00", ["constructor:jukebox-screen"]],
  ["application-dialogue-flow:1A:segment:01", ["constructor:jukebox-screen"]],
  ["application-dialogue-flow:1A:segment:02", ["constructor:jukebox-screen"]],
  ["application-dialogue-flow:1B:segment:00", ["constructor:vending-machine-screen"]],
  ["application-dialogue-flow:1E:segment:00", ["constructor:herbal-medicine-vendor-goods"]],
  ["application-dialogue-flow:1E:segment:04:action:00", ["constructor:herbal-medicine-vendor-price"]],
  ["application-dialogue-flow:1E:segment:09:action:00", ["constructor:herbal-medicine-vendor-delivery"]],
  ["application-dialogue-flow:20:segment:00:action:00", ["constructor:vehicle-supply-service-supply-type", "constructor:vehicle-supply-service-ammunition", "constructor:vehicle-supply-service-armor", "constructor:vehicle-supply-service-welcome"]],
  ["application-dialogue-flow:20:segment:01", ["constructor:vehicle-supply-service-supply-type"]],
  ["application-dialogue-flow:20:segment:03", ["constructor:vehicle-supply-service-supply-type"]],
  ["application-dialogue-flow:20:segment:04", ["constructor:vehicle-supply-service-supply-type"]],
  ["application-dialogue-flow:20:segment:06", ["constructor:vehicle-supply-service-ammunition", "constructor:vehicle-supply-service-armor"]],
  ["application-dialogue-flow:20:segment:07", ["constructor:vehicle-supply-service-ammunition", "constructor:vehicle-supply-service-armor"]],
  ["application-dialogue-flow:20:segment:14", ["constructor:vehicle-supply-service-ammunition-vehicle-select", "constructor:vehicle-supply-service-armor-vehicle-select"]],
  ["application-dialogue-flow:20:segment:15:action:00", ["constructor:vehicle-supply-service-ammunition-vehicle-select"]],
  ["application-dialogue-flow:20:segment:17", ["constructor:vehicle-supply-service-ammunition-component-select"]],
  ["application-dialogue-flow:20:segment:18:action:00", ["constructor:vehicle-supply-service-ammunition-component-select"]],
  ["application-dialogue-flow:20:segment:19", ["constructor:vehicle-supply-service-ammunition-component-select"]],
  ["application-dialogue-flow:20:segment:21", ["constructor:vehicle-supply-service-ammunition-component-select"]],
  ["application-dialogue-flow:20:segment:08", ["constructor:vehicle-supply-service-ammunition-checkout", "constructor:vehicle-supply-service-checkout"]],
  ["application-dialogue-flow:20:segment:11", ["constructor:vehicle-supply-service-ammunition-checkout", "constructor:vehicle-supply-service-checkout"]],
  ["application-dialogue-flow:20:segment:13", ["constructor:vehicle-supply-service-ammunition-checkout", "constructor:vehicle-supply-service-checkout"]],
  ["application-dialogue-flow:20:segment:23", ["constructor:vehicle-supply-service-ammunition-quote", "constructor:vehicle-supply-service-armor-fill-confirm"]],
  ["application-dialogue-flow:20:segment:24", ["constructor:vehicle-supply-service-ammunition-quote"]],
  ["application-dialogue-flow:20:segment:29", ["constructor:vehicle-supply-service-armor-fill-menu"]],
  ["application-dialogue-flow:20:segment:32", ["constructor:vehicle-supply-service-armor-fill-confirm"]],
  ["application-dialogue-flow:20:segment:33", ["constructor:vehicle-supply-service-armor-fill-confirm"]],
  ["application-dialogue-flow:20:segment:22:action:00", ["constructor:vehicle-supply-service-ammunition-quote"]],
  ["application-dialogue-flow:20:segment:28:callback:202460:read:0", ["constructor:vehicle-supply-service-armor-fill-menu"]],
  ["application-dialogue-flow:20:segment:31:action:00", ["constructor:vehicle-supply-service-armor-fill-confirm"]],
  ["application-dialogue-flow:20:segment:36", ["constructor:vehicle-supply-service-armor-quantity-input"]],
  ["application-dialogue-flow:20:segment:38", ["constructor:vehicle-supply-service-ammunition-quantity-input"]],
  ["application-dialogue-flow:20:segment:30:action:00", ["constructor:vehicle-supply-service-armor-quantity-quote"]],
  ["application-dialogue-flow:20:segment:39", ["constructor:vehicle-supply-service-ammunition-quantity-input"]],
  ["application-dialogue-flow:20:segment:40", ["constructor:vehicle-supply-service-ammunition-component-select"]],
  ["application-dialogue-flow:20:segment:41:action:00", ["constructor:vehicle-supply-service-ammunition-quantity-quote"]],
  ["application-dialogue-flow:20:segment:42:action:00", ["constructor:vehicle-supply-service-no-ammunition-components"]],
  ["application-dialogue-flow:21:segment:22", ["constructor:family-home-service-menu"]],
  ["application-dialogue-flow:21:segment:28", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:29:action:00", ["constructor:family-home-service-money-offer"]],
  ["application-dialogue-flow:21:segment:31", ["constructor:family-home-service-money-offer"]],
  ["application-dialogue-flow:21:segment:45", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:46", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:47", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:48", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:49", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:50", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:52", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:25:action:00", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:36:action:00", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:26", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:21:segment:37", ["constructor:family-home-service-amount-input"]],
  ["application-dialogue-flow:20:segment:27:action:00", ["constructor:vehicle-supply-service-armor-vehicle-select"]],
  ["application-dialogue-flow:20:segment:05:action:00", ["constructor:vehicle-supply-service-no-vehicle"]],
  ["application-dialogue-flow:20:segment:34:action:00", ["constructor:vehicle-supply-service-ammunition-checkout", "constructor:vehicle-supply-service-checkout"]],
  ["application-dialogue-flow:21:segment:00:action:00", ["constructor:family-home-service-menu"]],
  ["application-dialogue-flow:21:segment:06:action:00", ["constructor:family-home-service-vehicle-repair"]],
  ["application-dialogue-flow:21:segment:02", ["constructor:family-home-service-menu"]],
  ["application-dialogue-flow:21:segment:04", ["constructor:family-home-service-vehicle-repair"]],
  ["application-dialogue-flow:21:segment:08:action:00", ["constructor:family-home-service-repair-single-component"]],
  ["application-dialogue-flow:21:segment:08:action:01", ["constructor:family-home-service-repair-single-quote"]],
  ["application-dialogue-flow:21:segment:09:action:00", ["constructor:family-home-service-repair-warning"]],
  ["application-dialogue-flow:21:segment:09:action:01", ["constructor:family-home-service-repair-scope"]],
  ["application-dialogue-flow:21:segment:13", ["constructor:family-home-service-repair-scope"]],
  ["application-dialogue-flow:21:segment:14:action:00", ["constructor:family-home-service-repair-total"]],
  ["application-dialogue-flow:21:segment:15", ["constructor:family-home-service-repair-component-select"]],
  ["application-dialogue-flow:21:segment:16:action:00", ["constructor:family-home-service-repair-component-select"]],
  ["application-dialogue-flow:21:segment:17", ["constructor:family-home-service-repair-component-select"]],
  ["application-dialogue-flow:21:segment:18:action:00", ["constructor:family-home-service-repair-component-quote"]],
  ["application-dialogue-flow:22:segment:00:action:00", ["constructor:minchi-revival-service-reception", "constructor:minchi-revival-service-menu"]],
  ["application-dialogue-flow:22:segment:05:action:00", ["constructor:minchi-revival-service-corpse-select"]],
  ["application-dialogue-flow:22:segment:09:action:00", ["constructor:minchi-revival-service-success", "constructor:minchi-revival-service-continue"]],
  ["application-dialogue-flow:22:segment:10:action:00", ["constructor:minchi-revival-service-result"]],
  ["application-dialogue-flow:22:segment:11:action:00", ["constructor:minchi-revival-service-shock"]],
  ["application-dialogue-flow:23:segment:00:action:00", ["constructor:chassis-modification-service-reception"]],
  ["application-dialogue-flow:23:segment:00:action:01", ["constructor:chassis-modification-service-introduction"]],
  ["application-dialogue-flow:23:segment:01", ["constructor:chassis-modification-service-introduction"]],
  ["application-dialogue-flow:23:segment:03:action:00", ["constructor:chassis-modification-service-vehicle-select"]],
  ["application-dialogue-flow:23:segment:05", ["constructor:chassis-modification-service-vehicle-select"]],
  ["application-dialogue-flow:23:segment:08", ["constructor:chassis-modification-service-vehicle-select"]],
  ["application-dialogue-flow:23:segment:11:action:00", ["constructor:chassis-modification-service-project-menu"]],
  ["application-dialogue-flow:23:segment:12", ["constructor:chassis-modification-service-project-menu"]],
  ["application-dialogue-flow:23:segment:14", ["constructor:chassis-modification-service-project-menu"]],
  ["application-dialogue-flow:23:segment:15:action:00", ["constructor:chassis-modification-service-capacity-quote"]],
  ["application-dialogue-flow:23:segment:16", ["constructor:chassis-modification-service-capacity-quote"]],
  ["application-dialogue-flow:23:segment:18:action:00", ["constructor:chassis-modification-service-capacity-confirm"]],
  ["application-dialogue-flow:23:segment:19:action:00", ["constructor:chassis-modification-service-capacity-apply"]],
  ["application-dialogue-flow:23:segment:19:action:01", ["constructor:chassis-modification-service-capacity-result"]],
  ["application-dialogue-flow:23:segment:20", ["constructor:chassis-modification-service-project-menu"]],
  ["application-dialogue-flow:23:segment:22:action:00", ["constructor:chassis-modification-service-holes-menu"]],
  ["application-dialogue-flow:23:segment:23", ["constructor:chassis-modification-service-holes-menu"]],
  ["application-dialogue-flow:23:segment:24:action:00", ["constructor:chassis-modification-service-holes-denied"]],
  ["application-dialogue-flow:23:segment:25:action:00", ["constructor:chassis-modification-service-holes-quote"]],
  ["application-dialogue-flow:23:segment:26", ["constructor:chassis-modification-service-capacity-confirm", "constructor:chassis-modification-service-holes-quote"]],
  ["application-dialogue-flow:23:segment:27:action:00", ["constructor:chassis-modification-service-overweight"]],
  ["application-dialogue-flow:23:segment:28", ["constructor:chassis-modification-service-holes-menu"]],
  ["application-dialogue-flow:24:segment:12:action:00", ["constructor:special-item-buyer-offer"]],
  ["application-dialogue-flow:24:segment:01", ["constructor:special-item-buyer-solo-category"]],
  ["application-dialogue-flow:24:segment:04", ["constructor:special-item-buyer-category", "constructor:special-item-buyer-solo-category"]],
  ["application-dialogue-flow:24:segment:02", ["constructor:special-item-buyer-actors"]],
  ["application-dialogue-flow:24:segment:03:action:00", ["constructor:special-item-buyer-actor-cancel", "constructor:special-item-buyer-offer-cancel"]],
  ["application-dialogue-flow:24:segment:05", ["constructor:special-item-buyer-category", "constructor:special-item-buyer-solo-category"]],
  ["application-dialogue-flow:24:segment:06", ["constructor:special-item-buyer-category", "constructor:special-item-buyer-solo-category"]],
  ["application-dialogue-flow:24:segment:08", ["constructor:special-item-buyer-inventory", "constructor:special-item-buyer-solo-inventory"]],
  ["application-dialogue-flow:24:segment:09", ["constructor:special-item-buyer-inventory", "constructor:special-item-buyer-solo-inventory"]],
  ["application-dialogue-flow:24:segment:10", ["constructor:special-item-buyer-inventory", "constructor:special-item-buyer-solo-inventory"]],
  ["application-dialogue-flow:24:segment:07", ["constructor:special-item-buyer-return-actors", "constructor:special-item-buyer-solo-category-cancel"]],
  ["application-dialogue-flow:24:segment:14", ["constructor:special-item-buyer-return-inventory"]],
  ["application-dialogue-flow:24:segment:15", ["constructor:special-item-buyer-return-category", "constructor:special-item-buyer-return-inventory"]],
  ["application-dialogue-flow:25:segment:00:action:00", ["constructor:wanted-information-office-menu", "constructor:wanted-information-intelligence"]],
  ["application-dialogue-flow:25:segment:03", ["constructor:wanted-information-intelligence"]],
  ["application-dialogue-flow:25:segment:11:action:00", ["constructor:wanted-information-bounty-paid"]],
  ["application-dialogue-flow:25:segment:08:action:00", ["constructor:wanted-information-bounty-claim"]],
  ["application-dialogue-flow:26:segment:02", ["constructor:storage-service-deposit-withdraw"]],
  ["application-dialogue-flow:26:segment:11", ["constructor:storage-service-actor-select"]],
  ["application-dialogue-flow:26:segment:15", ["constructor:storage-service-item-list"]],
  ["application-dialogue-flow:26:segment:16", ["constructor:storage-service-item-list"]],
  ["application-dialogue-flow:26:segment:17", ["constructor:storage-service-item-list"]],
  ["application-dialogue-flow:26:segment:18", ["constructor:storage-service-item-list"]],
  ["application-dialogue-flow:26:segment:36", ["constructor:storage-service-withdraw-actor-select"]],
  ["application-dialogue-flow:26:segment:00:action:00", ["constructor:storage-service-reception"]],
  ["application-dialogue-flow:26:segment:01:action:00", ["constructor:storage-service-deposit-withdraw"]],
  ["application-dialogue-flow:26:segment:07:action:00", ["constructor:storage-service-category"]],
  ["application-dialogue-flow:26:segment:14:action:00", ["constructor:storage-service-item-list"]],
  ["application-dialogue-flow:26:segment:19:action:00", ["constructor:storage-service-deposit-location"]],
  ["application-dialogue-flow:26:segment:24:action:00", ["constructor:storage-service-actor-select"]],
  ["application-dialogue-flow:26:segment:49:action:00", ["constructor:storage-service-withdraw-list"]],
  ["application-dialogue-flow:26:segment:33:action:00", ["constructor:storage-service-withdraw-confirm"]],
  ["application-dialogue-flow:26:segment:25:action:00", ["constructor:storage-service-confirm"]],
  ["application-dialogue-flow:27:segment:00:action:00", ["constructor:chassis-modification-service-advice-menu"]],
  ["application-dialogue-flow:27:segment:01", ["constructor:chassis-modification-service-advice-menu"]],
  ["application-dialogue-flow:27:segment:02:action:00", ["constructor:chassis-modification-service-advice-cancel"]],
  ["application-dialogue-flow:27:segment:03", ["constructor:chassis-modification-service-advice-menu"]],
  ["application-dialogue-flow:27:segment:04:action:00", ["constructor:chassis-modification-service-advice-ammo"]],
  ["application-dialogue-flow:27:segment:05:action:00", ["constructor:chassis-modification-service-advice-defense"]],
  ["application-dialogue-flow:27:segment:06:action:00", ["constructor:chassis-modification-service-advice-holes"]],
  ["application-dialogue-flow:27:segment:07:action:00", ["constructor:chassis-modification-service-advice-continue"]],
  ["application-dialogue-flow:28:segment:00:action:00", ["constructor:engine-modification-service-reception"]],
  ["application-dialogue-flow:28:segment:03:action:00", ["constructor:engine-modification-service-vehicle-select"]],
  ["application-dialogue-flow:28:segment:09:action:00", ["constructor:engine-modification-service-eligibility"]],
  ["application-dialogue-flow:28:segment:11:action:00", ["constructor:engine-modification-service-price-confirm"]],
  ["application-dialogue-flow:28:segment:14:action:00", ["constructor:engine-modification-service-upgrade-confirm"]],
  ["application-dialogue-flow:28:segment:15:action:00", ["constructor:engine-modification-service-result"]],
  ["application-dialogue-flow:29:segment:00:action:00", ["constructor:vehicle-repair-service-reception"]],
  ["application-dialogue-flow:29:segment:02:action:00", ["constructor:vehicle-repair-service-question", "constructor:vehicle-repair-service-inspection"]],
  ["application-dialogue-flow:29:segment:03", ["constructor:vehicle-repair-service-question"]],
  ["application-dialogue-flow:29:segment:05:action:00", ["constructor:vehicle-repair-service-component", "constructor:vehicle-repair-service-quote"]],
  ["application-dialogue-flow:29:segment:06", ["constructor:vehicle-repair-service-quote"]],
  ["application-dialogue-flow:29:segment:08:action:00", ["constructor:vehicle-repair-service-fixed", "constructor:vehicle-repair-service-caution"]],
  ["application-dialogue-flow:29:segment:09:action:00", ["constructor:vehicle-repair-service-severe"]],
  ["application-dialogue-flow:29:segment:11", ["constructor:vehicle-repair-service-total"]],
  ["application-dialogue-flow:29:segment:12:action:00", ["constructor:vehicle-repair-service-total"]],
  ["application-dialogue-flow:29:segment:14", ["constructor:vehicle-repair-service-total"]],
  ["application-dialogue-flow:29:segment:16:action:00", ["constructor:vehicle-repair-service-process"]],
  ["application-dialogue-flow:29:segment:17", ["constructor:vehicle-repair-service-component-select"]],
  ["application-dialogue-flow:29:segment:19:action:00", ["constructor:vehicle-repair-service-scope"]],
  ["application-dialogue-flow:29:segment:20:action:00", ["constructor:vehicle-repair-service-component-select"]],
  ["application-dialogue-flow:29:segment:21", ["constructor:vehicle-repair-service-component-select"]],
  ["application-dialogue-flow:29:segment:22:action:00", ["constructor:vehicle-repair-service-component-quote"]],
  ["application-dialogue-flow:29:segment:23", ["constructor:vehicle-repair-service-component-quote"]],
  ["application-dialogue-flow:2A:segment:00:action:00", ["constructor:school-donation-service-solicitation", "constructor:school-donation-service-question", "constructor:school-donation-service-result"]],
  ["application-dialogue-flow:2A:segment:05", ["constructor:school-donation-service-amount"]],
  ["application-dialogue-flow:2B:segment:01:action:00", ["constructor:laser-cannon-lens-service-reception"]],
  ["application-dialogue-flow:2B:segment:09:action:00", ["constructor:laser-cannon-lens-service-arrangement"]],
  ["application-dialogue-flow:2B:segment:12:action:00", ["constructor:laser-cannon-lens-service-result"]],
  ["application-dialogue-flow:2B:segment:15:action:00", ["constructor:laser-cannon-lens-service-reconfigure"]],
  ["application-dialogue-flow:2D:segment:00:action:00", ["constructor:teleport-terminal-prompt"]],
  ["application-dialogue-flow:2D:segment:01:action:00", ["constructor:teleport-terminal-arrival"]],
  ["application-dialogue-flow:2D:segment:02:action:00", ["constructor:teleport-terminal-screen"]],
  ["application-dialogue-flow:2D:segment:02:callback:203429:read:0", ["constructor:teleport-terminal-screen"]],
  ["application-dialogue-flow:2D:segment:03", ["constructor:teleport-terminal-screen"]],
  ["application-dialogue-flow:2E:segment:00:action:00", ["constructor:vehicle-wash-service-reception"]],
  ["application-dialogue-flow:2E:segment:02:action:00", ["constructor:vehicle-wash-service-price-prompt", "constructor:vehicle-wash-service-price"]],
  ["application-dialogue-flow:2E:segment:05:action:00", ["constructor:vehicle-wash-service-process"]],
  ["application-dialogue-flow:2E:segment:07:action:00", ["constructor:vehicle-wash-service-result"]],
  ["application-dialogue-flow:2F:segment:00:action:00", ["constructor:paralysis-massage-service-reception"]],
  ["application-dialogue-flow:2F:segment:00:action:01", ["constructor:paralysis-massage-service-question"]],
  ["application-dialogue-flow:2F:segment:06:action:00", ["constructor:paralysis-massage-service-target"]],
  ["application-dialogue-flow:2F:segment:08:action:00", ["constructor:paralysis-massage-service-eligibility"]],
  ["application-dialogue-flow:2F:segment:09:action:00", ["constructor:paralysis-massage-service-result"]],
  ["application-dialogue-flow:30:segment:00:action:00", ["constructor:vehicle-rental-service-return-confirm"]],
  ["application-dialogue-flow:32:segment:00", ["constructor:frog-race-wager"]],
  ["application-dialogue-flow:32:segment:01:action:00", ["constructor:frog-race-wager"]],
  ["application-dialogue-flow:32:segment:02", ["constructor:frog-race-wager"]],
  ["application-dialogue-flow:32:segment:03:action:00", ["constructor:frog-race-insufficient-funds"]],
  ["application-dialogue-flow:32:segment:04:action:00", ["constructor:frog-race-select"]],
  ["application-dialogue-flow:32:segment:05", ["constructor:frog-race-select"]],
  ["application-dialogue-flow:32:segment:06", ["constructor:frog-race-screen"]],
  ["application-dialogue-flow:32:segment:07:action:00", ["constructor:frog-race-result"]],
  ["application-dialogue-flow:32:segment:08:action:00", ["constructor:frog-race-win"]],
  ["application-dialogue-flow:34:segment:00:action:01", ["constructor:save-prompt"]],
  ["application-dialogue-flow:34:segment:02:action:00", ["constructor:save-management-bed"]],
  ["application-dialogue-flow:34:segment:04:action:00", ["constructor:save-management-process"]],
  ["application-dialogue-flow:34:segment:04:action:01", ["constructor:saved", "constructor:save-management-continue"]],
  ["application-dialogue-flow:34:segment:05", ["constructor:slot-select"]],
  ["application-dialogue-flow:34:segment:08:action:00", ["constructor:save-management-overwrite"]],
  ["application-dialogue-flow:35:segment:00:callback:204319:read:0", ["constructor:next-level-experience-screen"]],
  ["application-dialogue-flow:36:segment:00", ["constructor:computer-controller-screen"]],
]);

const shopControlSuccessors = new Map([
  ['01', ['03', '02:action:00']],
  ['03', ['04:action:00', '39', '02:action:00']],
  ['06', ['08', '07:action:00']],
  ['08', ['36', '09:action:00']],
  ['12', ['13', '14:action:00']],
  ['13', ['15']],
  ['15', ['45', '42:action:00']],
  ['17', ['19:action:00', '18:action:00']],
  ['20', ['21', '22:action:00']],
  ['21', ['23']],
  ['23', ['43', '44:action:00']],
  ['26', ['07:action:00', '22:action:00']],
  ['35', ['29']],
  ['36', ['37', '11:action:00']],
  ['37', ['38:action:00', '11:action:00']],
  ['39', ['40', '20']],
  ['40', ['38:action:00', '20']],
  ['41', ['17', '48']],
  ['43', ['24']],
  ['45', ['50', '46:action:00']],
  ['47', ['07:action:00', '14:action:00']],
  ['48', ['49:action:00', '16:action:00']],
  ['50', ['51', '41']],
  ['51', ['41', '52:action:00']],
  ['53', ['32:action:00', '54:action:00']],
]);

const retainedResponses = new Map([
  ['application-dialogue-flow:21:segment:21', 'application-dialogue-flow:21:segment:20:action:00'],
  ['application-dialogue-flow:21:segment:34', 'application-dialogue-flow:21:segment:32:action:00'],

]);

const controlSuccessors = new Map([
  ['application-dialogue-flow:15:segment:01', ['03', '02:action:00']],
  ['application-dialogue-flow:15:segment:03', ['04:action:00', '34', '02:action:00']],
  ['application-dialogue-flow:15:segment:05', ['06', '01']],
  ['application-dialogue-flow:15:segment:06', ['19', '07:action:00', '01']],
  ['application-dialogue-flow:15:segment:08', ['09:action:00', '10:action:00']],
  ['application-dialogue-flow:15:segment:11', ['12:action:00', '13']],
  ['application-dialogue-flow:15:segment:13', ['42:action:00', '43:action:00']],
  ['application-dialogue-flow:15:segment:14', ['07:action:00', '33:action:00']],
  ['application-dialogue-flow:15:segment:16', ['18:action:00', '17:action:00']],
  ['application-dialogue-flow:15:segment:19', ['09:action:00', '20:action:00']],
  ['application-dialogue-flow:15:segment:21', ['46:action:00', '22:action:00']],
  ['application-dialogue-flow:15:segment:23', ['25', '24:action:00']],
  ['application-dialogue-flow:15:segment:25', ['24:action:00', '26']],
  ['application-dialogue-flow:15:segment:26', ['31', '32']],
  ['application-dialogue-flow:15:segment:29', ['30:action:00', '17:action:00']],
  ['application-dialogue-flow:15:segment:31', ['32', '27:action:00']],
  ['application-dialogue-flow:15:segment:32', ['22:action:00']],
  ['application-dialogue-flow:15:segment:34', ['09:action:00', '35:action:00']],
  ['application-dialogue-flow:15:segment:36', ['44:action:00', '45:action:00']],
  ['application-dialogue-flow:15:segment:37', ['38', '36']],
  ['application-dialogue-flow:15:segment:38', ['36', '39:action:00']],
  ['application-dialogue-flow:15:segment:47', ['36']],
  ...['10', '11', '12', '13'].flatMap(command => [...shopControlSuccessors].map(([segment, targets]) =>
    [`application-dialogue-flow:${command}:segment:${segment}`, targets])),
  ['application-dialogue-flow:12:segment:23', ['43']],
  ['application-dialogue-flow:13:segment:23', ['43']],
  ['application-dialogue-flow:26:segment:03', ['07:action:00', '06:action:00', '49:action:00', '50:action:00', '04:action:00']],
  ['application-dialogue-flow:26:segment:05', ['07:action:00', '06:action:00']],
  ['application-dialogue-flow:26:segment:08', ['10:action:00', '23:action:00', '24:action:00', '01:action:00']],
  ['application-dialogue-flow:26:segment:09', ['10:action:00', '23:action:00']],
  ['application-dialogue-flow:26:segment:12', ['14:action:00', '13:action:00']],
  ['application-dialogue-flow:26:segment:20', ['25:action:00', '27:action:00', '29:action:00', '31:action:00']],
  ['application-dialogue-flow:26:segment:21', ['22:action:00']],
  ['application-dialogue-flow:26:segment:26', ['25:action:00', '27:action:00']],
  ['application-dialogue-flow:26:segment:28', ['25:action:00', '31:action:00', '29:action:00']],
  ['application-dialogue-flow:26:segment:32', ['50:action:00', '49:action:00']],
  ['application-dialogue-flow:26:segment:34', ['30:action:00', '40:action:00', '39:action:00']],
  ['application-dialogue-flow:26:segment:35', ['30:action:00', '40:action:00']],
  ['application-dialogue-flow:26:segment:37', ['38:action:00', '39:action:00', '40:action:00', '43:action:00', '44:action:00', '46:action:00', '47:action:00']],
  ['application-dialogue-flow:26:segment:41', ['43:action:00', '44:action:00', '46:action:00', '47:action:00']],
  ['application-dialogue-flow:26:segment:42', ['44:action:00', '43:action:00']],
  ['application-dialogue-flow:26:segment:45', ['47:action:00', '46:action:00']],
  ['application-dialogue-flow:26:segment:51', ['25:action:00', '31:action:00']],
  ['application-dialogue-flow:25:segment:02', ['03', '05:action:00', '06:action:00', '07:action:00', '01:action:00']],
  ['application-dialogue-flow:25:segment:04', ['05:action:00', '06:action:00', '07:action:00']],
  ['application-dialogue-flow:25:segment:09', ['11:action:00', '10:action:00']],
  ['application-dialogue-flow:25:segment:12', ['14:action:00', '13:action:00']],
  ['application-dialogue-flow:17:segment:06', ['07:action:00', '02:action:00', '02:action:01', '10:action:00']],
  ['application-dialogue-flow:17:segment:08', ['02:action:00', '02:action:01', '10:action:00']],
  ['application-dialogue-flow:17:segment:09', ['02:action:00', '02:action:01']],
  ['application-dialogue-flow:17:segment:11', ['02:action:00', '02:action:01', '01:action:00', '12:action:00']],
  ['application-dialogue-flow:17:segment:13', ['02:action:00', '02:action:01', '01:action:00']],
  ['application-dialogue-flow:18:segment:00', ['05:action:00']],
  ['application-dialogue-flow:18:segment:06', ['07:action:00', '02:action:00', '02:action:01', '02:action:02', '10:action:00']],
  ['application-dialogue-flow:18:segment:08', ['02:action:00', '02:action:01', '02:action:02', '10:action:00']],
  ['application-dialogue-flow:18:segment:09', ['02:action:00', '02:action:01', '02:action:02']],
  ['application-dialogue-flow:18:segment:11', ['02:action:00', '02:action:01', '02:action:02', '01:action:00', '12:action:00']],
  ['application-dialogue-flow:18:segment:13', ['02:action:00', '02:action:01', '02:action:02', '01:action:00']],
  ['application-dialogue-flow:34:segment:01', ['05', '04:action:00', '04:action:01']],
  ['application-dialogue-flow:34:segment:06', ['08:action:00', '04:action:00', '04:action:01']],
  ['application-dialogue-flow:34:segment:07', ['04:action:00', '04:action:01']],
  ['application-dialogue-flow:2D:segment:04', ['03', '01:action:00']],
  ['application-dialogue-flow:2A:segment:01', ['05']],
  ['application-dialogue-flow:2A:segment:03', ['02:action:00', '05', '07:action:00']],
  ['application-dialogue-flow:2A:segment:04', ['05', '06:action:00']],
  ['application-dialogue-flow:2A:segment:08', ['02:action:00', '05', '07:action:00']],
  ['application-dialogue-flow:2A:segment:09', ['05']],
]);

const servicePreviewTemplates = new WeakMap();
const emptyBranches = [];

function facilityServiceStatePreviews(branch, body, previews, invocation = {}, branches = emptyBranches) {
  if (!previews || !branch) return buildServiceStatePreviews(branch, body, previews, invocation, branches);
  let catalog = servicePreviewTemplates.get(previews);
  if (!catalog || catalog.branches !== branches) {
    catalog = {branches, entries: new WeakMap()};
    servicePreviewTemplates.set(previews, catalog);
  }
  let bodies = catalog.entries.get(branch);
  if (!bodies) catalog.entries.set(branch, bodies = new WeakMap());
  const identity = body || branch;
  let entries = bodies.get(identity);
  if (!entries) bodies.set(identity, entries = new Map());
  const entryHandle = invocation.entryHandle ?? null;
  if (!entries.has(entryHandle)) entries.set(entryHandle,
    buildServiceStatePreviews(branch, body, previews, {entryHandle}, branches));
  return entries.get(entryHandle).map(preview => ({...preview,
    facility_call_context: {...invocation},
    ...(!preview.vehicle_trade ? {runtime_context: {...preview.runtime_context,
      ...(invocation.argument !== undefined ? {shop_instance: invocation.argument,
        facility_instance: invocation.argument} : {})}} : {}),
  }));
}

function buildServiceStatePreviews(branch, body, previews, invocation, branches) {
  const trade = vehicleTradeServicePreview(branch, body, previews, invocation);
  if (trade) return [trade];
  const source = body?.id || branch?.id;
  const successors = controlSuccessors.get(source);
  if (successors) {
    const prefix = source.slice(0, source.lastIndexOf(':') + 1);
    const result = successors.flatMap(suffix => {
      const target = prefix + suffix;
      const owner = branches.find(row => row.id === target || row.bodies.some(candidate => candidate.id === target));
      const selected = owner?.bodies.find(candidate => candidate.id === target);
      if (!owner) return [];
      return facilityServiceStatePreviews(owner, selected, previews, invocation, branches).map(preview => ({
        ...preview, source_binding: source, source_branch: branch.id,
        confirmed_state_binding: {...preview.confirmed_state_binding, source,
          successor: target, scope: 'registered-control-successor-phases'},
      }));
    });
    return [...new Map(result.map(preview => [preview.id, preview])).values()];
  }
  const retainedResponse = retainedResponses.get(source);
  const responseBody = retainedResponse
    ? {id: retainedResponse, record: null, parameters: []} : body;
  const terminalResponse = vendingServiceResponsePreview(previews, source)
    || elevatorServicePreview(source)
    || controllerServicePreview(previews, source, invocation);
  const response = terminalResponse
    || (['application-dialogue-flow:18:segment:10:action:00',
      'application-dialogue-flow:34:segment:08:action:00'].includes(source)
      ? null : facilityServiceResponsePreview(branch, responseBody, previews));
  return (bindings.get(source) || (response ? [response.id] : [])).flatMap(id => {
    const preview = response && bindings.has(source) && !terminalResponse
      ? facilityServiceResponsePreview(branch, responseBody, previews, id)
      : response || previews?.find(row => row.id === id);
    if (!preview) return [];
    const entry = preview.facility_screen?.entry_handle;
    if (entry && entry !== invocation.entryHandle) return [];
    const result = preview;
    return [{...result, source_binding: source, source_branch: branch.id,
      confirmation_status: 'confirmed', structural: false,
      preview_basis: 'confirmed-service-state',
      facility_call_context: {...invocation},
      confirmed_state_binding: {preview_id: preview.terminal_response?.template_id
        || preview.service_response?.template_id || id, source,
        scope: preview.terminal_response || preview.service_response
          ? 'same-layout-response' : 'registered-display-phase-only'},
      runtime_context: {...result.runtime_context,
        ...(invocation.argument !== undefined ? {shop_instance: invocation.argument,
          facility_instance: invocation.argument} : {})},
      missing: [], facility_preview_gaps: []}];
  });
}

// @editor-module 终端服务显示目录排除机器码、数据表与电梯场景退出。
function isTerminalDisplayBranch(branch) {
  if (branch.command === 'application-command:1F' && branch.id.endsWith(':segment:01')) return false;
  if (!['application-command:36', 'application-command:38'].includes(branch.command)) return true;
  const scan = branch.entry_chain?.find(row => row.role === 'segment')?.selection_scan
    || branch.segment_selection_scan;
  if (!scan) return true;
  return !(branch.execution_roles || []).some(role => ['machine-code', 'data-table'].includes(role.kind)
    && role.offset < scan.end_exclusive && scan.offset < role.offset + role.length);
}

// @editor-module 服务状态组装发布的分支来源并保留缺口。

function serviceBodyPreview(branch, body, invocation = {}, windowContext = null) {
  const catalog = state.project?.ui?.construction?.interfaces;
  return resolveFacilityBranchPreview(catalog, branch, body, {invocation, windowContext});
}

function serviceStatePreviews(branch, body, invocation) {
  return facilityServiceStatePreviews(branch, body,
    state.project?.ui?.construction?.menu_dispatch_data?.previews, invocation,
    state.project?.ui?.construction?.interfaces?.application_branch_sources);
}

function serviceInvocation(application, sceneId, entryHandle, facilities = state.project?.facilities) {
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

function sceneServicePreviewEntries(applications, sceneId, entryHandle = null) {
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

function resolveServicePreview(preview, screen, definition, selection = null) {
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

// @editor-module 服务实例的场景位置来自当前交互调用点。

let callers = [];
let repository = null;

async function prepareServicePreviewSceneBindings() {
  const currentRepository = state.projectRepository;
  const [scenes, actors, logicIndex, facilities, story, sources, working] = await Promise.all([
    db.getDocument('project.scenes'), db.getAll('scene-actor', []),
    db.getDocument('project.scenes.logic'), db.getDocument('project.facilities'),
    db.getDocument('project.story'), db.getDocument('project.scenes.interaction-sources'),
    db.listWorkingAssets(),
  ]);
  const dirty = new Set(working.filter(row => row.dirty).map(row => row.resource_id));
  const documents = await Promise.all(sources.records.map(async ({scene, logic}) => ({scene,
    logic: dirty.has(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}`)
      ? (await db.getResourceDocument(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}`)).logic : logic})));
  const elevators = await loadSceneElevators(db, scenes.editable_scenes);
  const changedInteractionScripts = new Set(working.filter(row => row.resource_id === 'story-interaction-script')
    .flatMap(row => row.fields.filter(field => field.hasOverride)
      .map(field => Number.parseInt(field.entityHandle.split(':').at(-1), 16))));
  const context = {scenes, logicIndex, facilities, story, changedInteractionScripts,
    actorsByUid: new Map(actors.map(row => [row.uid, row]))};
  const result = await db.reusePreviewProjection('service-preview-scene-bindings',
    [scenes, actors, logicIndex, facilities, story, sources, ...documents.map(row => row.logic),
      JSON.stringify([...changedInteractionScripts])], () => documents.flatMap(({scene, logic}) =>
      enumerateSceneInteractionObjects(scene, logic, actors, [], context)
        .filter(object => ['actor', 'investigation', 'elevator'].includes(object.kind) || object.record.interaction_binding)
        .flatMap(object => {
          const {x, y} = object.record;
          if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return [];
          return sceneInteractionDestinations(object, {...context, sceneLogic: logic}).applications.map(application => ({
            ...application, entryHandle: object.kind === 'investigation'
              ? `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}:investigation:${Number(object.record.id).toString(16).toUpperCase().padStart(2, '0')}`
              : object.uid,
            scene: {sceneId: Number(scene.id), x, y},
          }));
        })));
  if (state.projectRepository !== currentRepository) return;
  callers = [...result, ...elevators.map(({scene, elevator, selection}) => ({command: 0x1F,
    instance: elevator.instance_id, entryHandle: `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}:${selection}`,
    scene: {sceneId: Number(scene.id), x: elevator.x, y: elevator.y}}))];
  repository = currentRepository;
}

function bindServicePreviewScene(command, argument = 0) {
  const context = interfacePreviewContext();
  const service = context.service;
  const invocation = serviceInvocation({command, instance: argument},
    service?.locationKey === `${command}:${argument}` ? service.routeScene?.sceneId : null,
    service?.locationKey === `${command}:${argument}` ? service.entryHandle : null);
  argument = invocation.argument;
  const matching = repository === state.projectRepository
    ? callers.filter(row => row.command === command && row.instance === argument) : [];
  const locationKey = `${command}:${argument}`;
  const previous = service?.locationKey === locationKey ? service : null;
  const entry = matching.find(row => row.entryHandle === previous?.entryHandle)
    || matching.find(row => row.scene.sceneId === previous?.scene?.sceneId
      && row.scene.x === previous.scene.x && row.scene.y === previous.scene.y) || matching[0];
  const scene = entry?.scene || previous?.routeScene || null;
  context.service = {command, argument, entryHandle: entry?.entryHandle || previous?.entryHandle || null,
    routeScene: previous?.routeScene || null, locationKey, scene};
  return selectInterfacePreviewBoundScene(scene);
}

var servicePreviewScene = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindServicePreviewScene: bindServicePreviewScene,
  prepareServicePreviewSceneBindings: prepareServicePreviewSceneBindings
});

export { bindServicePreviewScene, controllerServicePreview, elevatorServicePreview, facilityServiceStatePreviews, isTerminalDisplayBranch, resolveServicePreview, sceneServicePreviewEntries, serviceInvocation, servicePreviewScene, vendingServiceResponseEntries, vendingServiceResponsePreview };
