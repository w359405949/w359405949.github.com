// @editor-module 普通交互沿正文暂停推进；剧情及战斗保留领域调用边界。
import {interfacePreviewState} from './interface-state-preview.js';
import {foldInterfaceStateGraph} from './interface-state-graph.js';
import {textDialogueProgram, textDialogueSuccessor} from '../core/text-dialogue-program.js';
import {STORY_DIALOGUE_OPERATIONS} from '../core/story-dialogue-operations.js';
import {executeSceneActionLocalHandler} from '../core/scene-action-local-handlers.js';
import {applyBattleResultEffects} from './battle-result-state-machine.js';

const DIALOGUE_STATE_EVIDENCE = 'project/evidence/reverse-engineering/dialogue-state-input/observations.json';
const region = {id: 'dialogue', label: '对话', bounds: {x: 0, y: 144, width: 256, height: 96},
  visible: true, cursor: false, layer: 0, retention: '本次交互的正文窗口'};

export function dialogueStateModel(entry, {text, encoding, semantics = []}) {
  const declarations = new Map(semantics.map(row => [row.opcode, row]));
  const commands = new Map((entry.script?.commands || []).map(command => [command.cursor, command]));
  const programs = new Map();
  const program = record => {
    if (!programs.has(record)) programs.set(record, textDialogueProgram(text, encoding, record));
    return programs.get(record);
  };
  const operation = command => STORY_DIALOGUE_OPERATIONS[command.opcode] || declarations.get(command.opcode);
  const normal = command => command.edges.find(edge => edge.kind === 'normal')?.target_cursor;
  const initial = entry.unsupported ? {boundary: 'unknown', cursor: null, reason: '该交互须交接所属领域'}
    : entry.record ? {record: entry.record, ordinal: 0, cursor: null} : {cursor: 0};
  const commandLocation = location => {
    if (location.record || location.boundary) return location;
    const command = commands.get(location.cursor);
    if (!command) return {...location, boundary: 'unknown', reason: '交互控制位置未确认'};
    const declaration = operation(command);
    if (declaration?.operation === 'start-blocking-dialogue' || declaration?.operation === 'start-blocking-ui-action'
        || declaration?.operation === 'dispatch-interaction-service' && command.operands[0] < 0x10) {
      const id = declaration.region_id ?? command.operands[0];
      return {...location, record: `record:${id.toString(16).toUpperCase().padStart(2, '0')}:${String(
        command.operands[declaration.record_operand_index]).padStart(3, '0')}`, ordinal: 0};
    }
    if (command.opcode === 0x37) return {...location, boundary: 'battle', command};
    if (command.opcode === 0 || [6, 9].includes(command.opcode)) return location;
    return {...location, boundary: 'story', command, reason: '交接剧情或服务领域'};
  };
  const node = location => {
    if (location.boundary) return {id: `${entry.id}:call:${location.cursor}`, label: location.boundary === 'battle'
      ? '遭遇调用' : location.boundary === 'story' ? '领域交接' : '未确认边界', location,
      ...(location.boundary === 'battle' ? {referenceTarget: {pageId: 'battle-command-target',
        nodeId: 'battle-command-target.command', label: '战斗命令与目标选择'}}
        : location.boundary === 'story' && operation(location.command)?.operation === 'dispatch-interaction-service'
          ? {referenceTarget: {commandId: location.command.operands[0], argument: location.command.operands[1]}} : {}),
      pause: {kind: location.boundary, evidence: DIALOGUE_STATE_EVIDENCE},
      input: location.reason || '等待战斗完成结果', publishedPreview: location.cursor === null ? entry.preview : null,
      regions: location.cursor === null && entry.preview ? [region] : []};
    if (!location.record) return null;
    const pause = program(location.record)[location.ordinal];
    if (!pause) return null;
    return {id: `${entry.id}:${location.cursor ?? 'direct'}:${location.record}:${pause.ordinal}`,
      label: `${pause.kind === 'choice' ? '选择' : pause.kind === 'unknown' ? '未确认正文' : '对话'} · ${location.record} · ${pause.ordinal + 1}`,
      location, record: location.record, pause,
      input: pause.kind === 'choice' ? '← 是；→ 否；A 确定；B 否' : 'A / B 继续',
      regions: [{...region, cursor: pause.kind === 'choice', source: location.record}]};
  };
  const successors = location => {
    if (location.boundary) return [];
    if (location.record) {
      const pause = program(location.record)[location.ordinal];
      if (pause?.kind === 'unknown') return [];
      if (pause?.kind === 'choice') return [0, 1].map(value => {
        const record = pause.branch ? textDialogueSuccessor(text, encoding, pause, value) : null;
        return {location: record ? {...location, record, ordinal: 0}
          : location.cursor === null ? null : {cursor: normal(commands.get(location.cursor))},
          input: value ? '否 / B' : '是 / A', value};
      });
      if (program(location.record)[location.ordinal + 1]) return [{location: {...location, ordinal: location.ordinal + 1}, input: 'A / B 继续'}];
      return [{location: location.cursor === null ? null : {cursor: normal(commands.get(location.cursor))}}];
    }
    const command = commands.get(location.cursor);
    if (command.opcode === 0) return [{location: null}];
    return command.edges.map(edge => ({location: {cursor: edge.target_cursor}, edge,
      condition: command.opcode === 9 ? '当前选择值' : '当前事件位', command}));
  };
  const graph = foldInterfaceStateGraph({entry: initial, evidence: DIALOGUE_STATE_EVIDENCE,
    enter: commandLocation, positionKey: location => JSON.stringify(location), setup: () => [],
    pause: location => location.resumed ? null : node(location),
    branches: location => successors(location).map(next => ({...next,
      location: next.location && Object.fromEntries(Object.entries(next.location).filter(([key]) => key !== 'resumed')),
      exit: next.location === null,
      declarations: next.condition ? [{label: next.condition, confirmed: true,
        reads: [next.condition], writes: [], evidence: DIALOGUE_STATE_EVIDENCE}] : [],
      effects: next.value === undefined ? [] : [{field: 'choice', value: next.value}]})),
    resume: current => ({location: {...current.location, resumed: true}, controls: [current.location.cursor], input: null}),
  });
  for (const call of graph.nodes.filter(row => row.pause.kind === 'battle')) {
    for (const outcome of ['victory', 'defeat']) {
      const id = `${call.id}:${outcome}`;
      graph.nodes.push({id, label: outcome === 'victory' ? '胜利返回' : '败北恢复',
        pause: {kind: 'result', evidence: DIALOGUE_STATE_EVIDENCE}, input: '等待所属战斗组件的已确认完成结果', regions: []});
      const edge = {id: `${call.id}>${id}`, from: call.id, to: id, input: outcome === 'victory' ? '胜利' : '败北',
        condition: '战斗语义完成结果', evidence: DIALOGUE_STATE_EVIDENCE,
        routes: [{controls: [call.location.cursor], declarations: []}]};
      graph.edges.push(edge); graph.transitions.push({...edge, executable: true});
    }
  }
  if (entry.caller?.kind === 'field-command-menu' || entry.id === 'field-dialogue') {
    const id = 'reference:field-command-menu.main';
    graph.nodes.push({id, label: '主菜单', pause: {kind: 'call'}, navigationOnly: true,
      referenceTarget: {pageId: 'non-battle-main-menu', nodeId: 'field-command-menu.main', label: '主菜单'}, regions: []});
  }
  return {entry, initial, graph, program, node, commandLocation, commands, normal, successors, operation};
}

