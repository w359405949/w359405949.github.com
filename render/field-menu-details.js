// @editor-module 概览滚动与金铃数字按原生输入协议推进隔离字段。
import {SERVICE_PARTS} from '../core/service-preview-state.js';
import {storagePreviewEntries} from '../core/storage-preview-entries.js';

export const FIELD_MENU_DETAILS_EVIDENCE = 'project/evidence/reverse-engineering/field-menu-details/observations.json';
const GOLD = 'field-command-menu.gold-amount';
const BOX = 'vehicle-status.overview-box', DAMAGE = 'vehicle-status.overview-damage';

export function fieldMenuDetails({get, block, restore}) {
  const put = (state, suffix, value) => {
    const field = `save.slot.${state.context.slot}.${suffix}`, before = state.fields[field];
    if (before === undefined) throw new TypeError(`预览缺少字段：${field}`);
    state.fields[field] = value;
    state.execution.trace.push({effect: 'field-menu-detail', field, before, after: value, evidence: FIELD_MENU_DETAILS_EVIDENCE});
  };
  const adventure = state => {
    restore(state, 'field-command-menu.adventure-data');
    state.selections = {choice: 0, position: 0};
  };
  const stored = state => storagePreviewEntries({object: id => ({value: state.fields[id]})}, state.context.slot, {sorted: true});
  const rows = state => {
    if (state.node === BOX) return stored(state).filter(row => row.id).map(row => ({label: `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`}));
    if (state.node !== DAMAGE) return null;
    return Array.from({length: 8}, (_, vehicle) => {
      const damaged = SERVICE_PARTS.filter(part => get(state, `vehicle.${vehicle}.equipment_state.${part}`) & 0xC0);
      return damaged.length ? [{label: `战车 ${vehicle + 1}`}, ...damaged.map(part => ({label: part}))] : [];
    }).flat();
  };
  const entries = state => {
    const list = rows(state);
    return list?.slice(state.context.first_row ?? 0, (state.context.first_row ?? 0) + 8)
      .map((row, position) => ({...row, position}));
  };
  const prepare = state => {
    if (state.node === GOLD) {
      state.execution.goldDigits = String(get(state, 'gold_bell_threshold')).padStart(7, '0').split('').map(Number);
      delete state.execution.goldResult;
    }
    if ([BOX, DAMAGE].includes(state.node)) {
      state.context.first_row = 0;
      state.execution.overviewScrollGate = false;
    }
    if (state.node === BOX) {
      const list = stored(state);
      list.forEach((row, index) => {
        put(state, `property_storage.item.${index}`, row.id);
        put(state, `property_storage.paired_condition.${index}`, row.condition);
      });
      if (list.every(row => row.id)) block(state, 'G2：满 64 槽首零扫描的数组外字段仍未确认');
    }
  };
  const advance = (state, input) => {
    if (state.node === GOLD) {
      if (state.execution.goldResult) {
        if (['a', 'b'].includes(input.type)) {delete state.execution.goldResult; adventure(state);}
        return true;
      }
      if (input.type === 'b') {adventure(state); return true;}
      if (input.type === 'a') {
        put(state, 'adventure_data_settings', get(state, 'adventure_data_settings') | 0x80);
        put(state, 'gold_bell_threshold', Number(state.execution.goldDigits.join('')));
        state.execution.goldResult = true;
        for (const window of state.windows) {
          if (!window.content.some(layer => layer.gold_bell_digits)) continue;
          window.content = fieldMenuDetailsPreview({layers: window.content}, state).layers;
          window.retention = 'replaced';
        }
        return true;
      }
      if (['up', 'down'].includes(input.type)) {
        const digit = state.selections.position;
        state.execution.goldDigits[digit] = (state.execution.goldDigits[digit] + (input.type === 'up' ? 1 : 9)) % 10;
        return true;
      }
      return false;
    }
    const list = rows(state);
    if (!list) return false;
    if (input.type === 'a') {
      if (state.node === BOX) block(state, '后备箱 A 切换损坏设备处理器；共享列表的重画解释未接入');
      return true;
    }
    if (!['up', 'down', 'left', 'right'].includes(input.type)) return false;
    let first = state.context.first_row ?? 0, position = state.selections.position;
    const scroll = step => {
      if (state.execution.overviewScrollGate) state.execution.overviewScrollGate = false;
      else {first += step; state.execution.overviewScrollGate = true;}
    };
    if (input.type === 'up') {
      if (position) {position--; state.execution.overviewScrollGate = false;}
      else if (first) scroll(-1);
    }
    if (input.type === 'down') {
      if (position < (list.length ? Math.min(7, list.length - 1) : 7)) {
        position++; state.execution.overviewScrollGate = false;
      } else if (first + 8 < list.length) scroll(1);
    }
    state.context.first_row = first;
    state.selections = {choice: position, position};
    return true;
  };
  return {entries, prepare, advance};
}

export function fieldMenuDetailsPreview(preview, state) {
  if (state.execution.partDetail) return {...preview, selection_cursor: null,
    layers: [...preview.layers, {kind: 'vehicle_part_detail_clear'},
      {kind: 'layout', vehicle_part_detail_frame: true},
      {kind: 'script', cursor: 0, glyph_pixel_y_offset: -4,
        vehicle_part_detail: true}]};
  if (state.node !== GOLD || !state.execution.goldDigits) return preview;
  if (!state.execution.goldResult) return {...preview, layers: preview.layers.map(layer => layer.gold_bell_digits
    ? {...layer, gold_bell_digit_values: [...state.execution.goldDigits]} : layer)};
  return {...preview, selection_cursor: null, layers: preview.layers.map(layer => layer.gold_bell_digits
    ? {kind: 'script', record: layer.record, gold_bell_result: true, cursor: layer.cursor, line_origin: layer.line_origin,
      glyph_pixel_y_offset: layer.glyph_pixel_y_offset, dialogue_runtime: true,
      provider_save_values: {14: `save.slot.${state.context.slot}.gold_bell_threshold`}}
    : layer)};
}
