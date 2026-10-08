// @editor-module 专用服务沿公共应用执行器推进并在未知传递效果前停止。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {setInterfaceQuantity} from './interface-quantity-input.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {specialServiceFields} from './special-service-fields.js';
import {specialVehicleServiceDomain} from './special-vehicle-service-execution.js';
import {specialRepairServiceDomain} from './special-repair-service-execution.js';
import {specialRentalServiceDomain} from './special-rental-service-execution.js';
import {specialLensServiceDomain} from './special-lens-service-execution.js';
import {SPECIAL_SERVICE_EVIDENCE} from './special-service-model.js';

export function specialServiceExecution({command, graph, text, navigation, ...data}) {
  const cid = command.command_id, fields = specialServiceFields(data);
  const {get, put, roles, vehicles, rolePath, party, status} = fields;
  const quantityMenu = state => state.pause.selector === 7;
  const execution = interfaceApplicationExecution({command, graph, text, evidence: SPECIAL_SERVICE_EVIDENCE,
    domain: helpers => {
      const {block, branch} = helpers;
      const repair = specialRepairServiceDomain(fields, helpers);
      const rental = specialRentalServiceDomain(fields, data, helpers);
      const vehicle = specialVehicleServiceDomain(cid, fields, data, helpers);
      const lens = specialLensServiceDomain(fields, helpers);
      const donation = (state, paid) => {
        const e = state.execution, event = e.event.toString(16).toUpperCase().padStart(2, '0');
        state.domainResults.donation = {amount: e.quote, event,
          eventSet: Boolean(get(state, `global_event_flag.${event}`)), paid};
      };
      const options = state => {
        if (state.pause.kind === 'choice') return ['是', '否'];
        if (state.pause.kind !== 'menu' || quantityMenu(state)) return [];
        const e = state.execution;
        if (state.pause.selector === 1) return (e.actorKind ? vehicles(state) : roles(state))
          .map(id => e.actorKind ? `战车 ${id + 1}` : `${['猎人', '机械师', '战士'][id]}${cid === 0x22 ?
            get(state, `role.${SERVICE_ROLES[id]}.status`) === 255 ? ' · 尸体' : ' · 存活' : ''}`);
        if (cid === 0x14) return state.control === 1 ? ['战车', '坦克'] : state.control === 5
          ? ['租借', '归还', '说明', '退出'] : state.control === 8 ? data.goods.map(id => `出租预设 ${id}`)
            : e.returnRoles.map(index => `出租战车 ${index + 1}`);
        if (cid === 0x22) return ['复活', '退出'];
        if (cid === 0x23 || cid === 0x27) return state.control === 22
          ? ['主炮', '副炮', 'S-E', '返回'] : ['弹仓', '守备力', '孔位', '返回'];
        if (cid === 0x21 || cid === 0x29) return state.pause.selector === 6
          ? e.repairEntries.map(row => row.header ? `战车 ${row.vehicle + 1}` : `物品 ${row.item.toString(16).toUpperCase()}`)
          : cid === 0x21 && state.control === 0 ? ['修车', '零钱', '隐退', '来看你'] : ['全部', '选择', '退出'];
        if (cid === 0x2B) return [0, 1, 2, 3].map(index => `镜片槽 ${index + 1}${e.arrangement[index] ? ' · 已占用' : ''}`);
        return [];
      };
      const select = (state, index, input) => {
        const e = state.execution;
        if (input) e.branch = input.type === 'b' ? 1 : 0;
        if (state.pause.kind !== 'menu' || input?.type === 'b') return;
        if (state.pause.selector === 1) {
          const id = (e.actorKind ? vehicles(state) : roles(state))[index];
          if (!Number.isInteger(id)) return block(state, '所选对象不在当前队伍');
          state.context[e.actorKind ? 'vehicle' : 'role'] = id; state.selections.object = index;
        } else if (cid === 0x14) {
          if (state.control === 8) e.rentalChoice = index;
          if (state.control === 19) {e.returnChoice = index; state.context.vehicle = 8 + e.returnRoles[index];}
        } else if (cid === 0x23) e[state.control === 22 ? 'hole' : 'project'] = index;
        else if (cid === 0x21 || cid === 0x29) e[state.pause.selector === 6 ? 'repairChoice' : 'scope'] = index;
        else if (cid === 0x2B) e.lensPosition = index;
      };
      const operate = (state, operation, segment) => {
        const e = state.execution, op = operation.opcode;
        if ([0x14, 0x30].includes(cid) && rental.operate(state, operation, segment) !== false) return;
        if ([0x23, 0x28].includes(cid) && vehicle(state, operation, segment) !== false) return;
        if ([0x21, 0x29].includes(cid) && repair.operate(state, operation, segment) !== false) return;
        if (cid === 0x2B && lens(state, operation, segment) !== false) return;
        if (op === 0x94) {e.actorKind = 1; return;}
        if (op === 0x95) {e.actorKind = 0; return;}
        if ([0xC8, 0xC9, 0xCA].includes(op)) {e.choice = 0; return;}
        if (op === 0xB6) {e.selectionCursorVisible = true; return;}
        if (op === 0xA7) return;
        if (op === 0xC3) {e.objectList = segment.index; e.choice = 0; state.selections.choice = 0; return;}
        if (op === 0xC2 || op === 0xBB) {
          if (e.actorKind) e.branch = state.context.vehicle < 8 ? 0 : 1;
          return;
        }
        if (op === 0xC6) {e.project = e.choice; return;}
        if (op === 0xDF) return branch(state, segment,
          SERVICE_ROLES.some(role => get(state, `role.${role}.present`) & 128) ? 1 : 0);
        if (op === 0xDE) return branch(state, segment, get(state, `${rolePath(state)}.status`) === 255 ? 1 : 0);
        if (op === 0xBD) {e.quote = 0; return;}
        if (op === 0xCF) {e.quote = operation.operands[0]; return;}
        if (op === 0xD0) {
          e.windowSelector = operation.operands[0]; e.choice = 0; state.selections.choice = 0;
          if (e.windowSelector === 0x16) e.scope = 0;
          if (e.windowSelector === 0x9E) e.repairChoice = 0;
          return;
        }
        if (op === 0xD4) {
          e.windowRecord = operation.operands[0]; e.windowSelector = operation.operands[1];
          e.choice = 0; state.selections.choice = 0;
          return;
        }
        if (op === 0xCE) {
          e.quantity = {kind: 'money', maximum: 9999999, value: 0, accepted: null};
          state.context.service_amount = 0; return;
        }
        if (op === 0x90) {e.quote = state.context.service_amount; e.quantity.accepted = e.quote; return;}
        if (op === 0xDC) {
          if (!Number.isInteger(e.quote) || e.quote < 0) return block(state, '当前服务报价未确认');
          e.moneyAfter = get(state, 'gold') - e.quote;
          return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
        }
        if (op === 0xBC || op === 0x9C) {
          if (!Number.isInteger(e.moneyAfter) || e.moneyAfter < 0) return block(state, '扣款缺少已接受报价');
          put(state, 'gold', e.moneyAfter);
          if (cid === 0x2A) {e.transactions.push({type: 'donation', amount: e.quote}); donation(state, true);}
          return;
        }
        if (op === 0xF8) {
          const id = operation.operands[0]; e.event = id;
          return branch(state, segment, get(state, `global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`) ? 1 : 0);
        }
        if (op === 0xF9) return branch(state, segment, get(state, 'role.hunter.level') >= operation.operands[0] ? 0 : 1);
        if (op === 0xFC) {
          if (cid === 0x2A) e.event = operation.operands[0];
          const limit = (operation.operands[0] || get(state, 'role.hunter.level')) ** 2;
          return branch(state, segment, e.quote === 0 ? 0 : e.quote <= limit ? 1 : 2);
        }
        if (op === 0xF5) return branch(state, segment, e.quote <= 10 ? 0 : 1);
        if (op === 0x92 && cid === 0x21) {
          state.node = 'special:ending'; state.pause = null; e.status = 'called'; e.callLabel = '结局调用边界';
          state.domainResults.call = {kind: 'ending', pendingEffects: ['保存活动状态到所选存档槽', '事件 10'],
            scene: 'scene:02', mode: '0D',
            evidence: 'project/evidence/fragment-followups-ending/observations.json#/ending/retirement'};
          state.returnStack.push({caller: command.dialogue_flow.id, control: state.control, target: 'ending'}); return;
        }
        if (op === 0xFA) return branch(state, segment, e.quote === 0 ? 0
          : e.quote <= get(state, 'role.hunter.level') ** 2 ? 1 : 2);
        if (op === 0xAF) {
          if (!Number.isInteger(e.event)) return block(state, '事件提交缺少已确认身份');
          put(state, `global_event_flag.${e.event.toString(16).toUpperCase().padStart(2, '0')}`, 1);
          if (cid === 0x2A) donation(state, false);
          return;
        }
        if (cid === 0x22 && op === 0xF4) return branch(state, segment, state.randomInputs[0] >= 0x60 ? 0 : 1);
        if (op === 0xD2) {
          const callback = operation.operands[0] | operation.operands[1] << 8;
          if ([0xB487, 0xEEB3].includes(callback)) return;
          if (callback === 0xB47A && cid === 0x21) {
            const slot = state.context.activeSaveSlot;
            if (!Number.isInteger(slot) || slot < 0 || slot > 2)
              return block(state, '隐退调用者的活动存档槽未确认');
            return helpers.changeSegment(state, slot ? 39 : 12);
          }
          if (callback === 0xF4F9 && cid === 0x22) {
            state.domainResults.revival = {role: state.context.role, animationStatus: '电击与移位效果未确认'}; return;
          }
          if (callback === 0xFC00 && cid === 0x22) {
            status(state, 0); put(state, `${rolePath(state)}.current_hp`, get(state, `${rolePath(state)}.max_hp`));
            party(state); e.transactions.push({type: 'revival', role: state.context.role}); return;
          }
        }
        block(state, `原生 ${op.toString(16).toUpperCase()} 的此服务传递效果未确认`);
      };
      return {
        options, acceptEmptyMenu: quantityMenu, initial: {actorKind: 0, weapon: 0, project: 0, hole: 0,
          quote: 0, returnRoles: [], repairEntries: [], lensPosition: 0},
        exports: {saleIndex: () => 0},
        fallthrough: (state, segment) => segment.terminator?.reason === 'application-vm-indexed-segment-table-end'
          ? state.execution.choice : 0,
        operate(state, operation, segment) {
          try {operate(state, operation, segment);}
          catch (error) {block(state, error.message);}
        },
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state, event) {
          state.execution.menuSelector = null;
          state.pause.selector = event.operation?.operands[0];
          state.pause.quantity = quantityMenu(state);
          state.selections.choice = 0;
          if (state.pause.kind === 'menu' && !state.pause.quantity && options(state).length) select(state, 0);
        },
        select,
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const paired = state.pause.selector === 1;
          const ids = paired ? state.execution.actorKind ? vehicles(state) : roles(state) : null;
          const positions = paired ? ids.map((id, index) => state.execution.actorKind ? index * 2 + 1 : id * 2) : null;
          const node = graph.nodes.find(row => row.id === state.node);
          const selector = paired ? navigation.selectors.actors : cid === 0x2B ? navigation.selectors.lens
            : cid === 0x14 && state.control === 8 ? navigation.selectors.rental
            : state.execution.menuSelector ?? node?.publishedPreview?.selection_cursor?.selector ?? navigation.selectors.service;
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector, selection_index: paired ? positions[state.selections.choice] : state.selections.choice,
            selection_count: paired ? 8 : count, direction_index: direction}, navigation);
          if (result.status !== 'available') {block(state, '当前专用选择的方向协议未确认'); return state.selections.choice;}
          let next = result.state.selection_index;
          if (paired && !positions.includes(next)) {
            if (direction === 3) next++;
            else if (direction === 4) next--;
            else while (next >= 0 && next < 8 && !positions.includes(next)) next += direction === 1 ? -2 : 2;
          }
          return paired ? positions.includes(next) ? positions.indexOf(next) : state.selections.choice : Math.min(next, count - 1);
        },
      };
    }});
  return {...execution,
    initial(input) {
      const state = execution.initial(input);
      state.randomInputs = [input.context.serviceRandom ?? 0];
      party(state);
      return state;
    },
    advance(state, input) {
      if (input.type === 'amount' && state.execution.status === 'waiting' && state.pause.quantity)
        return setInterfaceQuantity(state, input.value);
      if (input.type === 'random' && cid === 0x22 && state.execution.status === 'waiting') {
        if (!Number.isInteger(input.value) || input.value < 0 || input.value > 255) throw new RangeError('随机输入须为字节');
        state.randomInputs = [input.value]; return state;
      }
      return execution.advance(state, input);
    },
  };
}
