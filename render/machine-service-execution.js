// @editor-module 机器输入只推进临时字段与已确认的领域引用。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {characterGrowthRequiredExperience} from '../core/character-growth-values.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {MACHINE_SERVICE_EVIDENCE} from './machine-service-model.js';
import {interfacePreviewState} from './interface-state-preview.js';
import {playerTileFromSaveCamera} from '../core/save-position.js';

export function machineServiceExecution({command, graph, text, goods = [], destinations = [], routes = [], hidden, growth,
  wanted, numericCodes = [], codes, navigation}) {
  const cid = command.command_id;
  const application = interfaceApplicationExecution({command, graph, text, evidence: MACHINE_SERVICE_EVIDENCE,
    domain: ({block, branch}) => {
      const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
      const get = (state, suffix) => {
        const id = key(state, suffix);
        if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
        return state.fields[id];
      };
      const flag = target => `global_event_flag.${(codes['wanted-claim-event-base'] + target).toString(16).toUpperCase().padStart(2, '0')}`;
      const open = state => destinations.filter(row => get(state, `teleport_destination.${row.id}.unlocked`));
      const claim = (state, after = 0) => {
        const limit = codes['wanted-claim-scan-limit'];
        if (!Number.isInteger(limit) || limit < 2 || limit > 12 || !Number.isInteger(codes['wanted-claim-event-base'])
          || codes['wanted-claim-event-base'] + limit > 256)
          return block(state, '领赏扫描范围未确认');
        let defeated = false;
        for (let target = after + 1; target < limit; target++) {
          if (!get(state, `wanted_defeat_level_at_victory.${target}`)) continue;
          defeated = true;
          if (get(state, flag(target))) continue;
          state.execution.wanted = target;
          state.execution.event = flag(target);
          state.context.wanted = target;
          state.execution.choice = 2;
          return;
        }
        state.execution.choice = after ? 0 : defeated ? 1 : 0;
      };
      const options = state => state.pause.kind === 'choice' ? ['是', '否'] : state.pause.kind !== 'menu' ? []
        : cid === 0x1A ? goods.map(id => `曲目 ${id}`)
        : cid === 0x2D ? open(state).map(row => row.text_record)
        : cid === 0x25 ? ['听情报', '领奖金', '退出'] : [];
      const operate = (state, operation) => {
        const e = state.execution, op = operation.opcode;
        if ([0xC9, 0xCC, 0xCD, 0xD3, 0xD4].includes(op)) return;
        if (op === 0xC8) {e.choice = 0; return;}
        if (op === 0xB0 && cid === 0x25) {
          const raw = wanted.bounty_codes.find(row => row.wanted_id === e.wanted)?.raw_code;
          const amount = numericCodes.find(row => row.raw_code === raw && row.available)?.value;
          if (!Number.isInteger(amount) || amount < 0) return block(state, '当前赏金代码未确认');
          e.quote = amount; return;
        }
        if (op === 0xF2 && cid === 0x25) {
          const sum = (get(state, 'gold') + e.quote) & 0xFFFFFF;
          return branch(state, command.dialogue_flow.segments[state.control], sum <= 9999999 ? 0 : 1);
        }
        if (op === 0xAE && cid === 0x25) {
          if (!e.event || get(state, e.event) || !get(state, `wanted_defeat_level_at_victory.${e.wanted}`))
            return block(state, '当前目标不满足领赏条件');
          const amount = Math.min((get(state, 'gold') + e.quote) & 0xFFFFFF, 9999999);
          state.fields[key(state, 'gold')] = amount;
          const settings = get(state, 'adventure_data_settings');
          if (settings & 128 && amount >= get(state, 'gold_bell_threshold')) {
            state.fields[key(state, 'adventure_data_settings')] = settings & 127;
            state.domainResults.goldBell = {handle: 'audio-command:66', confirmed: true};
          }
          e.transactions.push({type: 'bounty', wanted: e.wanted, amount: e.quote, gold: amount});
          return;
        }
        if (op === 0xAF && cid === 0x25) {
          if (e.transactions.at(-1)?.wanted !== e.wanted) return block(state, '领取位缺少本次赏金提交');
          state.fields[key(state, e.event)] = 1; return;
        }
        if (op !== 0xD2) return block(state, `此机器原生效果 ${op.toString(16).toUpperCase()} 未确认`);
        const callback = operation.operands[0] | operation.operands[1] << 8;
        if (cid === 0x1A && callback === 0xAE92) return;
        if (cid === 0x1A && callback === 0xAEBB) {
          const id = goods[e.goods];
          if (!Number.isInteger(id)) return block(state, '所选曲目不在当前配置');
          state.domainResults.audio = {kind: 'audio-command', commandId: id, handle: `audio-command:${id.toString(16).toUpperCase().padStart(2, '0')}`,
            feedback: 'audio-command:58', confirmed: true};
          e.transactions.push({type: 'audio', command: id}); return;
        }
        if (cid === 0x35 && callback === 0xAE4D) return;
        if (cid === 0x35 && callback === 0xEEAA) {
          state.domainResults.experience = [...SERVICE_ROLES.keys()].reverse().flatMap(index => {
            const role = SERVICE_ROLES[index];
            if (!get(state, `role.${role}.present`)) return [];
            const level = get(state, `role.${role}.level`), experience = get(state, `role.${role}.experience`);
            return [{role, index, level, experience, required: characterGrowthRequiredExperience(growth, level, experience)}];
          });
          if (state.domainResults.experience.some(row => row.required === null)) block(state, '队员等级与经验不在已确认的成长区间');
          return;
        }
        if (cid === 0x2D && callback === 0xADD7) return;
        if (cid === 0x2D && callback === 0xF46E) {
          const destination = open(state)[e.destination];
          if (!destination) return block(state, '所选目的地未开放');
          state.domainResults.teleport = {destination: destination.id, selection: destination.id + 1,
            phase: 'selected', confirmed: true};
          e.branch = 1;
          return;
        }
        if (cid === 0x25 && [0xB105, 0xB10C].includes(callback)) return claim(state, callback === 0xB10C ? e.wanted : 0);
        if (cid === 0x25 && callback === 0xA17B) {
          state.domainResults.windowRefresh = {window: 'gold', gold: get(state, 'gold'), confirmed: true};
          return;
        }
        if (cid === 0x25 && callback === 0xEECE) {
          const target = state.context.service?.argument;
          if (!Number.isInteger(target) || target < 0 || target >= codes['wanted-claim-scan-limit'])
            return block(state, '事务所目标参数未确认');
          const defeated = Boolean(target && get(state, `wanted_defeat_level_at_victory.${target}`));
          const region = codes['wanted-intelligence-text-region'];
          if (!Number.isInteger(region) || !Number.isInteger(codes['wanted-intelligence-record-base']))
            return block(state, '通缉情报的文字区与记录基数未确认');
          const record = (codes['wanted-intelligence-record-base'] + (defeated ? 255 : target)) & 255;
          const handle = `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`;
          const body = text.records[handle];
          if (!body) return block(state, '通缉情报缺少当前文字记录');
          const waits = body.protected_ranges.filter(token =>
            ['wait-for-confirm-marker', 'page-break-or-repeat-end'].includes(token.semantic));
          state.domainResults.intelligence = {target, defeated, record: handle, confirmed: true};
          state.context.wanted = target; state.node = 'machine:intelligence';
          e.intelligencePause = {position: 0, count: waits.length + 1};
          if (waits.length) state.returnStack.push({caller: 'application', control: state.control, position: e.position});
          else state.domainResults.intelligence.nativeReturned = true;
          state.pause = {kind: 'wait', evidence: MACHINE_SERVICE_EVIDENCE};
          state.windows = [{id: 'machine', node: state.node}];
          e.status = 'waiting';
          return;
        }
        block(state, '此机器回调的传递效果未确认');
      };
      return {operate, options, initial: {goods: 0, destination: 0},
        fallthrough: (state, segment) => segment.terminator?.reason === 'application-vm-indexed-segment-table-end'
          ? state.execution.choice : 0,
        acceptEmptyMenu: () => cid === 0x35,
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state) {
          state.selections.choice = state.pause.kind === 'choice' ? 0 : cid === 0x1A ? state.execution.goods
            : cid === 0x2D ? state.execution.destination : 0;
          state.windows = [{id: 'machine', node: state.node, choice: state.selections.choice}];
        },
        select(state, index) {
          if (state.pause.kind !== 'menu') return;
          if (cid === 0x1A) state.execution.goods = index;
          if (cid === 0x2D) state.execution.destination = index;
        },
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const positions = cid === 0x2D ? open(state).map(row => row.id) : Array.from({length: count}, (_, index) => index);
          let old = positions[state.selections.choice], next = old;
          for (let step = 0; step < 12; step++) {
            const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
              selector: navigation.selector, selection_index: next,
              selection_count: cid === 0x2D ? destinations.length : count, direction_index: direction}, navigation);
            if (result.status !== 'available') {block(state, '此机器的方向输入未确认'); return state.selections.choice;}
            if (next === result.state.selection_index) return state.selections.choice;
            next = result.state.selection_index;
            if (positions.includes(next)) return positions.indexOf(next);
          }
          return state.selections.choice;
        },
      };
    }});
  const restore = state => {
    if (state.execution.status === 'returned') {
      if (cid === 0x25 || graph.poster)
        state.domainResults.windowRestore = {scene: state.context.scene || null, confirmed: true};
      if (cid === 0x2D && state.domainResults.teleport?.phase === 'selected') {
        state.domainResults.windowRestore = {caller: 'field-menu', confirmed: true};
        state.execution.reason = '目的地已选；关闭菜单后进入隧道';
      }
    }
    return state;
  };
  return {...application,
    initial(input) {
      if (!graph.poster) return application.initial(input);
      return interfacePreviewState({fields: input.fields, context: input.context,
        entry: 'wanted-information.poster', node: 'wanted-information.poster',
        pause: {kind: 'wait', evidence: MACHINE_SERVICE_EVIDENCE},
        windows: [{id: 'poster', node: 'wanted-information.poster'}], returnStack: [{caller: 'scene-interaction'}],
        execution: {status: 'waiting', position: 0, transactions: [], trace: []}});
    },
    advance(state, input) {
      if (cid === 0x2D && input.type === 'scene-entry') {
        const teleport = state.domainResults.teleport;
        if (state.execution.status !== 'returned' || teleport?.phase !== 'selected') return state;
        const field = id => `save.slot.${state.context.slot}.global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`;
        if (!hidden || hidden.trigger_flags.some(row => !Object.hasOwn(state.fields, field(row.id)))) {
          state.execution.status = 'unknown'; state.execution.reason = '隧道特殊路由条件未确认'; return state;
        }
        const special = hidden.trigger_flags.every(row => state.fields[field(row.id)] === row.value);
        const route = special ? hidden : routes.find(row => row.route_index === teleport.selection);
        if (!route) {state.execution.status = 'unknown'; state.execution.reason = '隧道场景路由未确认'; return state;}
        const x = special ? route.coordinate_x : route.camera_tile_origin_x_raw;
        const y = special ? route.coordinate_y : route.camera_tile_origin_y_raw;
        state.domainResults.scene = {kind: 'scene', sceneId: route.scene_id,
          ...playerTileFromSaveCamera(x, y), confirmed: true};
        if (special) state.fields[field(hidden.set_flag)] = 1;
        teleport.phase = 'arrived'; teleport.selection = 0; teleport.hidden = special;
        state.node = 'machine:teleport'; state.context.scene = {...state.domainResults.scene};
        state.domainResults.windowRestore = {scene: state.context.scene, confirmed: true};
        state.execution.reason = '传送完成';
        state.execution.trace.push({node: state.node, input: 'scene-entry', evidence: MACHINE_SERVICE_EVIDENCE});
        return state;
      }
      if (graph.poster) {
        if (state.execution.status !== 'waiting' || !['a', 'b'].includes(input.type)) return state;
        state.execution.trace.push({node: state.node, input: input.type, evidence: MACHINE_SERVICE_EVIDENCE});
        state.execution.status = 'returned'; state.execution.returnMarker = input.type;
        state.returnStack.pop(); state.pause = null; state.windows = [];
        return restore(state);
      }
      const pause = state.execution.intelligencePause;
      if (pause && state.execution.status === 'waiting') {
        if (!['a', 'b'].includes(input.type)) return state;
        state.execution.trace.push({node: state.node, input: input.type, evidence: MACHINE_SERVICE_EVIDENCE});
        if (++pause.position < pause.count) {
          if (pause.position === pause.count - 1) {
            state.returnStack.pop(); state.domainResults.intelligence.nativeReturned = true;
          }
          return state;
        }
        delete state.execution.intelligencePause;
        state.pause = null; state.execution.status = 'running';
        return restore(application.resume(state));
      }
      return restore(application.advance(state, input));
    },
  };
}