export function dialogueStateExecution(model, {text, encoding}) {
  const returned = (state, destination = 'caller') => {
    const caller = state.returnStack.pop();
    state.execution.status = 'returned'; state.pause = null; state.windows = [];
    state.domainResults.return = {destination, caller};
    return state;
  };
  const settle = state => {
    const seen = new Set();
    while (state.execution.status === 'running') {
      let location = model.commandLocation(state.control);
      const signature = JSON.stringify(location);
      if (seen.has(signature)) {state.execution.status = 'unknown'; state.execution.reason = '交互没有有进展的续接'; break;}
      seen.add(signature); state.control = location;
      const current = model.node(location);
      if (current) {
        state.node = current.id; state.pause = current.pause;
        state.execution.status = ['unknown', 'story', 'battle'].includes(current.pause.kind) ? current.pause.kind : 'waiting';
        state.execution.reason = current.pause.reason || location.reason || '';
        state.selections.choice = 0;
        state.windows = current.record ? [{id: 'dialogue', record: current.record,
          confirmedWaits: current.pause.confirmedWaits, choice: 0}] : [];
        if (location.boundary === 'battle') {
          const [formationId, pendingEventFlag, targetStoryState] = location.command.operands;
          state.domainResults.battleCall = {node: current.id, formationId, pendingEventFlag, targetStoryState,
            caller: structuredClone(state.returnStack.at(-1)), scene: structuredClone(state.context)};
        }
        return state;
      }
      const command = model.commands.get(location.cursor);
      if (command.opcode === 0) return returned(state);
      let advance;
      try {
        advance = executeSceneActionLocalHandler({commandBytes: command.raw_window, semantic: model.operation(command)}, {
          read: field => {
            if (field === 'parameter.result') return state.fields.choice;
            const match = /^save\.active\.global_event_flag\.([0-9A-F]{2})$/u.exec(field);
            if (match && Array.isArray(state.fields.eventFlags)) return Number(state.fields.eventFlags.includes(parseInt(match[1], 16)));
            throw new TypeError(`交互字段未确认：${field}`);
          }, actor: state.context.caller?.object,
          write: (field, value) => {
            if (!['scratch.savedX', 'scratch.savedY'].includes(field)) throw new TypeError(`交互写入未确认：${field}`);
            state.fields[field] = value;
          },
        });
      } catch (error) {state.execution.status = 'unknown'; state.execution.reason = error.message; return state;}
      const edge = command.edges.find(row => row.target_cursor === command.cursor + advance);
      if (!edge) {state.execution.status = 'unknown'; state.execution.reason = '分支续接未确认'; return state;}
      state.execution.trace.push({cursor: command.cursor, advance, target: edge.target_cursor, evidence: DIALOGUE_STATE_EVIDENCE});
      state.control = {cursor: edge.target_cursor};
    }
    return state;
  };
  return {
    initial({context, fields = {}} = {}) {
      return settle(interfacePreviewState({context, fields: {choice: 0, ...fields},
        entry: model.graph.entry, control: model.initial,
        returnStack: [{...model.entry.caller, entry: model.entry.id}], execution: {status: 'running', trace: []}}));
    },
    advance(state, input) {
      if (input.type === 'battle-result') {
        if (state.execution.status !== 'battle') return state;
        state.domainResults.battleResult = structuredClone(input.result);
        if (!applyBattleResultEffects(state, input.result)) {
          state.execution.status = 'unknown'; state.execution.reason = '战斗完成效果未确认'; return state;
        }
        state.node = `${state.node}:${input.result.outcome}`;
        return returned(state, 'scene');
      }
      if (state.execution.status !== 'waiting') return state;
      if (['left', 'right', 'option'].includes(input.type) && state.pause.kind === 'choice') {
        const value = input.type === 'option' ? input.index : input.type === 'right' ? 1 : 0;
        if (![0, 1].includes(value)) throw new RangeError('对话选择超出当前输入域');
        state.selections.choice = value; state.windows[0].choice = value; return state;
      }
      if (!['a', 'b'].includes(input.type)) return state;
      const location = state.control, pause = state.pause;
      state.execution.trace.push({node: state.node, input: input.type, evidence: pause.evidence});
      if (pause.kind === 'choice') {
        const value = input.type === 'b' ? 1 : state.selections.choice;
        state.fields.choice = value;
        const record = pause.branch ? textDialogueSuccessor(text, encoding, pause, value) : null;
        if (record) state.control = {...location, record, ordinal: 0};
        else if (location.cursor === null) return returned(state);
        else state.control = {cursor: model.normal(model.commands.get(location.cursor))};
      } else if (model.program(location.record)[location.ordinal + 1]) state.control = {...location, ordinal: location.ordinal + 1};
      else if (location.cursor === null) return returned(state);
      else state.control = {cursor: model.normal(model.commands.get(location.cursor))};
      state.execution.status = 'running'; return settle(state);
    },
  };
}
