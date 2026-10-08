// @editor-module 战斗消息复用已发布来源、窗口序列与隔离预览快照。
import {battleMessageStateSources} from '../core/battle-context-values.js';
import {uiTemplateBindings} from '../core/ui-template-bindings.js';
import {interfacePreviewState} from './interface-state-preview.js';
import {battleMessageCallContract, BATTLE_MESSAGE_CALL_EVIDENCE} from '../core/battle-message-calls.js';
import {battleEnemyMessageCallContract, BATTLE_ENEMY_MESSAGE_EVIDENCE} from '../core/battle-enemy-message-calls.js';

export const BATTLE_MESSAGE_EVIDENCE = 'project/evidence/reverse-engineering/battle-message-state-machine/observations.json';
const catalogStates = interfaces => interfaces?.interfaces?.find(row => row.id === 'battle-messages')?.states || [];
const stateId = id => id?.split(':')[0];

function battleMessagePaths(templates, interfaces) {
  const labels = new Map(catalogStates(interfaces).map(row => [row.id, row.label]));
  return (templates?.battle_message_sequences || []).flatMap((sequence, index) => {
    const path = (outcome, ordinal) => {
      const phases = [...sequence.phases, ...(outcome?.phases || [])];
      const enemyCall = battleEnemyMessageCallContract(sequence.enemy_action_reference,
        sequence.result_script, phases);
      const enemyCallConfirmed = Boolean(enemyCall);
      const call = sequence.enemy_action_reference ? null
        : battleMessageCallContract(sequence.result_script, phases, undefined, sequence.item_reference);
      const callConfirmed = Boolean(call) || enemyCallConfirmed;
      return {id: `message-path:${index}:${ordinal}`,
      label: `${labels.get(stateId(sequence.phases[0]?.state)) || '行动提示'}${outcome ? ` · ${outcome.label}` : ''}`,
      resultScript: sequence.result_script, itemReference: sequence.item_reference,
      enemyActionReference: sequence.enemy_action_reference,
      phases,
      missing: callConfirmed ? '' : outcome ? outcome.unresolved_reason || '' : sequence.unresolved_reason || '',
      evidence: outcome?.evidence || sequence.evidence,
      callConfirmed, enemyCallConfirmed,
      callEvidence: enemyCallConfirmed ? enemyCall.evidence || BATTLE_ENEMY_MESSAGE_EVIDENCE
        : call?.evidence || BATTLE_MESSAGE_CALL_EVIDENCE};
    };
    return [path(null, 0), ...(sequence.outcomes || []).map((outcome, i) => path(outcome, i + 1))];
  });
}

function battleMessageSourceMap({templates, interfaces, calls = {}, items = [], actions = []}) {
  const paths = battleMessagePaths(templates, interfaces);
  const bindings = uiTemplateBindings(templates);
  return battleMessageStateSources(templates, interfaces).map(source => {
    const entry = catalogStates(interfaces).find(row => row.id === source.state);
    const related = paths.filter(path => path.phases.some(phase => stateId(phase.state) === source.state));
    const fixedCalls = Object.entries(calls).filter(([, node]) => source.roots.includes(node))
      .map(([event, node]) => ({event, text_record_ref: {resource_id: 'text-record', node_id: node}}));
    const itemCalls = items.filter(item => related.some(path => !path.enemyActionReference
      && path.resultScript === `battle-result-script:${item.battle_use_effect?.result_selector?.toString(16).toUpperCase().padStart(2, '0')}`
      && (!path.itemReference || path.itemReference.endsWith(`:${item.id.toString(16).toUpperCase().padStart(2, '0')}`))))
      .map(item => ({handle: `item-entry:${item.id.toString(16).toUpperCase().padStart(2, '0')}`,
        field: 'battle_use_effect.result_selector'}));
    const enemyCalls = actions.filter(action => source.roots.includes(action.fields?.message?.value)
      || related.some(path => path.enemyActionReference === action.handle
        && path.resultScript === action.fields?.result_script?.value))
      .map(action => ({handle: action.handle, field: source.roots.includes(action.fields?.message?.value)
        ? 'message' : 'result_script'}));
    const layouts = bindings.filter(row => stateId(row.state) === source.state);
    const missing = [];
    if (!source.roots.length) missing.push('消息正文引用未归位');
    if (!layouts.length) missing.push('消息窗口绑定未发布');
    if (!related.length && !fixedCalls.length && !enemyCalls.length) missing.push('调用与消息顺序未闭合');
    if (source.insertions.length) missing.push('参数写入者须由本次调用绑定');
    if (source.insertions.some(row => row.value_type === 'unsigned-integer')) missing.push('数量须由本次数值公式提供');
    if (!related.length || related.some(path => !path.callConfirmed) || source.roots.some(root =>
      !related.some(path => path.callConfirmed && path.phases.some(phase => phase.text_record_ref.node_id === root))))
      missing.push('行动效果与返回须由战斗调用方提供');
    return {...source, label: entry.label, catalogEvidence: entry.evidence,
      fixedCalls, itemCalls, enemyCalls, paths: related.map(path => ({id: path.id, resultScript: path.resultScript,
        itemReference: path.itemReference, evidence: path.evidence, missing: path.missing})),
      templates: [...new Set(layouts.map(row => row.template))], missing};
  });
}

