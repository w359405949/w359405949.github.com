// @editor-module 设备交易按应用正文推进，设备完成结果只提交到快照。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {createFacilityDeviceFrame, advanceFacilityDeviceFrame} from '../core/facility-device-state.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {DEVICE_SERVICE_EVIDENCE} from './device-service-model.js';

export function deviceAnimationExecution({command, graph, text, goods, prices, codes, wager, weaponCapacities = {}, navigation}) {
  const cid = command.command_id, frog = cid === 0x32, armor = cid === 0x1D;
  let continuation;
  const execution = interfaceApplicationExecution({command, graph, text, evidence: DEVICE_SERVICE_EVIDENCE,
    domain: ({block, branch, changeSegment}) => {
      const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
      const get = (state, suffix) => {
        const id = key(state, suffix);
        if (!Object.hasOwn(state.fields, id)) throw new TypeError(`设备预览缺少字段：${id}`);
        return state.fields[id];
      };
      const put = (state, suffix, value) => {state.fields[key(state, suffix)] = structuredClone(value);};
      const roles = state => SERVICE_ROLES.flatMap((role, index) => get(state, `role.${role}.present`) ? [index] : []);
      const vehicles = state => get(state, 'entity_scene_object_slots').slice(0, 4).filter(id => id < 128 && id !== 0x24);
      const vehicleMenu = state => cid === 0x1C && state.control < 17 || armor && state.control < 12;
      const party = state => vehicleMenu(state) ? vehicles(state) : roles(state);
      const role = state => SERVICE_ROLES[state.context.role];
      const inventory = state => [...get(state, `role.${role(state)}.inventory`)];
      const options = state => state.pause?.kind === 'choice' ? ['是', '否'] : state.pause?.kind !== 'menu' ? []
        : frog ? ['青蛙 1', '青蛙 2', '青蛙 3']
          : state.pause.selector === 1 ? party(state).map(id => vehicleMenu(state)
            ? `战车 ${id + 1}` : ['猎人', '机械师', '战士'][id])
            : goods.slice(0, 6).map((_, index) => `商品格 ${index + 1}`);
      const start = (state, kind, segment) => {
        delete state.domainResults.device;
        if (kind !== 'frog-race') delete state.view.deviceFrame;
        try {
          const input = state.context.deviceInput;
          state.view.deviceFrame = kind === 'frog-race' ? state.view.deviceFrame
            : createFacilityDeviceFrame(kind, {...input, position: state.execution.lotteryPosition}, codes);
          if (!state.view.deviceFrame) throw new TypeError('赛程缺少调用前的初始化现场');
          state.execution.frameContinuation = {kind, control: segment.index};
          state.execution.status = 'animating';
          state.pause = {kind: 'device-frame'};
        } catch (error) {block(state, error.message);}
      };
      continuation = state => {
        const result = state.view.deviceFrame.completion;
        if (!result?.confirmed) {block(state, result?.reason || '设备完成结果未确认'); return;}
        const pending = state.execution.frameContinuation;
        if (!pending || pending.kind !== result.kind) {block(state, '设备完成结果与调用不符'); return;}
        state.domainResults.device = structuredClone(result);
        state.execution.trace.push({control: pending.control, completion: structuredClone(result), evidence: DEVICE_SERVICE_EVIDENCE});
        state.execution.status = 'running'; state.pause = null;
        delete state.execution.frameContinuation;
        if (result.kind === 'frog-race') {
          state.execution.quote = wager * result.odds;
          changeSegment(state, result.winner === state.execution.goods ? 8 : 7);
        } else {
          state.execution.lotteryPosition = result.position;
          branch(state, command.dialogue_flow.segments[pending.control], result.won ? 1 : 0);
        }
      };
      const deliver = (state, item, quantity) => {
        const carried = inventory(state), used = carried.indexOf(0);
        if (!Number.isInteger(item) || item < 15 || item > 255 || !Number.isInteger(quantity) || quantity < 1
            || quantity > 127) {block(state, '道具交付的商品或数量域未确认'); return null;}
        if ((used < 0 ? carried.length : used) + quantity > codes['vending-role-inventory-capacity']) return false;
        for (let index = 0; index < quantity; index++) carried[used + index] = item;
        put(state, `role.${role(state)}.inventory`, carried);
        state.execution.transactions.push({type: 'item', item, quantity, role: state.context.role});
        return true;
      };
      const shellSpace = state => {
        const vehicle = state.context.vehicle;
        const counts = Array.from({length: 6}, (_, index) => get(state, `vehicle.${vehicle}.shell_count.${index}`));
        return (((counts.reduce((sum, value) => sum + value, 0) & 255) + state.execution.quantity) & 255)
          <= get(state, `vehicle.${vehicle}.ammo_capacity`);
      };
      const shellSlot = state => {
        const types = Array.from({length: 6}, (_, index) => get(state, `vehicle.${state.context.vehicle}.shell_type.${index}`));
        const match = types.indexOf(state.execution.item);
        if (match >= 0) return match;
        const used = types.filter(value => value < 128).length;
        return used < codes['vending-shell-type-capacity'] ? used : null;
      };
      const operate = (state, operation, segment) => {
        const e = state.execution, op = operation.opcode;
        if ([0xCA, 0xCC, 0xB9, 0xD3, 0xB1, 0xB8, 0x91, 0xA5, 0xA7, 0xB6, 0xB7, 0xC9, 0xD0].includes(op)) return;
        if (op === 0xC8) {state.context.role = roles(state)[0]; e.object = 0; return;}
        if (op === 0xB2) {
          e.item = goods[e.goods]; e.quantity = armor ? goods[e.goods + 6] : goods[e.goods + 6] & 127; e.quote = prices[e.goods];
          if (!Number.isSafeInteger(e.quote) || e.quote < 0 || !e.quantity)
            return block(state, '商品价格或非零数量未确认');
          e.branch = armor ? 0 : Number(goods[e.goods + 6] >= 128); return;
        }
        if (op === 0xDB) return branch(state, segment, roles(state).length === 1 ? 0 : 1);
        if (op === 0xDF) return branch(state, segment,
          SERVICE_ROLES.some(role => get(state, `role.${role}.present`) & 128) ? 1 : 0);
        if (op === 0xDC) {
          if (!Number.isSafeInteger(e.quote)) return block(state, '设备交易报价未确认');
          e.moneyAfter = get(state, 'gold') - e.quote;
          return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
        }
        if (op === 0xBC) {
          if (!Number.isSafeInteger(e.moneyAfter) || e.moneyAfter < 0) return block(state, '设备扣款缺少余额检查');
          put(state, 'gold', e.moneyAfter);
          e.transactions.push({type: frog ? 'wager' : 'payment', amount: e.quote, gold: e.moneyAfter});
          return;
        }
        if (op === 0xEF) {
          const delivered = deliver(state, e.item, e.quantity);
          if (delivered !== null) branch(state, segment, delivered ? 0 : 1);
          return;
        }
        if (op === 0xDD) {start(state, 'vending-lottery', segment); return;}
        if (op === 0xD7) {
          if (!state.domainResults.device?.confirmed || !state.domainResults.device.won)
            return block(state, '奖品交付缺少已确认的抽奖结果');
          const delivered = deliver(state, goods[12], 1);
          if (delivered !== null) branch(state, segment, delivered ? 0 : 1);
          return;
        }
        if (op === 0xBD && frog) {e.quote = wager; return;}
        if (op === 0xAE && frog) {
          if (!state.domainResults.device?.confirmed || state.domainResults.device.winner !== e.goods)
            return block(state, '赛跑奖励缺少已确认的胜者');
          const value = Math.min((get(state, 'gold') + e.quote) & 0xFFFFFF, 9999999);
          put(state, 'gold', value); e.transactions.push({type: 'race-prize', amount: e.quote, gold: value}); return;
        }
        if (op === 0xAB) {e.branch = Number(shellSpace(state)); return;}
        if (op === 0xAC) {e.shellSlot = shellSlot(state); e.branch = Number(e.shellSlot !== null); return;}
        if (op === 0xA6) {
          if (!Number.isInteger(e.shellSlot) || !Number.isInteger(e.quantity) || e.item > 14)
            return block(state, '炮弹提交缺少已确认的种类或槽位');
          const suffix = `vehicle.${state.context.vehicle}`;
          put(state, `${suffix}.shell_type.${e.shellSlot}`, e.item);
          put(state, `${suffix}.shell_count.${e.shellSlot}`, (get(state, `${suffix}.shell_count.${e.shellSlot}`) + e.quantity) & 255);
          e.transactions.push({type: 'shell', item: e.item, quantity: e.quantity, vehicle: state.context.vehicle}); return;
        }
        if (op === 0xD2) {
          const target = operation.operands[0] | operation.operands[1] << 8;
          if (target === 0xAE56) {if (frog) e.round = 0; return;}
          if (target === 0xB388) {if (frog) e.round = (e.round + 1) & 255; return;}
          if (target === 0xB383) return;
          if (target === 0xA6DE && armor) {
            const suffix = `vehicle.${state.context.vehicle}.sp`;
            const value = (get(state, suffix) + e.quantity) & 65535;
            put(state, suffix, value);
            e.transactions.push({type: 'armor', vehicle: state.context.vehicle, quantity: e.quantity, sp: value});
            return;
          }
          if (target === 0xA48B && frog) {
            delete state.domainResults.device;
            delete state.view.deviceFrame;
            try {state.view.deviceFrame = createFacilityDeviceFrame('frog-race', state.context.deviceInput, codes);}
            catch (error) {block(state, error.message);}
            return;
          }
          if (target === 0xB3AA && frog) {start(state, 'frog-race', segment); return;}
          if (target === 0xB0CC && cid === 0x1C) {
            const prefix = `vehicle.${state.context.vehicle}`;
            const item = get(state, `${prefix}.equipment.main_gun`);
            const capacity = weaponCapacities[item];
            const loaded = get(state, `${prefix}.equipment_state.main_gun`) & codes['vending-loaded-weapon-count-mask'];
            const available = get(state, `${prefix}.equipped_mask_raw`) >= 128
              && item < codes['vending-loaded-weapon-item-limit'] && Number.isInteger(capacity)
              && ((loaded + e.quantity) & 255) <= capacity;
            e.loadedAfter = available ? (loaded + e.quantity) & 255 : null;
            e.branch = available ? 1 : 0;
            return;
          }
          if (target === 0xB055 && cid === 0x1C) {
            if (!Number.isInteger(e.loadedAfter)) return block(state, '主炮装填缺少已确认的容量检查');
            const prefix = `vehicle.${state.context.vehicle}.equipment_state.main_gun`;
            put(state, prefix, (get(state, prefix) & 0xC0) | e.loadedAfter);
            e.transactions.push({type: 'loaded-shell', quantity: e.quantity, vehicle: state.context.vehicle}); return;
          }
          return block(state, `原生设备调用 ${target.toString(16).toUpperCase()} 的字段效果未确认`);
        }
        block(state, `设备操作 ${op.toString(16).toUpperCase()} 的效果未确认`);
      };
      return {operate, options, initial: {goods: 0, object: 0, lotteryPosition: null, quote: frog ? wager : null},
        fallthrough: (state, segment) => segment.terminator?.reason === 'application-vm-indexed-segment-table-end'
          ? state.execution.goods : 0,
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state, event) {
          state.pause.selector = event.operation?.operands[0];
          state.selections.choice = state.pause.kind === 'choice' ? 0 : state.pause.selector === 1 ? state.execution.object : state.execution.goods;
        },
        select(state, index, input) {
          if (state.pause.kind !== 'menu') return;
          if (state.pause.selector === 1) {
            state.execution.object = index;
            const target = party(state)[index];
            if (!input || input.type === 'a') state.context[vehicleMenu(state) ? 'vehicle' : 'role'] = target;
          } else state.execution.goods = index;
        },
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const paired = state.pause.selector === 1, positions = paired ? vehicleMenu(state)
            ? get(state, 'entity_scene_object_slots').slice(0, 4).flatMap((id, index) => id < 128 && id !== 0x24 ? [index * 2 + 1] : [])
            : roles(state).map(id => id * 2) : null;
          const selector = frog ? 0x16 : paired ? codes['vending-party-selector'] : navigation.selector;
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector, selection_index: paired ? positions[state.selections.choice] : state.selections.choice,
            selection_count: paired ? 8 : count, direction_index: direction}, navigation);
          if (result.status !== 'available') throw new TypeError('设备方向输入缺少选择布局');
          const index = paired ? positions.indexOf(result.state.selection_index) : result.state.selection_index;
          return index < 0 ? state.selections.choice : index;
        },
      };
    },
  });
  return {...execution,
    initial(input) {
      const state = execution.initial(input);
      if (!frog && (goods.length < 12 || navigation.count !== 6)) {
        state.execution.status = 'unknown'; state.execution.reason = '当前售货机配置与选择域不满足六格输入';
      }
      state.execution.lotteryPosition = input.context.deviceInput?.position;
      return state;
    },
    advance(state, input) {
      if (state.execution.status !== 'animating') {
        const next = execution.advance(state, input);
        if (frog && next.execution.status === 'returned')
          next.domainResults.windowRestore = {scene: next.context.scene || null, confirmed: true};
        return next;
      }
      if (input.type !== 'frame') return state;
      state.view.deviceFrame = advanceFacilityDeviceFrame(state.view.deviceFrame, input, codes);
      if (state.view.deviceFrame.status !== 'running') {continuation(state); return execution.resume(state);}
      return state;
    },
  };
}
