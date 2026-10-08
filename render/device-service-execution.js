// @editor-module 设备输入仅修改预览快照，未确认效果在调用边界停止。
import {interfacePreviewState} from './interface-state-preview.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {DEVICE_SERVICE_EVIDENCE} from './device-service-model.js';
import {deviceAnimationExecution} from './device-animation-execution.js';
import {applyBattleResultEffects} from './battle-result-state-machine.js';

export function deviceServiceExecution({command, graph, text, prices = [], wager, weaponCapacities, destinations = [], goods = [], codes = {}, targets = [], control, alarm, sceneExecution, entry, reason, navigation}) {
  const cid = command.command_id;
  if ([0x1B, 0x1C, 0x1D, 0x32].includes(cid))
    return deviceAnimationExecution({command, graph, text, goods, prices, wager, weaponCapacities, codes, navigation});
  const block = (state, message) => {
    state.execution.status = 'unknown'; state.execution.reason = message;
    state.execution.trace.push({node: state.node, status: 'unknown', reason: message, evidence: DEVICE_SERVICE_EVIDENCE});
    return state;
  };
  const returnToScene = state => {
    state.execution.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
    state.node = 'device:scene-return';
    if (state.context.scene) state.domainResults.scene = {kind: 'scene', ...state.context.scene, confirmed: true};
    return state;
  };
  const commitFlag = (state, flag, value) => {
    const field = `save.slot.${state.context.slot}.global_event_flag.${flag.toString(16).toUpperCase().padStart(2, '0')}`;
    if (!Object.hasOwn(state.fields, field)) return false;
    state.fields[field] = value;
    state.domainResults.controller = {command: cid, entry: entry.handle, flag, value, confirmed: true};
    const reference = `global-event-flag:${flag.toString(16).toUpperCase().padStart(2, '0')}`;
    const controlled = control?.event_flag_reference === reference ? (control.targets || [])
      .filter(row => !row.event_flag_reference || row.event_flag_reference === reference)
      : control?.failure_flag_reference === reference ? (control.targets || []).filter(row => row.event_flag_reference === reference) : [];
    state.domainResults.controlledObjects = {committed: false,
      status: controlled.length ? 'deferred' : 'unknown', references: structuredClone(controlled),
      reason: cid === 0x38 ? `尚缺事件位 $${flag.toString(16).toUpperCase().padStart(2, '0')} 的受控对象读取现场`
        : '受控对象由场景装载或自主动作续接；设备会话只提交事件字段'};
    if (cid === 0x37 && flag >= 0xA0 && flag <= 0xA3 && sceneExecution) {
      state.domainResults.controlledObjects = {...sceneExecution.advance(state), references: structuredClone(controlled)};
      state.execution.transactions.push({type: 'scene-actors', ...state.domainResults.controlledObjects});
    }
    state.execution.transactions.push({type: 'controller', ...state.domainResults.controller});
    return true;
  };
  const comparePassword = state => {
    const flag = codes[`controller-event-flag-${entry.statusIndex}`];
    const length = codes['controller-password-length'];
    const offset = codes[`controller-password-offset-${flag - 0xA0}`];
    if (flag < 0xA0 || flag > 0xA3 || !Number.isInteger(offset) || offset + length > 24)
      return block(state, '此密码终端的比较表未确认');
    const matched = state.execution.passwordBuffer.every((value, index) => value
      === codes[`controller-password-byte-${offset + length - 1 - index}`]);
    state.domainResults.password = {matched, entry: entry.handle, command: cid, confirmed: true};
    state.execution.feedbackFrames = codes['controller-password-feedback-frames'];
    state.execution.reason = `反馈等待 ${state.execution.feedbackFrames} 帧；A / B 推进等待结束`;
    state.node = 'device:password-result'; state.pause = {kind: 'wait'};
    return state;
  };
  const options = state => state.execution.status !== 'waiting' || state.pause?.kind === 'wait' ? [] : cid === 0x1F
    ? destinations.map(row => `楼层 ${row.value}`) : cid >= 0x1B && cid <= 0x1D
      ? goods.slice(0, 6).map((_, index) => `商品格 ${index + 1}`)
      : cid >= 0x36 ? Array.from({length: navigation.capacity || 0}, (_, index) => index === targets.length
        ? 'EXIT' : cid !== 0x37 && targets[index] === 3 ? 'OPEN'
          : cid !== 0x37 && targets[index] === 4 ? 'CLOSE' : cid === 0x37 && targets[index] === 4 ? 'BACK'
            : cid === 0x37 && targets[index] === 3 && codes[`controller-password-key-${index}`] <= 9
              ? String(codes[`controller-password-key-${index}`]) : `键位 ${index + 1}`) : [];
  return {
    options,
    initial({fields, context, view = {}}) {
      const state = interfacePreviewState({fields, context, node: graph.entry, entry: graph.entry,
        view,
        pause: {kind: 'menu'}, selections: {choice: 0}, returnStack: [{caller: 'scene-interaction'}],
        execution: {status: 'waiting', reason: '', trace: [], transactions: [], password: ''}});
      if (reason) return block(state, reason);
      if (cid === 0x1F) {
        const index = destinations.findIndex(row => row.sceneId === context.scene.sceneId);
        if (index < 0 || destinations.length > navigation.count) return block(state, '电梯初始楼层超出当前选择域');
        state.selections.choice = index;
      }
      if (cid >= 0x36 && (!entry || entry.statusIndex < 0 || entry.statusIndex > 22))
        return block(state, '终端实例超出已确认的调用现场');
      if (cid >= 0x36 && (navigation.capacity !== targets.length + 1 || navigation.count !== 12
          || codes['controller-selection-count'] < navigation.capacity))
        return block(state, '终端布局与运行选择域不一致');
      if (cid === 0x37) {
        const length = codes['controller-password-length'];
        if (length !== 6) return block(state, '密码缓冲长度超出已确认的六位输入');
        state.execution.passwordBuffer = Array(length).fill(codes['controller-password-fill']);
        state.execution.passwordCursor = 0;
      }
      state.windows = [{id: 'device', node: state.node, choice: state.selections.choice}];
      if (sceneExecution) sceneExecution.advance(state);
      return state;
    },
    advance(state, input) {
      if (input.type === 'battle-result' && state.node === 'device:password-alarm'
          && state.returnStack.at(-1)?.caller === 'password-alarm') {
        const result = input.result;
        const invocation = result?.invocation;
        const alarmField = `save.slot.${state.context.slot}.global_event_flag.${alarm.pendingEventFlag.toString(16).toUpperCase().padStart(2, '0')}`;
        if (invocation?.saveSlot !== state.context.slot || invocation?.sceneId !== state.context.scene?.sceneId
            || invocation.sourceFields?.[alarmField] !== 1
            || result.outcome === 'victory' && (!result.eventFlags?.includes(alarm.pendingEventFlag)
              || result.sceneReturn?.mode !== 'reload' || result.sceneReturn?.handoff)
            || result.outcome === 'defeat' && result.sceneReturn?.handoff !== 'story-f2'
            || !applyBattleResultEffects(state, result))
          return block(state, '战斗完成效果未确认；保留调查调用栈');
        state.domainResults.battleResult = structuredClone(result);
        state.execution.transactions.push({type: 'battle-result', outcome: result.outcome, effects: structuredClone(result.effects)});
        if (result.sceneReturn.mode === 'reload' && !result.sceneReturn.handoff && sceneExecution) {
          state.domainResults.controlledObjects = sceneExecution.reload(state);
          state.execution.transactions.push({type: 'scene-reload', ...state.domainResults.controlledObjects});
        }
        state.returnStack.pop(); state.execution.reason = '';
        return returnToScene(state);
      }
      if (cid === 0x37 && state.execution.status === 'returned' && input.type === 'a'
          && !state.domainResults.sceneReturn?.handoff)
        return this.initial({fields: state.fields, context: state.context, view: state.view});
      if (state.execution.status !== 'waiting') return state;
      const list = options(state), e = state.execution;
      e.trace.push({node: state.node, input: input.type, selection: state.selections.choice, evidence: DEVICE_SERVICE_EVIDENCE});
      if (cid === 0x37 && state.node === 'device:password-result') {
        if (!['a', 'b'].includes(input.type)) return state;
        const flag = state.domainResults.password.matched ? codes[`controller-event-flag-${entry.statusIndex}`]
          : codes['controller-password-failure-flag'];
        if (!commitFlag(state, flag, 1)) return block(state, '密码终端预览缺少事件字段');
        e.feedbackFrames = 0;
        if (!state.domainResults.password.matched) {
          state.windows = []; state.pause = {kind: 'battle'};
          state.node = 'device:password-alarm';
          if (!alarm) return block(state, '报警战斗入口未确认；保留调查调用栈');
          state.domainResults.battleCall = {...alarm, node: state.node, caller: structuredClone(state.returnStack.at(-1)),
            scene: structuredClone(state.context.scene)};
          state.returnStack.push({caller: 'password-alarm', entry: alarm.actor});
          e.status = 'battle'; e.reason = '等待防御机器战斗完成结果';
          return state;
        }
        e.reason = '';
        return returnToScene(state);
      }
      if (input.type === 'password' && cid === 0x37) {
        const length = codes['controller-password-length'];
        if (!Number.isInteger(length) || length < 1 || length > 6 || !new RegExp(`^[0-9]{0,${length}}$`, 'u').test(input.value))
          throw new RangeError('密码输入超出当前数字域');
        e.password = input.value;
        e.passwordBuffer = Array.from({length}, (_, index) => index < input.value.length
          ? Number(input.value[index]) : codes['controller-password-fill']);
        e.passwordCursor = Math.min(input.value.length, length - 1);
        if (input.value.length < length) return state;
        return comparePassword(state);
      }
      if (input.type === 'option' || ['up', 'down', 'left', 'right'].includes(input.type)) {
        let index = input.index;
        if (input.type !== 'option') {
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector: navigation.selector, selection_index: state.selections.choice,
            selection_count: cid === 0x1F ? destinations.length : cid >= 0x36 ? codes['controller-selection-count'] : navigation.count,
            direction_index: ['up', 'down', 'left', 'right'].indexOf(input.type) + 1}, navigation);
          if (result.status !== 'available') return block(state, '设备方向输入缺少已确认的选择布局');
          index = result.state.selection_index;
        }
        if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new RangeError('选择超出当前设备选项');
        state.selections.choice = index; state.windows[0].choice = index;
        return state;
      }
      if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的设备输入');
      if (cid === 0x1F) {
        const row = input.type === 'b' ? destinations.find(row => row.sceneId === state.context.scene.sceneId)
          : destinations[state.selections.choice];
        state.domainResults.scene = {kind: 'scene', sceneId: row.sceneId, x: row.x, y: row.y, confirmed: true};
        state.node = 'device:elevator-arrival';
        e.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
        e.transactions.push({type: 'elevator', cancelled: input.type === 'b', scene: state.domainResults.scene});
        return state;
      }
      if (input.type === 'b') {
        if (cid >= 0x36) return returnToScene(state);
        e.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
        return state;
      }
      if (cid >= 0x36 && state.selections.choice === targets.length) return returnToScene(state);
      if (cid === 0x37) {
        const target = targets[state.selections.choice];
        if (target === 1) return state;
        if (target === 4) e.passwordCursor = Math.max(0, e.passwordCursor - 1);
        else if (target === 3) {
          const value = codes[`controller-password-key-${state.selections.choice}`];
          if (!Number.isInteger(value)) return block(state, '当前键位的缓冲值未确认');
          e.passwordBuffer[e.passwordCursor] = value;
          e.password = e.passwordBuffer.filter(value => value <= 9).join('');
          if (e.passwordCursor === codes['controller-password-length'] - 1) return comparePassword(state);
          e.passwordCursor++;
        } else return block(state, '密码键位超出已确认的分派域');
        e.password = e.passwordBuffer.filter(value => value <= 9).join('');
        return state;
      }
      if (cid >= 0x36) {
        const target = targets[state.selections.choice];
        if (target === 1) return state;
        if (![3, 4].includes(target)) return block(state, '控制器选择不在已确认的分派域');
        const flag = codes[`controller-event-flag-${entry.statusIndex}`];
        if (!Number.isInteger(flag) || flag < 0 || flag > 255) return block(state, '控制器事件位未确认');
        if (!commitFlag(state, flag, Number(target === 3))) return block(state, '控制器预览缺少事件字段');
        return returnToScene(state);
      }
      return block(state, '商品已选择；价格、携带物提交及抽奖动画返回未确认');
    },
  };
}