export function battleMessageGraph({templates, interfaces, calls, items, actions}) {
  const sources = battleMessageSourceMap({templates, interfaces, calls, items, actions});
  const nodes = sources.map(row => ({id: row.state, stateId: row.state, label: row.label,
    confirmed: row.templates.length > 0, source: row}));
  const transitions = [], paths = battleMessagePaths(templates, interfaces);
  for (const path of paths) {
    path.nodes = path.phases.map(phase => stateId(phase.state));
    path.edges = path.phases.map((phase, index) => {
      const edge = {id: `${path.id}:edge:${index}`, from: stateId(phase.state),
        to: stateId(path.phases[index + 1]?.state) || null, input: '消息等待完成',
        unknown: !path.callConfirmed,
        condition: !path.callConfirmed ? '调用方效果或分支未确认' : '',
        evidence: path.callConfirmed ? path.callEvidence : path.evidence};
      transitions.push(edge); return edge;
    });
  }
  return {nodes, paths, transitions, edges: transitions.map(row => ({...row, routes: [row]})),
    entry: nodes[0]?.id};
}

// 17:073D 与 3F:18DA 的已确认规则只读取调用方当前设置和所属字段对象的等待表。
function battleMessageWait(settings, waitValues, inputMask) {
  if (!Number.isInteger(settings) || settings < 0 || settings > 255
      || !Number.isInteger(inputMask) || inputMask < 0 || inputMask > 255)
    return {status: 'unavailable', reason: '本次消息缺少设置或确认输入声明'};
  const mode = settings & 7;
  if (mode === 4) return {status: 'available', kind: 'input', inputMask, remaining: null};
  const frames = waitValues?.[mode];
  if (!Number.isInteger(frames) || frames < 1 || frames > 255)
    return {status: 'unavailable', reason: '当前等待设置没有已发布的帧数'};
  return {status: 'available', kind: 'frames', remaining: frames, frames};
}

