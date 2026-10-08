// @editor-module 场景加载状态与角色初始动作的当前值投影。
import {storyScriptBytecode} from './story-script-layout.js';
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

export function sceneRemapItems(sceneId, lifecycle) {
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap'
    && row.source_scene_reference === `scene:${hex(sceneId)}`).map(row => ({
      ...row, key: `scene-state:${row.handle}`, id: row.handle,
      label: `${row.global_event_flag_reference} = 1 → ${row.target_scene_reference}`,
    }));
}

function sceneActorEntryStates(record, scripts, story) {
  const script = scripts?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  if (!script) return [];
  const bytes = scripts.layout ? storyScriptBytecode(scripts, script.id, {lazy: true})
    : {length: script.bytecode.length, byteAt: index => script.bytecode[index]};
  const handlers = new Map((story?.vm?.handlers || []).map(row => [Number(row.opcode), row]));
  const semantics = new Map((story?.browser_vm?.opcode_semantics || []).map(row => [Number(row.opcode), row]));
  const poses = [];
  const emit = (pose, flags, cursor) => {
    if (pose.actor_type >= 0x80 || pose.x < 0 || pose.y < 0 || pose.x >= 64 || pose.y >= 64) return;
    if (pose.actor_type === Number(record.actor_type) && pose.x === Number(record.x)
        && pose.y === Number(record.y) && pose.render_slot_marker === Number(record.render_slot_marker)) return;
    const conditions = [...flags].map(([flag, set]) => `global-event-flag:${hex(flag)} = ${Number(set)}`);
    poses.push({...pose, scriptId: Number(script.id), cursor, conditions});
  };
  const walk = (cursor, pose, flags, assignedFlags, visited) => {
    const key = `${cursor}/${JSON.stringify([...flags])}/${JSON.stringify([...assignedFlags])}`;
    if (visited.has(key) || visited.size >= bytes.length) { emit(pose, flags, cursor); return; }
    const opcode = bytes.byteAt(cursor), handler = handlers.get(opcode), semantic = semantics.get(opcode);
    if (!handler || !semantic || (semantic.fidelity !== 'exact' && semantic.operation !== 'sound-command')) {
      emit(pose, flags, cursor); return;
    }
    const nextVisited = new Set(visited).add(key);
    const next = cursor + Number(handler.fixed_advance);
    const operand = index => bytes.byteAt(cursor + 1 + index);
    const step = (target = next, value = pose, condition = flags, assigned = assignedFlags) =>
      walk(target, value, condition, assigned, nextVisited);
    const flagBranch = (flag, set, action) => {
      if (!Number.isInteger(flag)) return;
      if (assignedFlags.has(flag)) {
        if (assignedFlags.get(flag) === set) action(flags);
        return;
      }
      if (flags.has(flag) && flags.get(flag) !== set) return;
      action(new Map(flags).set(flag, set));
    };
    switch (semantic.operation) {
      case 'branch-if-event-flag-clear':
        flagBranch(operand(0), true, condition => step(next, pose, condition));
        flagBranch(operand(0), false, condition => step((cursor + operand(semantic.branch_operand_index)) & 255, pose, condition));
        return;
      case 'remove-actor-if-event-flag-set':
        flagBranch(operand(0), false, condition => step(next, pose, condition));
        return;
      case 'set-event-flag':
      case 'clear-event-flag':
        step(next, pose, flags, new Map(assignedFlags).set(operand(0), semantic.operation === 'set-event-flag'));
        return;
      case 'relative-cursor-advance': step((cursor + operand(0)) & 255); return;
      case 'set-actor-type-animation-renderer':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 0}); return;
      case 'set-actor-type':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0)}); return;
      case 'set-direct-frame-id':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 1}); return;
      case 'set-actor-position':
        if (!Number.isInteger(operand(0)) || !Number.isInteger(operand(1))) return;
        step(next, {...pose, x: operand(0), y: operand(1)}); return;
      case 'set-direction':
        step(next, {...pose, direction_name: semantic.direction,
          direction: ['up', 'down', 'left', 'right'].indexOf(semantic.direction)}); return;
      case 'sound-command':
        step(); return;
      default: emit(pose, flags, cursor);
    }
  };
  walk(0, {actor_type: Number(record.actor_type), x: Number(record.x), y: Number(record.y),
    render_slot_marker: Number(record.render_slot_marker), direction: Number(record.direction),
    direction_name: record.direction_name}, new Map(), new Map(), new Set());
  return [...new Map(poses.map(pose => [JSON.stringify(pose), pose])).values()];
}

export function sceneActorStateObjects(object, scripts, story) {
  return sceneActorEntryStates(object.record, scripts, story).map((pose, index) => ({
    ...object, key: `${object.key}:state:${index}`, pose,
  }));
}
