// @editor-module 自主脚本操作数的引用语义。
const TARGETS = Object.freeze({
  "set-event-flag": {0: "global-event-flag"},
  "clear-event-flag": {0: "global-event-flag"},
  "branch-if-event-flag-clear": {0: "global-event-flag"},
  "wait-event-flag-set": {0: "global-event-flag"},
  "remove-actor-if-event-flag-set": {0: "global-event-flag"},
  "sound-command": {0: "audio-command"},
  "start-scripted-encounter": {0: "encounter-formation", 1: "global-event-flag"},
  "set-direct-frame-id": {0: "direct-frame"},
  "set-actor-type-animation-renderer": {0: "actor-type"},
  "set-actor-type": {0: "actor-type"},
  "play-render-slot-offset-sequence": {1: "actor-type"},
  "branch-if-runtime-party-actor-type-absent": {0: "actor-type"},
  "replace-runtime-entity-scene": {0: "scene-header-map", 1: "scene-header-map"},
  "end-story-state-with-scene-context": {0: "scene-header-map"},
  "find-party-item-and-branch": {0: "item-entry"},
  "replace-party-item": {0: "item-entry", 1: "item-entry"},
  "grant-party-item-and-branch": {0: "item-entry"},
  "park-selected-vehicle": {0: "actor-type"},
  "push-temporary-field-entity": {0: "direct-frame"},
});

export function storyCommandOperandReference(command, semantic, index, operands = []) {
  if (semantic?.operation === "start-event-selected-dialogue") {
    if (index === semantic.flag_operand_index) return {module: "global-event-flag"};
    if ([semantic.set_record_operand_index, semantic.clear_record_operand_index].includes(index))
      return {module: "text-record", regionId: semantic.region_id};
  }
  if (command?.blocking_ui || ['start-blocking-dialogue', 'start-blocking-ui-action'].includes(semantic?.operation)) {
    const variableRegion = Number(command?.opcode) === 0x26;
    const regionId = variableRegion ? operands[0] : command?.blocking_ui?.region_id ?? semantic?.region_id;
    const recordIndex = variableRegion ? 1
      : command?.blocking_ui?.record_operand_index ?? semantic?.record_operand_index ?? 0;
    if (index === recordIndex && Number.isInteger(regionId)) return {module: "text-record", regionId};
  }
  const target = TARGETS[semantic?.operation]?.[index];
  return target ? {module: target} : null;
}

export function storyOperandReference(field, programs, semantics) {
  const owner = field?.owner_ref;
  if (field?.kind !== "script-operand" || owner?.resource_id !== "story-autonomous-script") return null;
  const program = programs.find(item => item.kind !== "interaction"
    && `story-autonomous-script.script.${Number(item.id).toString(16).padStart(2, "0")}`
      === owner.script_resource_id);
  if (!program) return null;
  const reference = field.references?.find(item => Number(item.program_id) === Number(program.id));
  if (!reference) return null;
  const index = Number(owner.byte_index) - Number(reference.cursor) - 1;
  const semantic = semantics.get(Number(reference.opcode));
  const command = program.commands?.find(item => Number(item.cursor) === Number(reference.cursor));
  return storyCommandOperandReference(command, semantic, index, command?.operands || []);
}
