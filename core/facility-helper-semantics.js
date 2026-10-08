// @editor-module 设施辅助例程只执行已发布的调用状态语义。
import {executeFacilityWindowRoutine, resumeFacilityWindowCycle} from './facility-window-semantics.js';

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

export function executeFacilityCallState(branch, helpers, input = {}, windows, windowContext = {}) {
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
