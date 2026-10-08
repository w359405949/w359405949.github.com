// @editor-module 简单服务只将已确认领域效果提交到输入快照。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {vehicleTradeDecision} from '../core/vehicle-trade-parameters.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {resolveFacilityParameterBindings} from '../core/facility-runtime-parameters.js';
import {SIMPLE_SERVICE_EVIDENCE} from './simple-service-model.js';
import {completeVehicleWash} from './vehicle-wash-service-execution.js';

export function simpleServiceExecution({command, graph, text, goods, items, codes, trade, navigation}) {
  const cid = command.command_id;
  const execution = interfaceApplicationExecution({command, graph, text, evidence: SIMPLE_SERVICE_EVIDENCE,
    domain: ({block, branch}) => {
      const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
      const get = (state, suffix) => {
        const id = key(state, suffix);
        if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
        return state.fields[id];
      };
      const put = (state, suffix, value) => {state.fields[key(state, suffix)] = structuredClone(value);};
      const roles = state => SERVICE_ROLES.flatMap((role, index) => get(state, `role.${role}.present`) ? [index] : []);
      const vehicles = state => [...get(state, 'entity_scene_object_slots').slice(0, 4)].filter(id => id < 128);
      const role = state => `role.${SERVICE_ROLES[state.context.role]}`;
      const inventory = state => [...get(state, `${role(state)}.${state.execution.category ? 'inventory' : 'equipment'}`)];
      const saleEntries = state => inventory(state).map((id, index) => ({id, index})).filter(row => row.id);
      const decode = raw => items.equipment_editor.numeric_codes.find(row => row.raw_code === raw && row.available)?.value;
      const selectedItem = state => items.records.find(row => row.id === state.execution.item);
      const selectRole = (state, index) => {
        if (!Number.isInteger(roles(state)[index])) return block(state, '所选人物不在当前队伍');
        state.context.role = roles(state)[index]; state.selections.object = index;
      };
      const payment = state => {
        if (!Number.isInteger(state.execution.moneyAfter) || state.execution.moneyAfter < 0)
          return block(state, '交易缺少当前资金检查结果');
        put(state, 'gold', state.execution.moneyAfter);
        if (![0x2E, 0x2F].includes(cid)) state.execution.transactions.push({type: cid === 0x2C ? 'trade'
          : cid === 0x19 ? 'decoration' : 'drink', quote: state.execution.quote, object: state.context.role});
      };
      const options = state => {
        if (state.pause.kind === 'choice') return ['是', '否'];
        if (state.pause.kind !== 'menu') return [];
        const selector = state.pause.selector;
        if (selector === 1) return roles(state).map(id => ['猎人', '机械师', '战士'][id]);
        if (cid === 0x24) return selector === 4 ? ['装备', '道具'] : saleEntries(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
        if (cid === 0x2C) return [];
        return goods.map(id => cid === 0x1E ? `物品 ${id.toString(16).toUpperCase().padStart(2, '0')}`
          : command.configuration_family?.value_namespace?.goods?.find(row => row.value === id)?.text_record || String(id));
      };
      const operate = (state, operation, segment) => {
        const e = state.execution, op = operation.opcode;
        if ([0x93, 0x95, 0x99, 0x9B, 0x9E, 0xBD, 0xC4, 0xC9, 0xCA, 0x90, 0xCE].includes(op)) return;
        if (op === 0xC8) {e.choice = 0; e.sale = 0; if ([0x1E, 0x24].includes(cid)) selectRole(state, 0); return;}
        if (op === 0xC1) {state.context.role = 0; return;}
        if (op === 0xC2 || op === 0xBB) {selectRole(state, state.selections.object ?? 0); return;}
        if (op === 0xC3) {e.objectList = segment.index; return;}
        if (op === 0xDB) return branch(state, segment, roles(state).length === 1 ? 0 : 1);
        if (op === 0xDF) return branch(state, segment, cid === 0x2E
          ? SERVICE_ROLES.some(role => get(state, `role.${role}.present`) & 128) ? 1 : 0
          : vehicles(state).length ? 1 : 0);
        if (op === 0xDE) return branch(state, segment, get(state, `${role(state)}.status`) === 0xFF ? 1 : 0);
        if (op === 0xD8) return branch(state, segment, get(state, `${role(state)}.status`) >= 128 ? 1 : 0);
        if (op === 0xC5) {
          e.configuredName = goods[e.goods];
          const name = cid === 0x16 ? `inn-price-${e.configuredName}`
            : `service-${cid === 0x19 ? 'decoration' : 'bar'}-price-${e.configuredName}`;
          e.quote = decode(codes[name]);
          if (!Number.isInteger(e.quote)) return block(state, '服务价格码未确认');
          state.context.configuredName = e.configuredName; return;
        }
        if (op === 0xCF) {e.quote = operation.operands[0]; return;}
        if (op === 0xC7) {
          if (cid === 0x2E) {e.quote = (e.quote * vehicles(state).length) & 0xFFFF; return;}
          const [result] = resolveFacilityParameterBindings([{confirmation_status: 'confirmed',
            value_source: {operation: 'current-inn-cost'}}], {items, codeValues: codes,
            saveFields: Object.entries(state.fields).map(([fieldId, value]) => ({fieldId, value, status: 'exact'})),
            invocation: {saveSlot: state.context.slot, configuredName: e.configuredName}});
          if (result.status !== 'available') return block(state, result.reason);
          e.quote = result.value; return;
        }
        if (op === 0x9A) {e.item = goods[e.goods]; e.quote = selectedItem(state)?.price?.value; return;}
        if (op === 0xDC) {
          if (cid === 0x2C) e.quote = state.context.service_amount;
          if (!Number.isInteger(e.quote) || e.quote < 0) return block(state, '服务报价未确认');
          e.moneyAfter = get(state, 'gold') - e.quote;
          return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
        }
        if (op === 0xEE) {
          const held = get(state, `global_event_flag.${e.configuredName.toString(16).toUpperCase().padStart(2, '0')}`);
          e.event = e.configuredName; return branch(state, segment, held ? 1 : 0);
        }
        if (op === 0xAF) {
          if (!Number.isInteger(e.event)) return block(state, '事件提交缺少已确认的事件身份');
          put(state, `global_event_flag.${e.event.toString(16).toUpperCase().padStart(2, '0')}`, 1); return;
        }
        if (op === 0xF3) {
          const result = vehicleTradeDecision(e.quote, state.randomInputs[0], trade.prices, trade.thresholds, items.equipment_editor.numeric_codes);
          e.event = 0x4E; e.trade = result; return branch(state, segment, result.accepted ? 1 : 0);
        }
        if (op === 0xBA) {e.branch = get(state, `${role(state)}.inventory`).at(-1) ? 1 : 0; return;}
        if (op === 0xBF) {e.category = 0; e.sale = 0; return;}
        if (op === 0xD9) return branch(state, segment, inventory(state).some(Boolean) ? 1 : 0);
        if (op === 0xB5) {
          const entry = saleEntries(state)[e.sale]; e.item = entry?.id; e.saleSlot = entry?.index;
          const price = selectedItem(state)?.price;
          if (!Number.isInteger(price?.raw_code)) return block(state, '收购物品价格码未确认');
          e.branch = price.raw_code >= 0xE0 ? 0 : 1;
          if (e.branch) e.quote = Math.floor(price.value / 2); return;
        }
        if (op === 0xAE || op === 0xB4) return block(state, '收购提交的携带栏移位与装备重算传递效果未确认');
        if (op === 0x9C || op === 0xBC) {
          if (cid === 0x16) return block(state, '住宿休息的恢复与场景返回效果未确认；不提交扣款');
          if (cid === 0x1E) {
            if (!get(state, `${role(state)}.inventory`).includes(0)) return block(state, '草药交付缺少空位');
            put(state, 'gold', e.moneyAfter); return;
          }
          payment(state); return;
        }
        if (op === 0x9D) {
          const values = [...get(state, `${role(state)}.inventory`)]; const index = values.indexOf(0);
          if (index < 0) return block(state, '草药交付缺少空位');
          values[index] = e.item; put(state, `${role(state)}.inventory`, values);
          e.transactions.push({type: 'buy', item: e.item, quote: e.quote, object: role(state), index}); return;
        }
        if (op === 0xE5) return branch(state, segment, roles(state).some(id => {
          const present = get(state, `role.${SERVICE_ROLES[id]}.present`); return present > 0 && present < 128;
        }) ? 1 : 0);
        if (op === 0xD2) {
          const callback = operation.operands[0] | operation.operands[1] << 8;
          if ([0xA7B4, 0xEEB3].includes(callback)) return;
          if (callback === 0xA358) return;
          if (callback === 0xB15B) {e.instance = 255; return;}
          if (callback === 0xA810) {e.quote = Math.floor(e.quote / 2); return;}
          if (callback === 0xA1EB) {
            const value = get(state, `${role(state)}.status`) & 127;
            put(state, `${role(state)}.status`, value); put(state, `${role(state)}.numb`, 0);
            put(state, `${role(state)}.dead`, 0);
            e.transactions.push({type: 'massage', quote: e.quote, object: state.context.role}); return;
          }
          if (callback === 0xF514 && cid === 0x2E) {completeVehicleWash(state); return;}
        }
        block(state, `原生 ${op.toString(16).toUpperCase()} 的此服务调用效果未确认`);
      };
      return {operate, options, initial: {quote: 0},
        exports: {saleIndex: state => saleEntries(state)[state.execution.sale]?.index ?? 0},
        acceptEmptyMenu: () => cid === 0x2C,
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state, event) {
          state.pause.selector = event.operation?.operands[0];
          state.selections.choice = state.pause.kind === 'choice' ? 0 : state.pause.selector === 1
            ? state.selections.object ?? 0 : cid === 0x24 ? state.pause.selector === 4 ? state.execution.category : state.execution.sale
            : state.execution.goods;
        },
        select(state, index, input) {
          if (state.pause.kind !== 'menu') return;
          if (state.pause.selector === 1) {if (!input || input.type === 'a') selectRole(state, index);}
          else if (cid === 0x24) state.execution[state.pause.selector === 4 ? 'category' : 'sale'] = index;
          else state.execution.goods = index;
        },
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const paired = state.pause.selector === 1;
          const positions = paired ? roles(state).map(id => id * 2) : null;
          const selector = navigation.selectors[paired ? 'actors' : cid === 0x24 ? state.pause.selector === 4 ? 'category' : 'inventory'
            : cid === 0x1E ? 'goods' : 'service'];
          const old = paired ? positions[state.selections.choice] : state.selections.choice;
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector, selection_index: old, selection_count: paired ? 8 : count, direction_index: direction,
          }, navigation);
          if (result.status !== 'available') {block(state, '此服务选择布局的方向输入未确认'); return state.selections.choice;}
          let next = result.state.selection_index;
          if (paired && !positions.includes(next)) {
            if (direction === 4) next--;
            else if (direction === 1 || direction === 2)
              while (next >= 0 && next < 8 && !positions.includes(next)) next += direction === 1 ? -2 : 2;
            else next = old;
            if (!positions.includes(next)) next = old;
          }
          return paired ? positions.indexOf(next) : next;
        },
      };
    }});
  return {
    ...execution,
    initial(input) {
      const state = execution.initial({...input, context: {...input.context,
        service_amount: input.context.service_amount ?? 0}});
      state.randomInputs = [input.context.tradeRandom ?? 0];
      if (cid === 0x2C) {
        state.node = graph.entry; state.control = -1; state.pause = {...graph.nodes.find(node => node.id === graph.entry).pause};
        state.execution.introductionPosition = 0;
        if (state.fields[`save.slot.${state.context.slot}.global_event_flag.4E`]) {
          state.execution.status = 'unknown'; state.execution.reason = '交易事件已提交，交互 30 不再进入报价服务';
        }
      }
      return state;
    },
    advance(state, input) {
      if (state.control === -1 && state.execution.status === 'waiting') {
        if (state.pause.kind === 'choice' && ['option', 'left', 'right', 'up', 'down'].includes(input.type)) {
          const index = input.type === 'option' ? input.index : input.type === 'left' ? 0
            : input.type === 'right' ? 1 : state.selections.choice;
          if (![0, 1].includes(index)) throw new RangeError('交易提议选项超出范围');
          state.selections.choice = index;
          state.execution.trace.push({node: state.node, input: input.type, selection: index, evidence: SIMPLE_SERVICE_EVIDENCE});
          return state;
        }
        if (!['a', 'b'].includes(input.type)) return state;
        state.execution.trace.push({node: state.node, input: input.type,
          selection: state.selections.choice, evidence: SIMPLE_SERVICE_EVIDENCE});
        if (state.pause.kind === 'choice' && (input.type === 'b' || state.selections.choice === 1)) {
          state.execution.status = 'returned'; state.pause = null; state.returnStack = []; state.windows = [];
          return state;
        }
        const next = graph.nodes.find(node => node.introductionPosition === state.execution.introductionPosition + 1);
        if (next) {
          state.execution.introductionPosition++; state.node = next.id; state.pause = {...next.pause}; state.selections.choice = 0;
          return state;
        }
        const initial = execution.initial({fields: state.fields, context: state.context});
        initial.randomInputs = state.randomInputs; return initial;
      }
      if (cid === 0x2C && state.control === 0 && ['amount', 'random'].includes(input.type)) {
        const maximum = input.type === 'amount' ? 9999999 : 255;
        if (!Number.isInteger(input.value) || input.value < 0 || input.value > maximum) throw new RangeError('交易预览输入超出范围');
        if (input.type === 'amount') state.context.service_amount = input.value;
        else state.randomInputs = [input.value];
        return state;
      }
      return execution.advance(state, input);
    },
  };
}
