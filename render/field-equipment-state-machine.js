// @editor-module 装备菜单按携带位置、装备位与确认边推进隔离状态。
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {roleEquipmentStats} from '../core/role-equipment-derived.js';

const FIELD_EQUIPMENT_EVIDENCE = 'project/evidence/reverse-engineering/field-equipment-state-machine/observations.json';
const HUMAN = 'human-equipment', VEHICLE = 'vehicle-equipment-shells';
const roots = new Set([`${HUMAN}.list`, `${HUMAN}.actor-select`, `${VEHICLE}.parts`, `${VEHICLE}.detail`]);
const shell = `${VEHICLE}.shells`;
const aliases = {[`${HUMAN}.actor-select`]: `${HUMAN}.list`, [`${VEHICLE}.detail`]: `${VEHICLE}.parts`};
const isEquipment = id => id?.startsWith(`${HUMAN}.`) || id?.startsWith(`${VEHICLE}.`);
const owner = state => state.context.kind === 'vehicle' ? VEHICLE : HUMAN;
const root = state => state.context.kind === 'vehicle' ? `${VEHICLE}.parts` : `${HUMAN}.list`;
const suffix = state => state.node.split('.').at(-1);

export function addFieldEquipmentGraph(nodes, dispatch, catalog, add) {
  for (const definition of catalog.interfaces.filter(row => [HUMAN, VEHICLE].includes(row.id))) {
    for (const state of definition.states) {
      const previews = dispatch.previews.filter(row => row.interface_state_id === (aliases[state.id] || state.id));
      for (const preview of previews) {
        const id = preview.interface_entry_id || state.id;
        nodes.set(id, {id, stateId: state.id, entryId: preview.interface_entry_id || null,
          pageId: definition.id, preview, label: state.entry_routes?.find(row => row.id === id)?.label || state.label,
          input: 'A 确认 / B 返回', regions: []});
      }
    }
  }
  const edge = (from, to, input, kind, condition = '') => add(from, to, input, {kind, condition}, false, FIELD_EQUIPMENT_EVIDENCE);
  for (const id of roots) {
    edge(id, `${HUMAN}.action-select`, 'A · 人物', 'equipment-actor', '人物携带栏非空');
    edge(id, `${VEHICLE}.action-select`, 'A · 战车', 'equipment-actor', '同行自有战车');
    edge(id, null, 'B · 返回行走', 'return');
  }
  for (const prefix of [HUMAN, VEHICLE]) {
    for (const action of ['equip', 'transfer', 'drop']) edge(`${prefix}.action-select`,
      `${prefix}.${action === 'drop' ? 'drop' : action}-items`, `A · ${action === 'equip' ? '装备' : action === 'transfer' ? '交给' : '扔'}`, 'equipment-action');
    edge(`${prefix}.action-select`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'B · 对象选择', 'equipment-return');
    for (const action of ['equip', 'transfer', 'drop']) edge(`${prefix}.${action}-items`, `${prefix}.action-select`,
      action === 'equip' && prefix === VEHICLE ? 'B · 提交装备标记' : 'B · 动作选择', 'equipment-return');
    edge(`${prefix}.transfer-items`, `${prefix}.transfer-target`, 'A · 接收者', 'equipment-transfer-select');
    edge(`${prefix}.transfer-target`, `${prefix}.transfer-items`, 'B · 取消转交', 'equipment-cancel');
    edge(`${prefix}.transfer-target`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 转交', 'equipment-transfer');
    edge(`${prefix}.drop-items`, `${prefix}.drop-confirm`, 'A · 丢弃确认', 'equipment-drop-select');
    edge(`${prefix}.drop-confirm`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 是 / 提交丢弃', 'equipment-drop');
    edge(`${prefix}.drop-confirm`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 否 / B · 取消', 'equipment-cancel');
  }
  edge(`${HUMAN}.equip-items`, `${HUMAN}.result`, 'A · 装备 / 卸下', 'human-equipment');
  edge(`${HUMAN}.result`, `${HUMAN}.result`, 'A · 装备 / 卸下', 'human-equipment');
  edge(`${HUMAN}.result`, `${HUMAN}.action-select`, 'B · 动作选择', 'equipment-return');
  edge(`${VEHICLE}.equip-items`, `${VEHICLE}.equip-items`, 'A · 部件装备 / 卸下', 'vehicle-equipment');
  edge(`${VEHICLE}.equip-items`, `${VEHICLE}.weapon-mount-select`, 'A · 武器位置', 'vehicle-mount');
  edge(`${VEHICLE}.weapon-mount-select`, `${VEHICLE}.equip-items`, 'A · 装备武器', 'vehicle-mount-assign');
  edge(`${VEHICLE}.weapon-mount-select`, `${VEHICLE}.equip-items`, 'B · 取消位置选择', 'equipment-cancel');
  edge(shell, null, 'A / B · 返回行走', 'return');
  for (const node of nodes.values()) if (isEquipment(node.id)) edge(node.id, node.id, '方向 · 选择', 'selection');
}

export function fieldEquipmentExecution({get, enter, restore, block, entries, selection, items = [], masks, choiceLabel}) {
  const item = id => items.find(row => row.id === id);
  const put = (state, path, value) => {
    const field = `save.slot.${state.context.slot}.${path}`, before = structuredClone(state.fields[field]);
    state.fields[field] = structuredClone(value);
    state.execution.trace.push({effect: 'equipment', field, before, after: structuredClone(value), evidence: FIELD_EQUIPMENT_EVIDENCE});
  };
  const rolePath = (state, id = state.context.role) => `role.${SERVICE_ROLES[id]}`;
  const vehiclePath = (state, id = state.context.vehicle) => `vehicle.${id}`;
  const inventory = state => state.context.kind === 'vehicle'
    ? SERVICE_PARTS.flatMap((part, column) => {
      const path = vehiclePath(state), id = get(state, `${path}.equipment.${part}`);
      return id ? [{id, column, condition: get(state, `${path}.equipment_state.${part}`),
        assigned: get(state, `${path}.equipped.${part}`) ? part : null}] : [];
    }) : Array.from(get(state, `${rolePath(state)}.equipment`)).flatMap((id, column) => id ? [{id, column}] : []);
  const carried = state => state.execution.equipmentDraft || inventory(state);
  const pairedActors = state => [
    ...SERVICE_ROLES.flatMap((role, id) => get(state, `role.${role}.present`) ? [{kind: 'role', id, position: id * 2}] : []),
    ...Array.from(get(state, 'entity_scene_object_slots') || []).slice(0, 4)
      .flatMap((id, index) => id < 11 ? [{kind: 'vehicle', id, position: index * 2 + 1}] : []),
  ].sort((a, b) => a.position - b.position);
  const mounts = state => SERVICE_PARTS.slice(0, 3).filter(part =>
    item(carried(state)[state.context.equipment_index]?.id)?.mountable_slots?.includes(part)
      && get(state, `${vehiclePath(state)}.mount_permission.${part}`));
  const list = (state, group) => {
    if (!isEquipment(state.node)) return null;
    if (state.execution.equipmentResponse) return [];
    if (roots.has(state.node) || state.node === shell) return pairedActors(state).filter(row => state.node !== shell || row.kind === 'vehicle');
    if (suffix(state) === 'transfer-target') return pairedActors(state)
      .filter(row => row.kind === state.context.kind).map(row => ({...row, position: row.kind === 'role' ? row.id : row.position}));
    if (suffix(state) === 'weapon-mount-select') return mounts(state).map((part, position) => ({part, position,
      label: ['主炮', '副炮', 'S-E'][SERVICE_PARTS.indexOf(part)]}));
    if (suffix(state).endsWith('-items') || suffix(state) === 'result') return carried(state).map((row, position) => ({...row,
      position: state.context.kind === 'role' ? row.column : position,
      label: `${item(row.id)?.label || `物品 ${row.id}`} · ${row.assigned || state.context.kind === 'role'
        && (get(state, `${rolePath(state)}.slot_flags`) & masks.descending_bit_masks[row.column]) ? '已装备' : '携带'}`}));
    return group?.choices.map(row => ({...row, position: row.index,
      label: choiceLabel?.(row.label_reference) || row.visible_text})) || [];
  };
  const select = (state, row) => {
    if (!isEquipment(state.node)) return;
    if (roots.has(state.node) || state.node === shell) {
      Object.assign(state.context, {kind: row.kind, [row.kind]: row.id, actor: `save-${row.kind}:${row.id}`});
      if (roots.has(state.node)) {
        state.node = row.kind === 'vehicle' ? `${VEHICLE}.parts` : `${HUMAN}.list`;
        state.control = state.node;
      }
    }
    if (suffix(state).endsWith('-items') || suffix(state) === 'result') state.context.equipment_index = state.context.kind === 'role' ? row.column : row.position;
  };
  const stats = (state, id = state.context.role) => {
    const path = rolePath(state, id);
    const values = Object.fromEntries(['strength', 'speed', 'vitality', 'equipment', 'slot_flags'].map(key => [key, get(state, `${path}.${key}`)]));
    const result = roleEquipmentStats(values, id => {
      const value = item(id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
      if (!Number.isInteger(value)) throw new TypeError('人物装备攻防数值未确认');
      return value;
    });
    for (const key of ['attack', 'defense']) put(state, `${path}.${key}`, result[key]);
  };
  const removeRole = (state, column) => {
    const path = rolePath(state), ids = [...get(state, `${path}.equipment`)];
    ids.splice(column, 1); ids.push(0);
    const flags = get(state, `${path}.slot_flags`), tail = masks.descending_equipment_masks[column];
    if (!Number.isInteger(tail)) return block(state, '人物装备移位掩码未确认');
    put(state, `${path}.equipment`, ids);
    put(state, `${path}.slot_flags`, ((flags << 1) & tail) | (flags & (tail ^ 255)));
    stats(state);
  };
  const writeVehicle = (state, rows, vehicle = state.context.vehicle, {repack = false} = {}) => {
    const slots = Array.from({length: 8}, () => null), pending = structuredClone(rows);
    if (repack) for (const part of SERVICE_PARTS.slice(0, 6)) {
      for (let index = pending.length - 1; index >= 0; index--) if (pending[index].assigned === part) {
        slots[SERVICE_PARTS.indexOf(part)] = pending[index]; pending[index] = {id: 0};
      }
    }
    for (const row of pending.filter(row => row.id)) {
      const column = repack ? slots.findIndex(row => !row) : row.column;
      if (column >= 0) slots[column] = row;
    }
    const path = vehiclePath(state, vehicle);
    let mask = 0;
    for (const [column, part] of SERVICE_PARTS.entries()) {
      const row = slots[column], equipped = Boolean(row?.id && row.assigned === part);
      if (equipped) mask |= masks.descending_bit_masks[column];
      put(state, `${path}.equipment.${part}`, row?.id || 0);
      put(state, `${path}.equipment_state.${part}`, row?.condition || 0);
      put(state, `${path}.equipped.${part}`, Number(equipped));
    }
    put(state, `${path}.equipped_mask_raw`, mask);
  };
  const feedback = (state, record, next, {commit = null} = {}) => {
    if (next === state.node && suffix(state) === 'equip-items') {
      state.execution.equipmentMessage = {record, column: carried(state)[state.selections.choice]?.column}; return;
    }
    state.execution.equipmentResponse = {record, next, commit, source: state.node,
      selection: structuredClone(state.selections)};
    state.pause = {kind: 'wait'};
  };
  const resetTo = (state, target, choice = 0) => {
    const actor = {kind: state.context.kind, id: state.context[state.context.kind]};
    delete state.execution.equipmentResponse;
    delete state.execution.equipmentMessage;
    delete state.execution.equipmentPending;
    enter(state, target, {push: false});
    const rows = entries(state);
    const index = roots.has(target) ? rows.findIndex(row => row.kind === actor.kind && row.id === actor.id) : choice;
    if (rows.length) selection(state, Math.max(0, Math.min(index, rows.length - 1)));
    if (roots.has(target)) state.returnStack = state.returnStack.filter(row => !isEquipment(row.node));
  };
  const prepare = state => {
    if (!isEquipment(state.node)) return;
    if (suffix(state) === 'equip-items' && state.context.kind === 'vehicle' && !state.execution.equipmentDraft)
      state.execution.equipmentDraft = structuredClone(inventory(state));
  };
  const advance = (state, input) => {
    if (!isEquipment(state.node) || !['a', 'b'].includes(input.type)) return false;
    const kind = suffix(state), chosen = entries(state)[state.selections.choice];
    const response = state.execution.equipmentResponse;
    if (response) {
      const pending = state.execution.equipmentPending;
      if (response.commit === 'drop') {
        if (state.context.kind === 'role') removeRole(state, pending.column);
        else writeVehicle(state, inventory(state).filter(row => row.column !== pending.column), undefined, {repack: true});
      }
      if (response.next === state.node) {
        delete state.execution.equipmentResponse; state.pause = {kind: 'menu'}; state.selections = response.selection;
      } else resetTo(state, response.next);
      return true;
    }
    if (state.node === shell || input.type === 'b' && roots.has(state.node)) {
      state.execution.status = 'returned'; state.windows = []; state.returnStack = []; return true;
    }
    if (input.type === 'b') {
      if (kind === 'equip-items' && state.context.kind === 'vehicle') {
        writeVehicle(state, carried(state), undefined, {repack: true}); delete state.execution.equipmentDraft;
        resetTo(state, `${VEHICLE}.action-select`);
      } else if (kind === 'action-select') {
        delete state.execution.equipmentDraft; resetTo(state, root(state));
      } else if (kind === 'drop-confirm') feedback(state, 'record:02:031', root(state));
      else if (kind === 'result') resetTo(state, `${HUMAN}.action-select`);
      else restore(state);
      return true;
    }
    if (roots.has(state.node)) {
      if (!chosen) return true;
      if (chosen.kind === 'vehicle' && chosen.id >= 8) feedback(state, 'record:02:144', root(state));
      else if (!inventory(state).length) feedback(state, 'record:02:017', root(state));
      else enter(state, `${owner(state)}.action-select`);
    } else if (kind === 'action-select') {
      if (chosen) enter(state, chosen.target_entry_id || chosen.target_state_id);
    } else if (['equip-items', 'result'].includes(kind) && chosen) {
      if (state.context.kind === 'role') {
        const path = rolePath(state), selected = item(chosen.id), flags = get(state, `${path}.slot_flags`);
        if (!selected?.equipment?.roles?.some(row => row.slug === SERVICE_ROLES[state.context.role])) feedback(state, 'record:02:112', state.node);
        else {
          let next = flags | masks.descending_bit_masks[chosen.column];
          for (const row of inventory(state)) if (flags & masks.descending_bit_masks[row.column]
              && item(row.id)?.category?.id === selected.category.id) next ^= masks.descending_bit_masks[row.column];
          put(state, `${path}.slot_flags`, next); stats(state);
          enter(state, `${HUMAN}.result`, {push: false});
          selection(state, entries(state).findIndex(row => row.column === chosen.column));
        }
      } else {
        const draft = state.execution.equipmentDraft, row = draft[state.selections.choice];
        if (item(row.id)?.category?.id === 'tank-chassis') feedback(state, 'record:02:107', state.node);
        else if (row.assigned) {
          row.assigned = null; feedback(state, row.id < 0x75 ? 'record:02:105' : 'record:02:108', state.node);
        } else if (row.id < 0x75) {
          if (!mounts(state).length) feedback(state, 'record:02:112', state.node);
          else enter(state, `${VEHICLE}.weapon-mount-select`);
        } else {
          const part = item(row.id)?.mountable_slots?.[0];
          if (!['c_unit', 'engine'].includes(part)) return block(state, '战车部件装备类别未确认'), true;
          for (const other of draft) if (other.assigned === part) other.assigned = null;
          row.assigned = part; feedback(state, 'record:02:106', state.node);
        }
      }
    } else if (kind === 'weapon-mount-select' && chosen) {
      for (const row of carried(state)) if (row.assigned === chosen.part) row.assigned = null;
      carried(state)[state.context.equipment_index].assigned = chosen.part;
      restore(state); feedback(state, 'record:02:106', state.node);
    } else if (['transfer-items', 'drop-items'].includes(kind) && chosen) {
      state.execution.equipmentPending = structuredClone(chosen);
      if (state.context.kind === 'vehicle' && item(chosen.id)?.category?.id === 'tank-chassis') feedback(state, 'record:02:080', root(state));
      else if (kind === 'drop-items' && item(chosen.id)?.price?.raw_code === 255) feedback(state, 'record:02:110', root(state));
      else enter(state, `${owner(state)}.${kind === 'transfer-items' ? 'transfer-target' : 'drop-confirm'}`);
    } else if (kind === 'transfer-target' && chosen) {
      const pending = state.execution.equipmentPending;
      if (state.context.kind === 'role') {
        const target = rolePath(state, chosen.id), ids = [...get(state, `${target}.equipment`)], count = ids.filter(Boolean).length;
        if (count - Number(chosen.id === state.context.role) === 8) feedback(state, 'record:02:099', root(state));
        else {
          removeRole(state, pending.column);
          const values = [...get(state, `${target}.equipment`)];
          values[values.filter(Boolean).length] = pending.id;
          put(state, `${target}.equipment`, values); stats(state, chosen.id);
          resetTo(state, root(state));
        }
      } else {
        const source = state.context.vehicle, target = vehiclePath(state, chosen.id);
        const rejection = chosen.id >= 8 ? 151 : chosen.id === source ? 152
          : get(state, `${target}.equipment.generic_8`) ? 153 : null;
        if (rejection) feedback(state, `record:02:${String(rejection).padStart(3, '0')}`, root(state));
        else {
          const column = SERVICE_PARTS.findIndex(part => !get(state, `${target}.equipment.${part}`));
          put(state, `${target}.equipment.${SERVICE_PARTS[column]}`, pending.id);
          put(state, `${target}.equipment_state.${SERVICE_PARTS[column]}`, pending.condition);
          put(state, `${target}.equipped.${SERVICE_PARTS[column]}`, 0);
          put(state, `${target}.equipped_mask_raw`, get(state, `${target}.equipped_mask_raw`) & ~masks.descending_bit_masks[column]);
          writeVehicle(state, inventory(state).filter(row => row.column !== pending.column), source, {repack: true});
          resetTo(state, root(state));
        }
      }
    } else if (kind === 'drop-confirm') {
      const yes = state.selections.choice === 0;
      feedback(state, yes ? 'record:02:111' : 'record:02:031', root(state), {commit: yes ? 'drop' : null});
    }
    return true;
  };
  return {evidence: FIELD_EQUIPMENT_EVIDENCE, owns: state => isEquipment(state.node), entries: list, selection: select,
    selectionCount: (state, group) => isEquipment(state.node)
      && ['carried-vehicle-equipment', 'eligible-weapon-mounts'].includes(group?.choice_source?.kind) ? entries(state).length : null,
    prepare, advance};
}

export function fieldEquipmentPreview(preview, state) {
  if (!isEquipment(state.node)) return preview;
  const draft = state.execution.equipmentDraft;
  preview = {...preview, layers: preview.layers.map(layer => ({...layer,
    ...(draft && Array.isArray(layer.save_equipment?.items)
      ? {preview_equipment_assignments: draft.map(row => row.assigned == null ? null : SERVICE_PARTS.indexOf(row.assigned))} : {}),
    ...(layer.vehicle_mount_candidates ? {vehicle_mount_candidates: {...layer.vehicle_mount_candidates,
      vehicle: state.context.vehicle, ...(draft ? {assignments: draft.map(row => ({id: row.id, part: row.assigned}))} : {})}} : {}),
  }))};
  const response = state.execution.equipmentResponse;
  const message = response || state.execution.equipmentMessage;
  if (!message) return preview;
  const pending = response ? state.execution.equipmentPending : message;
  const body = preview.layers.findLast(layer => layer.kind === 'script');
  return {...preview, ...(response ? {selection_cursor: null} : {}), layers: preview.layers.map(layer => layer === body
    ? {...layer, record: message.record, cursor: 654, line_origin: 14, dialogue_runtime: true,
      save_party_names: null, inline_confirm: false, human_equipment_result: null,
      ...(pending ? {runtime_save_item: {field_id: state.context.kind === 'role'
        ? `save.slot.${state.context.slot}.role.${SERVICE_ROLES[state.context.role]}.equipment`
        : undefined, ...(state.context.kind === 'vehicle' ? {field_ids: SERVICE_PARTS.map(part =>
          `save.slot.${state.context.slot}.vehicle.${state.context.vehicle}.equipment.${part}`)} : {}),
        index: pending.column, index_context: null}} : {})} : layer)};
}
