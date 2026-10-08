// @editor-module 多层服务共用应用执行、选择布局与数量协议。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {listQuantityFields} from './list-quantity-service-fields.js';
import {supplyShellDomain} from './supply-shell-execution.js';
import {storageServiceDomain} from './storage-service-execution.js';
import {setInterfaceQuantity} from './interface-quantity-input.js';
import {LIST_QUANTITY_EVIDENCE} from './list-quantity-service-model.js';

export function listQuantityServiceExecution({command, graph, text, navigation, ...data}) {
  const cid = command.command_id, fields = listQuantityFields(data);
  const execution = interfaceApplicationExecution({command, graph, text, evidence: LIST_QUANTITY_EVIDENCE,
    domain: helpers => {
      const domain = cid === 0x26 ? storageServiceDomain(fields, helpers) : supplyShellDomain(cid, fields, data, helpers);
      const options = state => state.pause.kind === 'choice' ? ['是', '否']
        : state.pause.kind === 'menu' ? domain.menus(state) : [];
      const selectorName = state => state.pause.selector === 1 ? 'actors'
        : cid === 0x26 ? state.control === 16 ? 'category' : state.control === 49 ? 'storage' : 'inventory'
        : [18, 22].includes(state.control) ? 'weapon' : state.control === 44 ? 'shell'
        : state.control === 7 ? 'goods' : null;
      return {
        options, acceptEmptyMenu: domain.quantityMenu,
        exports: {saleIndex: domain.saleIndex, inventoryKind: domain.inventoryKind},
        initial: {weapon: 0, weaponChoice: 0, receiverKind: 0, supplyKind: 0, stored: 0, storagePage: 0, quote: 0},
        fallthrough: (state, segment) => segment.terminator?.reason === 'application-vm-indexed-segment-table-end'
          ? state.execution.choice : 0,
        operate(state, operation, segment) {
          try {domain.operate(state, operation, segment);}
          catch (error) {helpers.block(state, error.message);}
        },
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state, event) {
          state.pause.selector = event.operation?.operands[0];
          state.pause.quantity = domain.quantityMenu(state);
          const index = state.pause.kind === 'choice' ? 0 : state.pause.selector === 1 ? state.selections.object ?? 0
            : cid === 0x26 ? state.control === 16 ? state.execution.category : state.control === 19 ? state.execution.sale
              : state.control === 49 ? state.execution.stored : 0
            : [18, 22].includes(state.control) ? state.execution.weaponChoice : state.control === 44 ? state.execution.sale
            : state.control === 7 ? state.execution.goods : state.execution.choice;
          state.selections.choice = Math.min(index, Math.max(0, options(state).length - 1));
          if (state.pause.kind === 'menu' && !state.pause.quantity) domain.select(state, state.selections.choice);
        },
        select(state, index, input) {
          if (input) state.execution.branch = input.type === 'b' ? 1 : 0;
          if (state.pause.kind === 'menu' && !state.pause.quantity && input?.type !== 'b') domain.select(state, index);
        },
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const name = selectorName(state), paired = name === 'actors';
          const ids = paired ? domain.actors?.(state) || fields.vehicles(state) : null;
          const positions = paired ? ids.map((id, index) => cid === 0x26 && state.execution.receiverKind ? id * 2 : index * 2 + 1) : null;
          const selector = name ? navigation.selectors[name] : state.execution.menuSelector;
          const old = paired ? positions[state.selections.choice] : state.selections.choice;
          if (cid === 0x26 && state.control === 49 && (old >= 8
              || count > 8 && (old === 0 && direction === 1 || old === 7 && direction === 2))) {
            helpers.block(state, '保管列表跨页方向节流未确认；可直接选择当前保管物'); return old;
          }
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector, selection_index: old, selection_count: paired ? 8 : Math.min(count, 8), direction_index: direction}, navigation);
          if (result.status !== 'available') {helpers.block(state, '当前选择布局的方向输入未确认'); return state.selections.choice;}
          let next = result.state.selection_index;
          if (paired && !positions.includes(next)) {
            if (direction === 3) next++;
            else if (direction === 4) next--;
            else while (next >= 0 && next < 8 && !positions.includes(next)) next += direction === 1 ? -2 : 2;
            if (!positions.includes(next)) next = old;
          }
          return paired ? positions.indexOf(next) : next;
        },
      };
    }});
  return {...execution, advance(state, input) {
    if (input.type === 'amount' && state.execution.status === 'waiting' && state.pause.quantity)
      return setInterfaceQuantity(state, input.value);
    return execution.advance(state, input);
  }};
}
