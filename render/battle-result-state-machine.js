// @editor-module 战斗结果沿稳定画面推进，提交后恢复原调用现场。
import {interfacePreviewState} from './interface-state-preview.js';

const BATTLE_RESULT_EVIDENCE = 'project/evidence/reverse-engineering/battle-result-settlement/observations.json';
const nodeId = phase => `battle-results.${phase}`;

function battleResultCompletionConfirmed(completion, fields, slot, applied = [], scene) {
  const prefix = `save.slot.${slot}.`;
  const invocation = completion?.invocation;
  const expected = {...invocation?.sourceFields, ...Object.fromEntries(applied.map(effect => [effect.field, effect.value]))};
  return completion?.confirmed === true && ['victory', 'defeat'].includes(completion.outcome)
    && (!invocation || invocation.saveSlot === slot && invocation.sourceFields
      && (invocation.sceneId === undefined || invocation.sourceFields[`${prefix}scene_id`] === invocation.sceneId)
      && (invocation.sceneId === undefined || completion.sceneReturn?.context?.sceneId === invocation.sceneId)
      && (scene?.sceneId === undefined || invocation.sceneId === undefined || scene.sceneId === invocation.sceneId)
      && Object.entries(expected).every(([field, value]) =>
        field.startsWith(prefix) && Object.hasOwn(fields, field) && JSON.stringify(fields[field]) === JSON.stringify(value)))
    && completion.sceneReturn?.context && ['resume', 'reload'].includes(completion.sceneReturn.mode)
    && completion.rewards?.status === 'available'
    && Array.isArray(completion.effects) && Array.isArray(completion.eventFlags)
    && completion.eventFlags.every(flag => Number.isInteger(flag) && flag >= 0 && flag <= 255)
    && completion.effects.every(effect => typeof effect?.field === 'string'
      && effect.field.startsWith(prefix) && Object.hasOwn(fields, effect.field) && effect.value !== undefined)
    && (!completion.stages || ['entry', 'rewards', 'drop'].every(phase => Array.isArray(completion.stages[phase])
      && completion.stages[phase].every(effect => completion.effects.some(row => row.field === effect.field
        && JSON.stringify(row.value) === JSON.stringify(effect.value)))));
}

/** 调用者只接收同一存档组已有字段的完整效果。 */
export function applyBattleResultEffects(state, completion) {
  if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
      state.execution?.appliedEffects, state.context.scene)) return false;
  for (const effect of completion.effects) state.fields[effect.field] = structuredClone(effect.value);
  state.fields.eventFlags = [...new Set([...(state.fields.eventFlags || []), ...completion.eventFlags])];
  state.context.scene = {...state.context.scene, ...completion.sceneReturn.context};
  state.context.storyState = completion.sceneReturn.context.storyState;
  state.domainResults.sceneReturn = structuredClone(completion.sceneReturn);
  return true;
}

export function battleResultGraph(previews = []) {
  const nodes = [['victory', '胜利'], ['defeat', '失败'], ['rewards', '经验 / 金钱'],
    ['drop', '掉落'], ['story-commit', '剧情状态提交']].map(([phase, label]) => ({id: nodeId(phase), phase, label,
      publishedPreview: previews.find(row => row.id === `constructor:battle-result-${phase}`),
      role: phase === 'story-commit' ? 'action' : 'screen'}));
  const routes = [['victory', 'rewards', '有击破经验'], ['victory', 'story-commit', '没有击破经验'],
    ['defeat', 'story-commit', '败北恢复'], ['rewards', 'rewards', '确认经验值后显示金钱'],
    ['rewards', 'drop', '奖励确认结束且触发掉落'],
    ['rewards', 'story-commit', '奖励确认结束且未触发掉落'], ['drop', 'story-commit', '提交已确认部分'],
    ['story-commit', null, '返回调用者']].map(([from, to, condition], index) => ({id: `battle-result:${index}`,
      from: nodeId(from), to: to ? nodeId(to) : null, input: from === 'story-commit' || condition === '没有击破经验' ? '自然返回' : 'A / B',
      condition, evidence: BATTLE_RESULT_EVIDENCE}));
  return {nodes, transitions: routes, edges: routes.map(row => ({...row, routes: [row]})), entry: nodeId('victory')};
}

/** 返回效果只写本次预览字段；未知胜负保留完整调用栈。 */
export function battleResultExecution(completion) {
  completion = structuredClone(completion);
  const stages = completion?.stages || {entry: [], rewards: completion?.effects || [], drop: []};
  const apply = (state, phase) => {
    for (const effect of stages[phase]) {
      state.fields[effect.field] = structuredClone(effect.value);
      state.execution.appliedEffects.push(structuredClone(effect));
    }
  };
  const pause = (state, phase) => {
    state.node = nodeId(phase); state.pause = {kind: 'confirm', evidence: BATTLE_RESULT_EVIDENCE};
    state.windows = [{id: 'battle-result', phase}];
    return state;
  };
  const complete = state => {
    if (!applyBattleResultEffects(state, completion)) {
      state.execution.status = 'unknown'; state.execution.reason = '战斗返回字段与调用现场不一致；未提交结果';
      return state;
    }
    state.node = nodeId('story-commit'); state.pause = null; state.windows = [];
    state.returnStack.pop(); state.execution.status = 'returned';
    state.execution.reason = completion.sceneReturn.handoff ? '已交接败北剧情' : '已返回调用者';
    return state;
  };
  return {
    initial({fields = {}, context = {}, returnStack = []} = {}) {
      const valid = battleResultCompletionConfirmed(completion, fields, context.slot, [], context.scene);
      const state = interfacePreviewState({fields, context, returnStack,
        domainResults: {battleResult: completion}, execution: {status: valid ? 'waiting' : 'unknown', trace: [], appliedEffects: [],
          reason: valid ? '' : [...(completion?.missing || []), '战斗完成效果未确认；未提交结果'].join('；')}});
      if (valid) apply(state, 'entry');
      if (valid && completion.outcome === 'victory' && !completion.rewards.experience) return complete(state);
      return pause(state, completion?.outcome === 'defeat' ? 'defeat' : 'victory');
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting' || !['a', 'b'].includes(input.type)) return state;
      if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
          state.execution.appliedEffects, state.context.scene)) {
        state.execution.status = 'unknown'; state.execution.reason = '战斗结果与本次调用字段不一致；未继续提交';
        return state;
      }
      const phase = state.node.split('.').at(-1);
      state.execution.trace.push({node: state.node, input: input.type, evidence: BATTLE_RESULT_EVIDENCE});
      if (phase === 'victory' && completion.rewards.experience) {
        state.selections.reward = 'experience'; return pause(state, 'rewards');
      }
      if (phase === 'rewards') {
        if (state.selections.reward === 'experience' && completion.rewards.gold) {
          state.selections.reward = 'gold'; return pause(state, 'rewards');
        }
        apply(state, 'rewards'); apply(state, 'drop');
        if (completion.drop) return pause(state, 'drop');
      }
      return complete(state);
    },
  };
}