// 消息和效果按调用方的已确认顺序执行；效果函数只操作本次隔离字段。
export function battleMessageExecution({operations, waitValues, inputMask, applyEffect, resolveParameters} = {}) {
  if (!Array.isArray(operations) || !operations.length) throw new TypeError('缺少本次消息与效果顺序');
  const block = (state, reason) => {
    state.execution.status = 'unknown'; state.execution.reason = reason; return state;
  };
  const run = state => {
    for (; state.execution.index < operations.length; state.execution.index++) {
      const operation = operations[state.execution.index];
      if (operation.kind === 'effect') {
        if (operation.confirmed !== true || !operation.evidence || typeof applyEffect !== 'function')
          return block(state, operation.missing || '本次行动效果未确认');
        const result = applyEffect(structuredClone(state.fields), operation, state.context,
          structuredClone(state.domainResults));
        if (result?.status !== 'available') return block(state, result?.reason || '本次行动效果不可用');
        state.fields = structuredClone(result.fields);
        Object.assign(state.domainResults, structuredClone(result.domainResults || {}));
        state.execution.trace.push({kind: 'effect', id: operation.id, frame: state.execution.frame, evidence: operation.evidence});
      } else if (operation.kind === 'message') {
        if (!operation.phase?.state || operation.phase.text_record_ref?.resource_id !== 'text-record')
          return block(state, '消息缺少已发布的状态或正文引用');
        const parameters = resolveParameters?.(operation, state) || {status: 'unavailable', reason: '本次消息的参数调用未确认'};
        if (parameters.status !== 'available') return block(state, parameters.reason);
        state.node = stateId(operation.phase.state); state.control = state.execution.index;
        state.pause = structuredClone(operation.phase);
        state.domainResults.parameters = structuredClone(parameters.value || {});
        const previous = state.windows[0];
        state.windows = [{id: 'message', instance: operation.phase.retain_previous && previous
          ? previous.instance : ++state.execution.windowSequence}];
        state.execution.phases.push(structuredClone(operation.phase));
        // 17:0A81 直接进入确认等待；调用方须显式声明，不能由正文编号推断。
        let wait = battleMessageWait(state.context.settings, waitValues, inputMask);
        if (operation.wait) wait = operation.wait.kind === 'input'
          && operation.wait.confirmed === true && operation.wait.evidence
          ? battleMessageWait(4, waitValues, inputMask)
          : {status: 'unavailable', reason: '本次消息的等待入口未确认'};
        if (wait.status !== 'available') return block(state, wait.reason);
        state.execution.wait = wait; state.execution.status = 'waiting';
        state.execution.trace.push({kind: 'message', phase: structuredClone(operation.phase),
          frame: state.execution.frame, wait: structuredClone(wait), evidence: operation.evidence});
        return state;
      } else if (operation.kind === 'boundary') return block(state, operation.missing || '战斗调用续接未确认');
      else if (operation.kind === 'return') {
        if (operation.value?.confirmed !== true || !operation.evidence)
          return block(state, '本次消息返回未确认');
        state.execution.status = 'returned'; state.pause = null;
        state.domainResults.messageReturn = structuredClone(operation.value || {});
        state.execution.trace.push({kind: 'return', frame: state.execution.frame}); return state;
      } else throw new TypeError('未声明的消息顺序操作');
    }
    return block(state, '本次消息缺少返回声明');
  };
  const inputBits = {a: 128, b: 64, select: 32, start: 16, up: 8, down: 4, left: 2, right: 1};
  return {
    initial({fields = {}, context = {}, windows = []} = {}) {
      return run(interfacePreviewState({fields, context, windows,
        entry: stateId(operations.find(row => row.kind === 'message')?.phase.state),
        execution: {status: 'running', index: 0, frame: 0, trace: [], phases: [],
          windowSequence: Math.max(0, ...windows.map(window => window.instance))}}));
    },
    advance(state, input) {
      if (!['waiting', 'confirming'].includes(state.execution.status)) return state;
      const frames = input.type === 'frames' ? input.frames : 0;
      if (input.type === 'frames' && (!Number.isInteger(frames) || frames < 0)) throw new RangeError('等待帧数无效');
      let remaining = frames;
      while (['waiting', 'confirming'].includes(state.execution.status)) {
        const wait = state.execution.wait;
        if (wait.kind === 'input') {
          if (inputBits[input.type] & wait.inputMask) {
            state.execution.trace.push({kind: 'input', input: input.type, frame: state.execution.frame});
            // F8E5 清除等待标记后仍等一帧，才在 A75B 恢复战斗界面。
            state.execution.wait = {kind: 'frames', remaining: 1, frames: 1};
            state.execution.status = 'confirming';
          } else state.execution.frame += remaining;
          return state;
        }
        const elapsed = Math.min(remaining, wait.remaining);
        wait.remaining -= elapsed; state.execution.frame += elapsed; remaining -= elapsed;
        if (wait.remaining) return state;
        state.execution.trace.push({kind: 'wait-complete', frame: state.execution.frame});
        state.execution.index++; state.execution.status = 'running'; delete state.execution.wait;
        run(state);
        if (!remaining || input.type !== 'frames') return state;
      }
      return state;
    },
  };
}
