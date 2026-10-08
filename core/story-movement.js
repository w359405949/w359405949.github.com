// @editor-module 连续单格移动的投影与脚本步数编辑。
import {assembleStoryScriptLayout, changeStoryScriptSequence} from './story-script-layout.js';

export function storyMovementGroups(commands) {
  const streams = new Map(), groups = new Map();
  for (const run of commands) {
    const key = `${run.shotId}/${run.actorKey}`;
    const previous = streams.get(key);
    if (run.operation !== 'attempt-tile-step' || !run.instructionId) {streams.delete(key); continue;}
    const adjacent = previous && previous.at(-1).programId === run.programId
      && previous.at(-1).scriptKind === run.scriptKind && previous.at(-1).opcode === run.opcode
      && previous.at(-1).cursor + 1 === run.cursor;
    const group = adjacent ? previous : [];
    group.push(run);
    streams.set(key, group);
    groups.set(run.id, group);
  }
  return groups;
}

export function storyMovementInstructions(run, programs) {
  const program = programs.find(program => program.id === run.programId
    && (program.kind || 'autonomous') === run.scriptKind);
  const instructions = [];
  let cursor = run.cursor;
  while (program) {
    const command = program.commands.find(command => command.cursor === cursor);
    if (!command?.instructionId || command.opcode !== run.opcode || command.readWidth !== 1) break;
    instructions.push({...run, ...command, programId: run.programId, scriptKind: run.scriptKind});
    cursor += 1;
  }
  return instructions.length ? instructions : [run];
}

export function changeStoryMovementSteps(asset, commandIds, count, createId) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError('步数须为正整数');
  const assembled = assembleStoryScriptLayout(asset);
  const commands = commandIds.map(id => assembled.commands.find(command => command.id === id));
  const first = commands[0];
  if (!first || commands.some((command, index) => !command || command.width !== 1
      || command.opcode !== first.opcode || command.offset !== first.offset + index))
    throw new TypeError('移动指令已改变，请重新选择移动键');
  const scriptId = asset.layout.groups.find(group => group.id === first.group_id)?.script_id
    ?? asset.sequence.find(token => token.id === first.group_id)?.script_id;
  let current = asset;
  for (const command of commands.slice(count).reverse()) {
    current = {...current, sequence: changeStoryScriptSequence(current,
      {commandId: command.id, scriptId, action: 'delete'})};
  }
  let last = commands.at(-1).id;
  for (let index = commands.length; index < count; index += 1) {
    const id = createId();
    current = {...current, sequence: changeStoryScriptSequence(current,
      {commandId: last, scriptId, action: 'insert', after: true, bytes: [first.opcode], id})};
    last = id;
  }
  return current.sequence;
}

export function storyMovementTimingChanges(before, after, edited) {
  const changed = new Map();
  const identities = runs => {
    const occurrences = new Map();
    return new Map(runs.map(run => {
      const key = `${run.actorKey}/${run.scriptKind}/${run.programId}/${run.instructionId}`;
      const occurrence = occurrences.get(key) || 0;
      occurrences.set(key, occurrence + 1);
      return [`${key}/${occurrence}`, run];
    }));
  };
  const originals = identities(before), currents = identities(after);
  const own = [...originals].filter(([, run]) => run.actorKey === edited.actorKey
    && run.scriptKind === edited.scriptKind && run.programId === edited.programId && run.start >= edited.start);
  for (const [identity, run] of originals) {
    if (run.actorKey === edited.actorKey) continue;
    const current = currents.get(identity);
    if (!current) continue;
    const simultaneous = own.filter(([, other]) => other.start === run.start
      || Math.max(other.start, run.start) < Math.min(other.end, run.end));
    for (const [otherIdentity, other] of simultaneous) {
      const next = currents.get(otherIdentity);
      if (next && (next.start - current.start !== other.start - run.start
          || next.end - current.end !== other.end - run.end)) {
        changed.set(current.id, `并行时机改变：与角色 ${other.actorSlot + 1} 的操作／后续键相对起点 ${other.start - run.start} → ${next.start - current.start} 帧，终点 ${other.end - run.end} → ${next.end - current.end} 帧`);
        break;
      }
    }
  }
  return changed;
}
