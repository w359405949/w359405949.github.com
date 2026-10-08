// @editor-module 商店输入按共享脚本与已确认领域效果推进隔离快照。
import {interfaceApplicationExecution} from './interface-application-execution.js';
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {currentVehicleEquipmentLoad} from '../core/vehicle-equipment-load.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';

const evidence = 'project/evidence/reverse-engineering/generic-shop-input/observations.json';
const hex = value => value.toString(16).toUpperCase().padStart(2, '0');

export function genericShopExecution({command, graph, text, goods, items, ammunition, navigation}) {
  const kind = command.command_id - 0x10, vehicle = kind < 2;
  return interfaceApplicationExecution({command, graph, text, evidence, domain: ({block, branch}) => {
  const item = id => items.find(row => row.id === id);
  const prefix = state => `save.slot.${state.context.slot}.`;
  const get = (state, suffix) => {
    const id = prefix(state) + suffix;
    if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
    return state.fields[id];
  };
  const put = (state, suffix, value) => {state.fields[prefix(state) + suffix] = structuredClone(value);};
  const party = state => vehicle ? [...get(state, 'entity_scene_object_slots').slice(0, 4)].filter(id => id < 128)
    : SERVICE_ROLES.flatMap((role, index) => get(state, `role.${role}.present`) ? [index] : []);
  const object = state => vehicle ? `vehicle.${state.context.vehicle}` : `role.${SERVICE_ROLES[state.context.role]}`;
  const equipment = (state, category) => vehicle
    ? (category === 0 ? SERVICE_PARTS.map(part => get(state, `${object(state)}.equipment.${part}`))
      : Array.from({length: 8}, (_, index) => get(state, `${object(state)}.item.${index}`)))
    : [...get(state, `${object(state)}.${category === 0 ? 'equipment' : 'inventory'}`)];
  const setEquipment = (state, category, values) => {
    if (vehicle) values.forEach((id, index) => put(state,
      `${object(state)}.${category === 0 ? `equipment.${SERVICE_PARTS[index]}` : `item.${index}`}`, id));
    else put(state, `${object(state)}.${category === 0 ? 'equipment' : 'inventory'}`, values);
  };
  const selectObject = (state, index) => {
    const ids = party(state);
    if (!ids.length) throw new TypeError('当前队伍没有可选对象');
    state.context[vehicle ? 'vehicle' : 'role'] = ids[index];
    state.selections.object = index;
  };
  const currentItem = state => item(state.execution.item);
  const saleEntries = state => {
    const values = equipment(state, state.execution.category);
    if (vehicle && state.execution.category === 0)
      return values.map((id, index) => ({id, index})).filter(row => row.id);
    const end = values.indexOf(0);
    return values.slice(0, end < 0 ? values.length : end).map((id, index) => ({id, index}));
  };
  const operate = (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if (op === 0xDB) return branch(state, segment, party(state).length === 1 ? 0 : 1);
    if (op === 0xE0) return branch(state, segment, vehicle ? 0 : 1);
    if (op === 0xDF) return branch(state, segment,
      SERVICE_ROLES.some(role => get(state, `role.${role}.present`) & 0x80) ? 1 : 0);
    if (op === 0xDC) {
      const price = currentItem(state)?.price;
      if (!price?.available || !Number.isInteger(price.value)) return block(state, '当前商品报价未确认');
      e.quote = price.value; e.moneyAfter = get(state, 'gold') - e.quote;
      return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
    }
    if (op === 0xBB) {e.branch = vehicle && state.context.vehicle >= 8 ? 1 : 0; return;}
    if (op === 0xE4) {
      const flags = currentItem(state)?.equipment?.raw_flags;
      const eligible = kind & 1 || vehicle && e.item >= 0x75 ? true
        : Number.isInteger(flags) ? Boolean(flags & (vehicle ? get(state, `${object(state)}.mount_mask_raw`)
          : 0x80 >> state.context.role)) : null;
      if (eligible === null) return block(state, '当前商品装备资格未确认');
      return branch(state, segment, eligible ? 0 : 1);
    }
    if (op === 0xBA) {e.branch = equipment(state, kind & 1).at(-1) ? 1 : 0; return;}
    if (op === 0xDE) {
      const index = vehicle ? state.context.vehicle : state.context.role;
      if (index > 2) return block(state, '死亡检查索引超出已确认的三个人物状态字段');
      return branch(state, segment, get(state, `role.${SERVICE_ROLES[index]}.dead`) ? 1 : 0);
    }
    if (op === 0xC8) {
      e.choice = 0;
      if ([13, 21].includes(segment.index)) selectObject(state, 0);
      if (segment.index === 35) e.sale = 0;
      return;
    }
    if (op === 0x99) {
      if (!goods.length) return block(state, '商品配置零计数的原生复制会回绕，输入域未确认');
      e.branch = goods.length >= 5 ? 1 : 0; e.goods = 0;
      e.goodsPage = {first: 0, position: 0, savedPosition: 0, last: goods.length - 1}; return;
    }
    if (op === 0x9A) {e.item = goods[e.goods]; e.goodsPage.savedPosition = state.selections.choice; return;}
    if (op === 0x9B) {e.choice = e.goods; return;}
    if (op === 0xC3) {e.objectList = segment.index; return;}
    if (op === 0xBF) {e.category = 0; e.sale = 0; e.savedCategory = 0; return;}
    if (op === 0x93) {e.category = e.savedCategory; e.sale = 0; return;}
    if (op === 0xB3) return;
    if (op === 0xD9) {e.savedCategory = e.category; return branch(state, segment, saleEntries(state).length ? 1 : 0);}
    if (op === 0xB5) {
      const slots = saleEntries(state);
      e.saleSlot = slots[e.sale]?.index; e.item = slots[e.sale]?.id;
      const price = currentItem(state)?.price;
      if (!price || !Number.isInteger(price.raw_code)) return block(state, '当前出售物品价格码未确认');
      e.branch = price.raw_code >= 0xE0 ? 0 : 1;
      if (e.branch) {
        if (!price.available || !Number.isInteger(price.value)) return block(state, '当前出售报价未确认');
        e.quote = Math.floor(price.value / 2);
      }
      return;
    }
    if (op === 0xEA) {
      if (e.item >= 0x91 && e.item <= 0x98) return branch(state, segment, 1);
      if (vehicle && e.category === 0) {
        if (e.item >= 0x75 && e.item <= 0x90) return block(state, '核心部件禁售的完整传递条件未确认');
        if (get(state, `${object(state)}.equipped_mask_raw`) & (0x80 >> e.saleSlot)) return branch(state, segment, 1);
      } else if (!vehicle && e.category === 0
        && get(state, `${object(state)}.slot_flags`) & (0x80 >> e.saleSlot)) return branch(state, segment, 1);
      return branch(state, segment, 0);
    }
    if (op === 0x9C) {
      if (vehicle && kind === 0) {
        const code = currentItem(state)?.equipment?.battle_effect_code;
        if (!Number.isInteger(code) || !Number.isInteger(ammunition[code & 7]))
          return block(state, '设备初始状态未确认，不能提交交易');
      }
      if (equipment(state, kind & 1).indexOf(0) < 0) return block(state, '接收栏空位不变量不成立');
      put(state, 'gold', e.moneyAfter); return;
    }
    if (op === 0x9D) {
      const values = equipment(state, kind & 1), index = values.indexOf(0);
      if (index < 0) return block(state, '物品提交缺少接收空位');
      values[index] = e.item; setEquipment(state, kind & 1, values);
      if (vehicle && kind === 0) put(state, `${object(state)}.equipment_state.${SERVICE_PARTS[index]}`,
        ammunition[currentItem(state).equipment.battle_effect_code & 7]);
      e.transactions.push({type: 'buy', item: e.item, quote: e.quote, object: object(state), index}); return;
    }
    if (op === 0xAE || op === 0xB4) return block(state, '出售提交的完整移位、装备重算与事件效果未确认');
    if (op === 0xD4) {e.choice = 0; return;}
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA797) {
        if (!goods.length) return block(state, '商品配置零计数的原生复制会回绕，输入域未确认');
        e.shopKind = kind; e.objectKind = kind & 2; e.shopGoods = [...goods]; return;
      }
      if (callback === 0xA915) {e.eligibilityMarkers = [0, 0, 0, 0]; return;}
      if ([0xEEBC, 0xEEC5].includes(callback)) return;
      if (callback === 0xA9F2) {
        if (kind & 1) {e.branch = 0; return;}
        const extra = currentItem(state)?.tank_weight?.internal_units;
        const load = currentVehicleEquipmentLoad({read: suffix => get(state, `${object(state)}.${suffix}`), items, extra});
        if (!load) return block(state, '当前设备重量或引擎容量未确认');
        e.branch = Number(load.overloaded);
        e.load = load; return;
      }
    }
    block(state, `原生 ${hex(op)} 的此调用效果未确认`);
  };
  const options = state => {
    if (state.execution?.status !== 'waiting') return [];
    if (state.pause.kind === 'choice') return ['是', '否'];
    if (state.pause.kind !== 'menu') return [];
    if (state.control === 1) return ['购买', '出售', '退出'];
    if (state.control === 6) return goods.map(id => `物品 ${hex(id)}`);
    if ([14, 22].includes(state.control)) return party(state).map(id => vehicle ? `战车 ${id + 1}` : ['猎人', '机械师', '战士'][id]);
    if (state.control === 25) return ['装备', '道具'];
    if (state.control === 29) return saleEntries(state).map(row => `物品 ${hex(row.id)}`);
    return [];
  };
  const directionChoice = (state, direction, count) => {
    if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
    const actors = [14, 22].includes(state.control);
    const selector = navigation?.selectors[state.control];
    const positions = actors ? party(state).map(id => vehicle
      ? get(state, 'entity_scene_object_slots').indexOf(id) * 2 + 1 : id * 2) : null;
    const old = actors ? positions[state.selections.choice] : state.selections.choice;
    const profile = navigation?.selectionLayout?.profiles[navigation.selectionLayout.selectors.find(row => row.selector === selector)?.profile];
    if (state.control === 6 && profile && count > profile.capacity
      && (old >= profile.capacity || direction === 2 && old === profile.capacity - 1)) {
      block(state, '商品滚动超出已确认的选择布局，完整续接未确认');
      return state.selections.choice;
    }
    const result = executeFacilityWindowRoutine(navigation?.catalog, 'window-F1F9', {
      selector, selection_index: old, selection_count: actors ? 8 : count, direction_index: direction,
    }, navigation);
    if (result.status !== 'available') {
      block(state, `当前选择布局的方向输入未确认：${result.missing.join('、')}`);
      return state.selections.choice;
    }
    let next = result.state.selection_index;
    if (!actors && next >= profile.capacity) {
      block(state, '商品滚动超出已确认的选择布局，完整续接未确认');
      return state.selections.choice;
    }
    if (actors && !positions.includes(next)) {
      if (direction === 4) next--;
      else if (direction === 1 || direction === 2) {
        while (next >= 0 && next < 8 && !positions.includes(next)) next += direction === 1 ? -2 : 2;
      } else next = old;
      if (!positions.includes(next)) next = old;
    }
    return actors ? positions.indexOf(next) : next;
  };
  return {options, operate, directionChoice,
    exports: {saleIndex: state => saleEntries(state)[state.execution.sale]?.index ?? 0},
    fallthrough: (state, segment) => segment.index === 3 ? state.execution.choice : 0,
    pauseNode(state, event) {
      const candidates = graph.nodes.filter(row => row.segment.index === state.control && row.pause.ordinal === event.ordinal);
      return candidates.find(row => row.id.includes('-') && row.response?.segment === state.execution.response)
        || candidates.find(row => !row.id.includes('-'));
    },
    preparePause(state, event, segment) {
      state.selections.choice = event.type === 'menu' ? [6, 29].includes(segment.index)
        ? state.execution[segment.index === 6 ? 'goods' : 'sale']
        : [14, 22].includes(segment.index) ? state.selections.object ?? 0 : 0 : 0;
    },
    select(state, index, input) {
      if (state.control === 6) state.execution.goods = index;
      if (state.control === 25) state.execution.category = index;
      if (state.control === 29) state.execution.sale = index;
      if ([14, 22].includes(state.control) && (!input || input.type === 'a')) selectObject(state, index);
    },
  };
  }});
}
