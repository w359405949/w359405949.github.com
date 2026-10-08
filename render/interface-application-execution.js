// @editor-module 应用输入执行器按正文暂停与领域效果推进隔离状态。
import {interfacePreviewState} from './interface-state-preview.js';

const waits = new Set(['wait-for-confirm-marker', 'page-break-or-repeat-end']);
const choices = new Set(['open-choice-selector', 'open-choice-selector-alias']);

export function interfaceApplicationPrograms(command, text) {
  return command.dialogue_flow.segments.map(segment => {
    const events = (segment.operations || []).map(operation => ({operation, offset: operation.prg_offset}));
    for (const action of segment.actions.filter(row => row.record)) {
      const existing = events.find(row => row.offset === action.prg_offset);
      if (existing) existing.action = action;
      else events.push({action, offset: action.prg_offset});
    }
    events.sort((a, b) => a.offset - b.offset);
    let ordinal = 0;
    return events.flatMap(event => event.action ? [{...event, type: 'text'},
      ...(text.records[event.action.record]?.protected_ranges || []).filter(token => waits.has(token.semantic) || choices.has(token.semantic))
        .map(token => ({type: 'pause', action: event.action, ordinal: ordinal++,
          kind: choices.has(token.semantic) ? 'choice' : 'wait', token}))]
      : event.operation.opcode === 0xF7 ? [{...event, type: 'menu', kind: 'menu', ordinal: ordinal++}]
      : [{...event, type: 'operation'}]);
  });
}

export function interfaceApplicationExecution({command, graph, text, evidence, domain}) {
  const programs = interfaceApplicationPrograms(command, text);
  const block = (state, reason) => {
    state.execution.status = 'unknown'; state.execution.reason = reason;
    state.execution.trace.push({control: state.control, status: 'unknown', reason, evidence});
  };
  const changeSegment = (state, target) => {
    state.control = target; state.execution.position = 0; state.pause = null;
    state.execution.trace.push({control: target, evidence});
  };
  const returned = (state, marker) => {
    state.execution.status = 'returned'; state.execution.returnMarker = marker;
    state.returnStack.pop(); state.pause = null; state.windows = [];
  };
  const branch = (state, segment, index) => {
    const term = segment.terminator;
    if (!term) return block(state, `控制段 ${segment.index} 的调用续接未确认`);
    const target = term.reason === 'application-vm-indexed-segment-table-end'
      ? Number(term.successor_segment_ids[index]?.split(':').at(-1))
      : term.operands[([0xF7, 0xF8, 0xF9, 0xFC].includes(term.opcode) ? 1 : 0) + index];
    if (!Number.isInteger(target)) return block(state, `控制段 ${segment.index} 的分支 ${index} 未确认`);
    if (target >= 0xFE) return returned(state, target);
    if (!programs[target]) return block(state, `控制段 ${segment.index} 的目标 ${target} 未确认`);
    changeSegment(state, target);
  };
  const helpers = {block, branch, changeSegment};
  const adapter = domain(helpers);
  const options = state => state.execution?.status === 'waiting' ? adapter.options(state) : [];
  const settle = state => {
    const seen = new Set();
    while (state.execution.status === 'running') {
      const key = JSON.stringify([state.control, state.execution.position, state.fields, state.execution.branch]);
      if (seen.has(key)) {block(state, `控制段 ${state.control} 缺少有进展的续接`); break;}
      seen.add(key);
      const segment = command.dialogue_flow.segments[state.control];
      const event = programs[state.control]?.[state.execution.position];
      if (!event) {branch(state, segment, adapter.fallthrough?.(state, segment) ?? 0); continue;}
      if (event.type === 'pause' || event.type === 'menu') {
        const node = adapter.pauseNode(state, event, segment);
        if (!node) {block(state, `控制段 ${state.control} 的暂停点没有稳定画面`); break;}
        state.node = node.id; state.pause = {...node.pause}; state.execution.status = 'waiting';
        adapter.preparePause(state, event, segment);
        break;
      }
      state.execution.position++;
      if (event.type === 'text') {
        state.execution.response = segment.index;
        state.execution.responseAction = event.action;
        state.execution.trace.push({control: state.control, record: event.action.record,
          source: event.action.id, evidence});
        continue;
      }
      const op = event.operation.opcode;
      if (op === 0xD1) branch(state, segment, 0);
      else if (op === 0xD5) branch(state, segment, state.execution.branch);
      else if (op >= 0xFE) {
        if (segment.terminator.reason === 'application-vm-indexed-segment-table-end') branch(state, segment, state.execution.choice);
        else returned(state, op);
      } else adapter.operate(state, event.operation, segment);
    }
    return state;
  };
  return {
    evidence, options, ...adapter.exports,
    resume: state => settle(state),
    initial({fields, context, caller = 'scene-interaction'}) {
      const state = interfacePreviewState({context, entry: graph.entry, node: graph.entry, control: 0, fields,
        returnStack: [{caller}], execution: {status: 'running', position: 0, choice: 0, branch: 0,
          goods: 0, category: 0, sale: 0, objectList: null, transactions: [], trace: [], response: null,
          ...adapter.initial}});
      return settle(state);
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting') return state;
      const list = options(state), oldChoice = state.selections.choice;
      if (input.type === 'option' || ['up', 'down', 'left', 'right'].includes(input.type)) {
        if (!list.length) return state;
        const index = input.type === 'option' ? input.index
          : adapter.directionChoice(state, ['up', 'down', 'left', 'right'].indexOf(input.type) + 1, list.length);
        if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new RangeError('输入选项超出当前选择域');
        state.selections.choice = index;
        state.execution.trace.push({node: state.node, input: input.type, from: oldChoice, selection: index, evidence});
        adapter.select(state, index);
        return state;
      }
      if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的预览输入');
      const e = state.execution;
      e.trace.push({node: state.node, input: input.type, selection: state.selections.choice, evidence});
      e.status = 'running';
      if (state.pause.kind === 'menu') {
        if (input.type === 'a' && !list.length && !adapter.acceptEmptyMenu?.(state)) {e.status = 'waiting'; return state;}
        e.choice = state.selections.choice;
        adapter.select(state, e.choice, input);
        branch(state, command.dialogue_flow.segments[state.control], input.type === 'a' ? 0 : 1);
      } else {
        if (state.pause.kind === 'choice') e.branch = input.type === 'b' ? 1 : state.selections.choice;
        e.position++;
      }
      return settle(state);
    },
  };
}
