import { textRecordComponents, textRecordEditorTokens, fieldSubmenuCodeValues, db, itemNameRecordId, fieldSubmenuCodeValue, vehicleTradeDecision, facilityRuntimeCodeValues, SIMPLE_SERVICE_COMMANDS, LIST_QUANTITY_COMMANDS, SPECIAL_SERVICE_COMMANDS, textRecordRuntimeWritableRanges } from './prg-loaders-DnCSmXk9.js';
import { InterfacePreviewSession, interfacePreviewState, hydrateModuleComponents, esc, currentTextReference } from './interface-state-preview-Dlotqlmn.js';
import { state } from './emulator-Bpa8EsFw.js';
import { interfacePreviewContext, bindScreenWorkbenchBottomResize, bindScreenWorkbenchZoom, screenWorkbench, elementTree, screenWorkbenchCanvasStage, rerenderElementTreeKeepingSelectionVisible, replaceHistoryUrl, currentViewUrl } from './element-tree-C1bWRgTl.js';
import { SHOP_PAGES, interfacePageDefinition } from './editor-renderer-n2nBwXk_.js';
import { bindRecordLinks, dataTable } from './battle-result-script-runtime-BSeJpUGH.js';
import { panel } from './record-6_wsSDi2.js';
import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { bindServicePreviewScene, sceneServicePreviewEntries } from './service-preview-scene-CPwiqon9.js';
import { interfaceTextSlot, SERVICE_ROLES, servicePreviewFields, constructServicePreviewState, SERVICE_PARTS, currentVehicleEquipmentLoad, resolveFacilityParameterBindings, interfacePreviewSceneImage, uiConstructionPreviewRegion, paintUiConstructionSemanticPreview, resolveShopMenuPreview, resolveServiceConditionPreview, servicePreviewContext } from './ui-construction-preview-BuoQ5mM6.js';
import { uiImageComponentLabel, uiTextComponentLabel, uiRecordComponentLabel, bindInterfacePreviewScene, interfacePreviewSceneMarkup, createInterfaceStateControllerWorkbench, distinctUiComponentLabels } from './story-component-labels-CSjCRgXX.js';
import { interfaceStateTree, fieldMenuIconNodes, interfacePreviewSaveActorEntries, shopConfigurationPicker, interfacePreviewSlotPicker, interfacePreviewSaveActorPicker, paintFieldMenuIcons, paintInterfaceStateFrame } from './interface-state-frame-ZrXRl0fR.js';
import { facilityConfigurationLabel } from './configuration-summary-m9SZR_6_.js';
import { bindReferencePicker, updateReferencePickerItems, syncReferencePickerControl, fixedTextEditorMarkup, bindFixedTextEditors, fixedTextRecordRangesWithPadding } from './timeline-player-YCH7Y-3h.js';
import { mountFieldObjectColumns } from './field-object-editor-Blro4OF0.js';
import { interfaceBoundsOverlap, intersectInterfaceBounds, interfaceComponentBounds, interfaceApplicationExecution, inventoryStatusBranch, inventorySaleBranch, inventoryRemoval, creditedGold, commitInventoryRemoval, SIMPLE_SERVICE_EVIDENCE, carriedInventoryCount, genericShopPreview, LIST_QUANTITY_EVIDENCE, SPECIAL_SERVICE_EVIDENCE, genericShopSelection, genericShopPaths, genericShopGraph } from './machine-service-model-B-6y5baD.js';
import { playerTileFromSaveCamera, saveRentalVehicleTemplate, ensureSaveCurrentFieldObjects } from './physical-field-object-windows-DnQmS3eb.js';
import { executeFacilityWindowRoutine } from './battle-result-state-machine-BbK2hSud.js';
import { startDeviceServiceExecution, deviceServicePreview } from './device-service-context-B5xDhK9J.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker } from './components-DbJXuRMn.js';
import './components-DsypHVsJ.js';

// @editor-module 商店适配器提供状态图的领域标签。
const presentation = {namespace: 'generic-shop', dataPrefix: 'generic', exitLabel: '应用返回'};
const genericShopGraphPresentation = graph => ({...presentation,
  count: `${graph.nodes.length} 个状态`});

// @editor-module 组件属性按领域注入的字段引用挂载所属字段对象控件。

async function mountInterfaceWidgetFields(host, bindings, {getObject, isCurrent}) {
  for (const binding of bindings) {
    const object = await getObject(binding.resource, binding.handle);
    if (!isCurrent()) return;
    let target = host;
    if (binding.separate) {target = host.ownerDocument.createElement('div'); host.append(target);}
    if (binding.columns) await mountFieldObjectColumns(target, object, binding.columns);
    else await object.mount(target, binding.options);
    if (!isCurrent()) return;
  }
}

// @editor-module 商店组件声明所属商品、价格与正文的字段控件绑定。
function genericShopWidgetFields(widget, {mode, record, family}) {
  const bindings = [];
  if (widget.region !== 'list' || !(widget.kind === 'layout' || widget.itemSlot != null)
      || !(mode?.startsWith('goods-') || ['herbal-goods', 'decoration-list'].includes(mode))) return bindings;
  if (!widget.price) bindings.push({resource: 'facility-config', handle: record.id,
    ...(widget.itemSlot != null ? {columns: [`slot:${widget.itemSlot}`]} : {options: {sceneInteractionConfiguration: true}})});
  const domain = family.value_namespace?.namespace;
  const slots = widget.itemSlot != null ? [record.slots[widget.itemSlot]] : record.slots;
  if (['item', 'shell'].includes(domain) && (widget.price || widget.kind !== 'text')) {
    for (const id of [...new Set(slots.map(slot => slot.value))]) {
      const hex = Number(id).toString(16).toUpperCase().padStart(2, '0');
      bindings.push({resource: domain === 'item' ? 'item-entry' : 'shell-record',
        handle: domain === 'item' ? `item-entry:item:${hex}` : `shell:${hex}`,
        columns: ['price.raw_code'], separate: true});
    }
  }
  return bindings;
}

// @editor-module 商店组件树引用当前画面的文字、窗口与定长槽位。

async function goodsWidgets(region, components, record, family) {
  if (!['item', 'shell'].includes(family.value_namespace?.namespace)) return [];
  const names = ['shop-goods-page-size', 'shop-goods-origin', 'service-list-row-step', 'shop-goods-row-record'];
  const values = await fieldSubmenuCodeValues(names), read = name => fieldSubmenuCodeValue(values, name);
  const rowRecord = `record:02:${String(read('shop-goods-row-record')).padStart(3, '0')}`;
  if (!components.some(component => component.recordId === rowRecord)) return [];
  const shells = family.value_namespace?.namespace === 'shell' ? await db.getResourceDocument('shell-record') : null;
  const start = Math.min(Math.max(0, (region.preview.runtime_context?.shop_item_index || 0)
    - read('shop-goods-page-size') + 1), record.slots.length - 1);
  return Array.from({length: read('shop-goods-page-size')}, (_, index) => {
    const itemSlot = start + index < record.slots.length ? start + index : null;
    const value = record.slots[itemSlot]?.value;
    const item = state.project.game_data.items.records.find(item => item.id === value);
    const nameRecord = shells ? `record:${shells.name_region.asset_id.split('.').at(-1).toUpperCase()}:${String(value).padStart(3, '0')}`
      : item && itemNameRecordId(item);
    const slot = interfaceTextSlot(`list:goods:${index}`, `商品 ${index + 1}`,
      read('shop-goods-origin') + index * read('service-list-row-step'), {width: 144, pixelYOffset: -8});
    const sources = components.filter(row => row.recordId === nameRecord && interfaceBoundsOverlap(row.bounds, slot.bounds));
    const priceSources = components.filter(row => itemSlot != null && row.recordId === rowRecord && row.offset > 0)
      .flatMap(row => {const bounds = intersectInterfaceBounds(row.bounds, slot.bounds); return bounds ? [{...row, bounds}] : [];});
    return [{...slot, kind: 'group', depth: 2, region: region.id, itemSlot, components: [...sources, ...priceSources]},
      {id: `${slot.id}:name`, label: '商品名称', kind: 'text', depth: 3, region: region.id,
        itemSlot, bounds: interfaceComponentBounds(sources) || {...slot.bounds, width: 112}, components: sources},
      {id: `${slot.id}:price`, label: '价格', kind: 'dynamic', depth: 3, region: region.id,
        itemSlot, price: true, bounds: interfaceComponentBounds(priceSources) || {...slot.bounds,
          x: slot.bounds.x + 112, width: 32}, components: priceSources}];
  }).flat();
}

async function genericShopWidgets(result, node, record, family) {
  return interfaceStateTree({label: node.label, regions: result?.regions, includeEmpty: false}, async (region, components, ancestors) => {
    const widgets = [];
    const layouts = components.filter(row => row.recordId?.startsWith('record:03:'));

    if (region.id === 'selection') {
      const slots = (region.slots || []).filter(slot => /^submenu-(role|vehicle):/u.test(slot.id)
        && interfaceBoundsOverlap(slot.bounds, region.bounds));
      if (slots.length) {
        for (const slot of slots) {
          const bounds = intersectInterfaceBounds(slot.bounds, region.bounds);
          if (bounds) widgets.push({...slot, bounds, kind: 'dynamic', depth: 2, region: region.id,
            components: components.filter(row => interfaceBoundsOverlap(row.bounds, bounds))});
        }
      } else {
        const preview = state.project.ui.construction.menu_dispatch_data.previews.find(row =>
          row.interface_state_id === 'field-command-menu.main');
        for (const icon of fieldMenuIconNodes(preview)) {
          const bounds = intersectInterfaceBounds(icon.selection.bounds, region.bounds);
          if (bounds) widgets.push({...icon, labelMarkup: null, bounds, depth: 2, region: region.id,
            components: components.filter(row => interfaceBoundsOverlap(row.bounds, bounds))});
        }
      }
      return {layoutComponents: layouts, children: widgets};
    }
    const goods = region.id === 'list' ? await goodsWidgets(region, components, record, family) : [];
    widgets.push(...goods);
    const consumed = new Set(goods.flatMap(widget => widget.components.map(row => row.recordId)));
    const leaves = components.filter((component, index) => !components.slice(index + 1).some(other =>
      other.recordId !== component.recordId && JSON.stringify(other.bounds) === JSON.stringify(component.bounds)));
    const body = [];
    for (const recordId of new Set(leaves.map(component => component.recordId))) {
      if (recordId?.startsWith('record:03:')) continue;
      if (consumed.has(recordId)) continue;
      const record = state.project.text_record_edits?.records?.[recordId];
      const parts = record ? textRecordComponents(record, state.project.text_record_encoding,
        state.project.text_record_edits) : [];
      if (!parts.length) {
        const sources = leaves.filter(row => row.recordId === recordId), bounds = interfaceComponentBounds(sources);
        if (bounds) widgets.push({id: `${region.id}:${recordId || 'image'}`, label: uiImageComponentLabel(recordId),
          kind: 'image', region: region.id, depth: 2, bounds, components: sources});
        continue;
      }
      for (const [index, part] of parts.entries()) {
        const sources = leaves.filter(row => row.recordId === recordId
          && part.ranges.some(range => row.offset >= range.offset && row.offset < range.offset + range.length));
        if (!sources.length) continue;
        const literal = record && textRecordEditorTokens(record, state.project.text_record_encoding,
          state.project.text_record_edits).some(token => token.kind === 'text'
            && part.ranges.some(range => token.offset >= range.offset && token.offset < range.offset + range.length));
        if (region.id === 'dialogue' && literal) {body.push(...sources); continue;}
        const rows = region.id === 'list' || region.id === 'selection'
          ? [...new Set(sources.map(row => row.bounds.y))] : [null];
        for (const [rowIndex, y] of rows.entries()) {
          const rowSources = y == null ? sources : sources.filter(row => row.bounds.y === y);
          const ranges = rowSources.map(row => ({offset: row.offset, length: row.length}));
          widgets.push({id: `${region.id}:${recordId}:${index}:${rowIndex}`, kind: part.kind, depth: 2,
            label: region.id === 'name' && recordId.startsWith('record:11:')
              ? [...ancestors, ...widgets].some(widget => widget.label === '店名') ? '商店类别' : '店名'
              : uiTextComponentLabel(record, {...part, ranges}, region.preview) || uiRecordComponentLabel(recordId),
            region: region.id, bounds: interfaceComponentBounds(rowSources), components: rowSources});
        }
      }
    }
    if (body.length) widgets.push({id: `${region.id}:body`, label: '对话正文', kind: 'text', depth: 2,
      region: region.id, bounds: interfaceComponentBounds(body), components: body});
    for (const slot of region.slots || []) {
      const bounds = intersectInterfaceBounds(slot.bounds, region.bounds);
      if (!bounds) continue;
      const existing = [...ancestors, ...widgets].find(widget => widget.id === slot.id);
      if (existing) {
        existing.bounds = interfaceComponentBounds([{bounds: existing.bounds}, {bounds}]);
        existing.components.push(...components.filter(row => interfaceBoundsOverlap(row.bounds, bounds)));
        continue;
      }
      widgets.push({...slot, bounds, kind: 'dynamic', depth: 2, region: region.id,
        components: components.filter(row => interfaceBoundsOverlap(row.bounds, bounds))});
    }
    return {layoutComponents: layouts, children: widgets};
  });
}

// @editor-module 原型路径条件只覆盖服务预览字段，不写 Working 或存档。

const hex$1 = id => id.toString(16).toUpperCase().padStart(2, '0');

function genericShopParty(command, {fields, context}) {
  const prefix = `save.slot.${context.slot}.`;
  const roles = SERVICE_ROLES.flatMap((role, index) =>
    fields.object(`${prefix}role.${role}.present`).value ? [index] : []);
  const vehicles = [...fields.object(`${prefix}entity_scene_object_slots`).value.slice(0, 4)]
    .filter(vehicle => vehicle < 128);
  return {count: command.command_id <= 0x11 ? vehicles.length : roles.length,
    role: roles.includes(context.role) ? context.role : roles[0] ?? context.role,
    vehicle: vehicles.includes(context.vehicle) ? context.vehicle : vehicles[0] ?? context.vehicle};
}

async function genericShopServicePreview(preview, {path, record, command, final, context,
  readFields, readDocument, readField}) {
  if (!path) return preview;
  const [rawFields, items, stock] = await Promise.all([
    readFields(), readDocument('item-entry'),
    readField('facility-config', record.id, 'slot:0'),
  ]);
  const fields = servicePreviewFields(preview, rawFields);
  const item = stock.value;
  const priceCode = (await readField('item-entry', `item-entry:item:${hex$1(item)}`, 'price.raw_code')).value;
  const price = items.equipment_editor.numeric_codes.find(row => row.raw_code === priceCode)?.value;
  const conditions = [];
  if (path === 'funds') conditions.push({id: 'prototype-money-low', label: '金钱不足：金钱临时设为 0', construct: e => e.put('gold', 0)});
  if (path === 'purchase') {
    if (Number.isSafeInteger(price)) conditions.push({id: 'prototype-money-enough', label: final ? '临时预览金钱提交：扣除当前报价' : '金钱达到当前商品报价',
      construct: e => e.put('gold', Math.max(Number(e.get('gold')), price) - (final ? price : 0))});
    conditions.push({id: 'prototype-capacity', label: '携带栏空位预览', construct: e => {
      if (command.command_id >= 0x12) {
        const suffix = `role.${e.role}.inventory`, values = [...e.get(suffix)];
        if (!values.includes(0)) {values[0] = 0; e.put(suffix, values);}
      } else {
        const suffix = `vehicle.${e.vehicle}.equipment.generic_8`;
        e.put(suffix, 0);
      }
    }});
  }
  if (path === 'refused') {
    const candidates = items.records.filter(row => row.id > 0 && (row.price?.raw_code ?? row.price?.raw ?? 0) >= 0xE0);
    const domain = command.command_id >= 0x12 ? 'human-' : 'tank-';
    const refused = candidates.find(row => row.category?.id?.startsWith(domain)
      && row.category?.id === (domain === 'human-' ? 'human-weapon' : 'tank-main-gun'));
    if (refused) conditions.push({id: 'prototype-refused', label: '所选携带物临时换为价格哨兵物品', construct: e => {
      const index = preview.runtime_context?.sale_item_index ?? 0;
      if (command.command_id >= 0x12) {
        const suffix = `role.${e.role}.${preview.shop_menu.sale_item_bar || 'equipment'}`;
        const values = [...e.get(suffix)]; values[index] = refused.id; e.put(suffix, values);
      } else e.put(`vehicle.${e.vehicle}.equipment.${SERVICE_PARTS[index]}`, refused.id);
    }});
  }
  const result = constructServicePreviewState(preview, {fields, context}, conditions);
  const before = preview.service_preview_state || {values: {}, selection: {}, terminal: {}, conditions: []};
  result.service_preview_state = {values: {...before.values, ...result.service_preview_state.values},
    selection: {...before.selection, ...result.service_preview_state.selection},
    terminal: {...before.terminal, ...result.service_preview_state.terminal},
    conditions: [...before.conditions, ...result.service_preview_state.conditions]};
  return result;
}

// @editor-module 商店输入按共享脚本与已确认领域效果推进隔离快照。

const evidence = 'project/evidence/reverse-engineering/generic-shop-input/observations.json';
const hex = value => value.toString(16).toUpperCase().padStart(2, '0');

function genericShopExecution({command, graph, text, goods, items, ammunition, overlays, effects, navigation}) {
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
      return branch(state, segment, inventoryStatusBranch(index, suffix => get(state, suffix)));
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
      if (!vehicle && e.item >= 0x75 && e.item < 0x99)
        return block(state, '人物栏跨域设备编号的安装标记未确认');
      const mask = vehicle && !e.category ? get(state, `${object(state)}.equipped_mask_raw`) : 0;
      const result = inventorySaleBranch(e.item, mask & (0x80 >> e.saleSlot));
      return branch(state, segment, result);
    }
    if (op === 0x9C) {
      if (vehicle && kind === 0) {
        const code = currentItem(state)?.equipment?.raw_flags;
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
        ammunition[currentItem(state).equipment.raw_flags & 7]);
      e.transactions.push({type: 'buy', item: e.item, quote: e.quote, object: object(state), index}); return;
    }
    if (op === 0xAE) {
      try {
        e.removal = inventoryRemoval({vehicle, object: object(state), category: e.category, index: e.saleSlot,
          read: suffix => get(state, suffix), items, overlays, effects});
        put(state, 'gold', creditedGold(get(state, 'gold'), e.quote));
      } catch (error) {block(state, error.message);}
      return;
    }
    if (op === 0xB4) {
      if (!e.removal) return block(state, '出售删除缺少已核对的库存事务');
      commitInventoryRemoval(state, e.removal, put, object(state)); delete e.removal;
      e.branch = Number(Boolean(saleEntries(state).length)); e.sale = 0;
      e.transactions.push({type: 'sell', item: e.item, quote: e.quote, object: object(state), index: e.saleSlot}); return;
    }
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

// @editor-module 清洗按当前队伍战车清除状态与特殊携带物并记录服务返回。
function washServiceVehicles(fields, slot) {
  return [...fields[`save.slot.${slot}.entity_scene_object_slots`].slice(0, 4)].filter(id => id < 128);
}

function completeVehicleWash(state) {
  const key = suffix => `save.slot.${state.context.slot}.${suffix}`;
  const get = suffix => {
    const id = key(suffix);
    if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
    return state.fields[id];
  };
  const put = (suffix, value) => {state.fields[key(suffix)] = value;};
  const targets = [];
  for (const vehicle of washServiceVehicles(state.fields, state.context.slot)) {
    const prefix = `vehicle.${vehicle}`;
    put(`${prefix}.condition_raw`, 0); put(`${prefix}.acid`, 0);
    const values = Array.from({length: 8}, (_, index) => get(`${prefix}.item.${index}`));
    const removed = values.filter(id => id === 0xDC || id === 0xDD);
    const weight = (get(`${prefix}.chassis_weight`) - 10 * removed.filter(id => id === 0xDD).length) & 0xFFFF;
    const kept = values.filter(id => id !== 0xDC && id !== 0xDD);
    while (kept.length < 8) kept.push(0);
    kept.forEach((id, index) => put(`${prefix}.item.${index}`, id));
    put(`${prefix}.chassis_weight`, weight);
    targets.push({vehicle, removed, weight});
  }
  put('global_event_flag.00', 1);
  state.domainResults.wash = {targets, quote: state.execution.quote, callbackStatus: 'returned',
    evidence: 'project/evidence/reverse-engineering/special-service-round2/observations.json#wash'};
  state.execution.transactions.push({type: 'wash', quote: state.execution.quote, targets});
}

// @editor-module 简单服务只将已确认领域效果提交到输入快照。

function simpleServiceExecution({command, graph, text, goods, items, overlays, effects, codes, trade, rest, navigation}) {
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
      const saleEntries = state => inventory(state).slice(0, carriedInventoryCount(inventory(state))).map((id, index) => ({id, index}));
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
        if ([0x93, 0x95, 0x99, 0x9B, 0x9E, 0xBD, 0xC4, 0xC9, 0xCA, 0x90, 0xCE, 0xB3].includes(op)) return;
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
        if (op === 0xD9) return branch(state, segment, saleEntries(state).length ? 1 : 0);
        if (op === 0xB5) {
          const entry = saleEntries(state)[e.sale]; e.item = entry?.id; e.saleSlot = entry?.index;
          const price = selectedItem(state)?.price;
          if (!Number.isInteger(price?.raw_code)) return block(state, '收购物品价格码未确认');
          e.branch = price.raw_code >= 0xE0 ? 0 : 1;
          if (e.branch) e.quote = Math.floor(price.value / 2); return;
        }
        if (op === 0xAE) {
          try {
            e.removal = inventoryRemoval({vehicle: false, object: role(state), category: e.category,
              index: e.saleSlot, read: suffix => get(state, suffix), items: items.records, overlays, effects});
            put(state, 'gold', creditedGold(get(state, 'gold'), e.quote));
          } catch (error) {block(state, error.message);}
          return;
        }
        if (op === 0xB4) {
          if (!e.removal) return block(state, '收购删除缺少已核对的库存事务');
          commitInventoryRemoval(state, e.removal, put, role(state)); delete e.removal;
          e.branch = Number(Boolean(saleEntries(state).length)); e.sale = 0;
          e.transactions.push({type: 'sell', item: e.item, quote: e.quote, object: role(state), index: e.saleSlot}); return;
        }
        if (op === 0x9C || op === 0xBC) {
          if (cid === 0x16) {
            payment(state);
            e.transactions.at(-1).type = 'inn-payment';
            return;
          }
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
          if (cid === 0x16 && callback === 0xA353) {
            state.domainResults.call = {kind: 'inn-rest', mode: 5, confirmed: true};
            return;
          }
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
      const next = execution.advance(state, input);
      if (cid === 0x16 && next.execution.status === 'returned' && next.domainResults.call?.kind === 'inn-rest') {
        const destination = rest?.[next.execution.goods];
        if (!destination) {
          next.execution.status = 'unknown';
          next.execution.reason = '已扣款并设置休息模式；缺少自然旅馆调用者的房间落点';
          next.domainResults.call.confirmed = false;
          return next;
        }
        const prefix = `save.slot.${next.context.slot}.`;
        const restored = [];
        for (const role of [...SERVICE_ROLES].reverse()) {
          if (!next.fields[`${prefix}role.${role}.present`] || next.fields[`${prefix}role.${role}.status`] === 255) continue;
          next.fields[`${prefix}role.${role}.current_hp`] = next.fields[`${prefix}role.${role}.max_hp`];
          restored.push(role);
        }
        next.domainResults.rest = {confirmed: true, restored, mode: 5, returnedMode: 1};
        next.context.scene = {sceneId: destination.sceneId,
          ...playerTileFromSaveCamera(destination.cameraX, destination.cameraY)};
        next.domainResults.scene = {kind: 'scene', ...next.context.scene, confirmed: true};
        next.domainResults.windowRestore = {scene: next.context.scene, confirmed: true};
      }
      return next;
    },
  };
}

// @editor-module 简单服务从当前字段准备输入现场并投影本次窗口。

async function startSimpleServiceExecution(model, selected, dependencies) {
  const cid = model.command.command_id;
  const [rawFields, items, overlays, effects, interfaces, selectionLayout, selectionMovement] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readDocument('shared-indexed-byte-overlays'),
    dependencies.readDocument('role-equipment-derived'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
  ]);
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', goods: 'shop-goods-selector',
    service: 'service-list-selector', category: 'sale-inventory-category-selector',
    inventory: 'sale-inventory-item-selector'};
  const navigationValues = await fieldSubmenuCodeValues(Object.values(names), read);
  const goods = model.record.slots.length ? await Promise.all(model.record.slots.map((_, index) =>
    dependencies.readField('facility-config', model.record.id, `slot:${index}`).then(field => field.value))) : [];
  const priceNames = goods.map(id => cid === 0x16 ? `inn-price-${id}`
    : cid === 0x19 ? `service-decoration-price-${id}` : `service-bar-price-${id}`);
  const priceValues = cid === 0x16 ? await facilityRuntimeCodeValues(priceNames, read)
    : [0x17, 0x18, 0x19].includes(cid) ? await fieldSubmenuCodeValues(priceNames, read) : null;
  const codes = cid === 0x16 ? priceValues : priceValues
    ? Object.fromEntries(priceNames.map(name => [name, fieldSubmenuCodeValue(priceValues, name)])) : {};
  let rest = null;
  if (cid === 0x16 && dependencies.context.service?.entryHandle?.startsWith('scene-actor:')) {
    const handle = dependencies.context.service.entryHandle;
    const parameter = (await dependencies.readField('scene-actor', handle, 'interaction_or_record_id')).value;
    if (Number.isInteger(parameter) && parameter >= 0 && parameter < 15) {
      const packed = (await dependencies.readField('ui-facility',
        'ui-facility:npc-selector-16-packed-parameters', `value${parameter}`)).value;
      if ((packed & 3) === selected.instance) {
        const base = packed >> 2;
        const names = goods.flatMap((_, index) => ['scene', 'camera-x', 'camera-y']
          .map(column => `inn-rest-${column}-${base + index}`));
        if (base + goods.length <= 35) {
          const values = await facilityRuntimeCodeValues(names, read);
          rest = goods.map((_, index) => ({sceneId: values[`inn-rest-scene-${base + index}`],
            cameraX: values[`inn-rest-camera-x-${base + index}`], cameraY: values[`inn-rest-camera-y-${base + index}`]}));
        }
      }
    }
  }
  const trade = cid === 0x2C ? {
    prices: await Promise.all(Array.from({length: 8}, (_, index) =>
      dependencies.readField('application-command', 'application-command:2C:00', `value${index}`).then(field => field.value))),
    thresholds: await Promise.all(Array.from({length: 8}, (_, index) =>
      dependencies.readField('application-command', 'application-command:2C:01', `value${index}`).then(field => field.value))),
  } : null;
  const adapter = simpleServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    goods, items, overlays, effects, codes, trade, rest, navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(navigationValues, name)]))}});
  const fields = Object.fromEntries(rawFields.all(`save.slot.${dependencies.context.slot}.`)
    .map(field => [field.fieldId, structuredClone(field.value)]));
  const initial = adapter.initial({fields, context: dependencies.context});
  selected.executionAdapter = adapter;
  selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

async function simpleServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  const context = execution?.context || dependencies.context;
  preview.runtime_context = {...preview.runtime_context, save_slot: context.slot, role_slot: context.role,
    vehicle_slot: context.vehicle, shop_instance: selected.instance,
    ...(execution ? {list_choice_index: execution.execution.goods,
      choice_index: execution.selections.choice, shop_item_index: execution.execution.goods,
      sale_item_index: selected.executionAdapter.saleIndex(execution)} : {})};
  if (execution) {
    preview.service_preview_state = {values: execution.fields, selection: context, terminal: {}, conditions: []};
    if (preview.shop_menu?.sale_item_bar)
      preview.shop_menu.sale_item_bar = execution.execution.category ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  preview = await dependencies.resolveMenu(preview);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}

// @editor-module 列表服务只读当前字段并把领域效果写入预览快照。

function listQuantityFields({items, overlays, effects, codes, fieldStatuses = {}}) {
  const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
  const get = (state, suffix) => {
    const id = key(state, suffix);
    if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
    return state.fields[id];
  };
  const put = (state, suffix, value) => {state.fields[key(state, suffix)] = structuredClone(value);};
  const vehicles = state => [...get(state, 'entity_scene_object_slots').slice(0, 4)].filter(id => id < 128);
  const roles = state => SERVICE_ROLES.flatMap((role, index) => get(state, `role.${role}.present`) ? [index] : []);
  const vehiclePath = state => `vehicle.${state.context.vehicle}`;
  const formula = (state, operation, invocation = {}) => {
    const [result] = resolveFacilityParameterBindings([{confirmation_status: 'confirmed', value_source: {operation}}],
      {items, overlays, codeValues: codes, saveFields: Object.entries(state.fields).map(([fieldId, value]) =>
        ({fieldId, value, status: fieldStatuses[fieldId] || 'exact'})),
      invocation: {saveSlot: state.context.slot, vehicle: state.context.vehicle,
        part: SERVICE_PARTS[state.execution.weapon], amount: state.context.service_amount, ...invocation}});
    if (result.status !== 'available') throw new TypeError(result.reason);
    return result.value;
  };
  const item = id => items.records.find(row => row.id === id);
  const capacity = id => {
    const flags = item(id)?.equipment?.raw_flags;
    if (!Number.isInteger(flags)) throw new TypeError('所选武器弹数属性未确认');
    const code = flags & 7;
    const value = code === 7 ? overlays.zero_prefixed_ascending_bit_masks[0] : overlays.level_value_codebook[code];
    if (!Number.isInteger(value)) throw new TypeError('所选武器弹数容量未确认');
    return value;
  };
  const weapons = state => SERVICE_PARTS.flatMap((part, index) => {
    const id = get(state, `${vehiclePath(state)}.equipment.${part}`);
    return id && id < 0x75 ? [{id, index}] : [];
  });
  return {get, put, vehicles, roles, vehiclePath, formula, item, capacity, weapons, items, overlays, effects};
}

// @editor-module 数量协议在同一预览快照中保留上限、输入与接受值。
function prepareInterfaceQuantity(state, maximum, kind) {
  if (!Number.isInteger(maximum) || maximum < 0 || maximum > 65535)
    throw new RangeError('数量上限缺少已确认的整数范围');
  state.execution.quantity = {kind, maximum, value: 0, accepted: null};
  state.context.service_amount = 0;
}

function setInterfaceQuantity(state, value) {
  const quantity = state.execution.quantity;
  if (!quantity || !Number.isInteger(value) || value < 0 || value > quantity.maximum)
    throw new RangeError('数量须在当前容量范围内');
  quantity.value = value; quantity.accepted = null;
  state.context.service_amount = value;
  return state;
}

function acceptInterfaceQuantity(state) {
  const quantity = state.execution.quantity;
  quantity.accepted = quantity.value;
  return quantity.accepted;
}

// @editor-module 补给与炮弹交易按当前数量、容量和单价推进领域效果。

function supplyShellDomain(cid, fields, {goods, shells}, {block, branch}) {
  const {get, put, vehiclePath, formula, item, capacity, weapons, vehicles} = fields;
  const counts = state => Array.from({length: 6}, (_, index) => get(state, `${vehiclePath(state)}.shell_count.${index}`));
  const storedShells = state => counts(state).flatMap((count, index) => {
    const id = get(state, `${vehiclePath(state)}.shell_type.${index}`);
    return id < 128 ? [{index, count, id}] : [];
  });
  const maximum = state => Math.max(0, get(state, `${vehiclePath(state)}.ammo_capacity`) - counts(state).reduce((sum, n) => sum + n, 0));
  const quote = state => {
    const price = shells.records.find(row => row.id === state.execution.item)?.price;
    if (!price?.available || !Number.isInteger(price.value)) throw new TypeError('所选炮弹单价未确认');
    return price.value;
  };
  const prepare = (state, kind) => {
    const e = state.execution;
    const max = kind === 'special' ? maximum(state) : kind === 'sale' ? storedShells(state)[e.sale]?.count
      : kind === 'armor' ? formula(state, 'current-vehicle-armor-deficit') : e.deficit;
    prepareInterfaceQuantity(state, max, kind);
  };
  const menus = state => {
    const control = state.control; state.execution;
    if (cid === 0x20) {
      if (control === 1) return ['弹药', '装甲', '退出'];
      if ([6, 28].includes(control)) return ['全部', '选数量', '退出'];
      if ([15, 27].includes(control)) return vehicles(state).map(id => `战车 ${id + 1}`);
      if (control === 18) return weapons(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    } else {
      if (control === 1) return ['购买', '出售', '退出'];
      if (control === 5) return ['普通弹', '特殊弹', '退出'];
      if (control === 7) return goods.map(id => `record:0D:${String(id).padStart(3, '0')}`);
      if ([10, 20, 35].includes(control)) return vehicles(state).map(id => `战车 ${id + 1}`);
      if (control === 22) return weapons(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
      if (control === 44) return storedShells(state).map(row => `record:0D:${String(row.id).padStart(3, '0')}`);
    }
    return [];
  };
  const select = (state, index) => {
    if (cid === 0x20 && state.control === 6) state.execution.supplyChoice = index;
    else if (cid === 0x20 && state.control === 28) state.execution.armorChoice = index;
    else if (state.pause.selector === 1) {
      state.context.vehicle = vehicles(state)[index]; state.selections.object = index;
    } else if (cid === 0x15 && state.control === 7) state.execution.goods = index;
    else if ([18, 22].includes(state.control)) state.execution.weaponChoice = index;
    else if (state.control === 44) state.execution.sale = index;
  };
  const refill = state => {
    const part = SERVICE_PARTS[state.execution.weapon];
    const suffix = `${vehiclePath(state)}.equipment_state.${part}`;
    put(state, suffix, (get(state, suffix) + state.context.service_amount) & 255);
    state.execution.transactions.push({type: 'ammunition', vehicle: state.context.vehicle,
      part, quantity: state.context.service_amount, quote: state.execution.quote});
  };
  const resumeCallback = state => {
    const e = state.execution;
    for (const [suffix, value] of e.supplyUpdates) put(state, suffix, value);
    e.transactions.push({type: e.supplyKind ? 'party-armor' : 'party-ammunition', quote: e.quote});
    delete e.supplyUpdates; delete e.callbackWait;
  };
  const operate = (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if ([0x94, 0xA7, 0x97, 0xC9].includes(op)) return;
    if (op === 0xC4) {if (!goods.length) block(state, '零商品计数的原生列表回绕未确认'); return;}
    if (op === 0xD4) {e.menuSelector = operation.operands[1]; e.choice = 0; return;}
    if (op === 0xB6) {e.choice = 0; return;}
    if (op === 0xBD) {e.quote = 0; return;}
    if (op === 0xC6) {e.supplyKind = e.choice; return;}
    if (op === 0xE3) return branch(state, segment, e.supplyKind);
    if (op === 0xDF) return branch(state, segment, vehicles(state).length ? 1 : 0);
    if (op === 0xC3) {e.objectList = segment.index; return;}
    if (op === 0xBB) {e.branch = state.context.vehicle >= 8 ? 1 : 0; return;}
    if (op === 0xC5) {e.item = goods[e.goods]; e.unit = quote(state); return;}
    if (op === 0xD6) return branch(state, segment, weapons(state).length ? 1 : 0);
    if (op === 0xA8) {
      const selected = weapons(state)[e.weaponChoice ?? 0];
      if (!selected) return block(state, '所选武器不在当前列表');
      e.weapon = selected.index; e.item = selected.id;
      e.branch = e.item >= 0x65 ? 1 : 0; return;
    }
    if (op === 0xA9) {
      const current = get(state, `${vehiclePath(state)}.equipment_state.${SERVICE_PARTS[e.weapon]}`) & 63;
      e.deficit = (capacity(e.item) - current) & 255; e.branch = e.deficit ? 1 : 0;
      if (e.deficit) {
        state.context.service_amount = e.deficit;
        e.quote = formula(state, 'current-ammunition-deficit-cost');
      }
      return;
    }
    if (op === 0x96) return prepare(state, 'ammunition');
    if (op === 0xDA) {
      const quantity = acceptInterfaceQuantity(state); e.branch = quantity ? 1 : 0;
      if (quantity) e.quote = formula(state, 'current-equipment-quantity-cost', {quantity});
      return branch(state, segment, e.branch);
    }
    if (op === 0xAD) {
      const quantity = acceptInterfaceQuantity(state); e.branch = quantity ? 1 : 0;
      if (quantity) e.quote = (e.unit & 0xFF0000) + ((e.unit * quantity) & 65535);
      return;
    }
    if (op === 0xAC) {
      const entries = storedShells(state); const existing = entries.find(row => row.id === e.item);
      e.shellSlot = existing?.index ?? counts(state).indexOf(0);
      e.branch = e.shellSlot < 0 ? 0 : 1; return;
    }
    if (op === 0xAB) {e.branch = maximum(state) ? 1 : 0; return;}
    if (op === 0xF0 || op === 0xF1) return branch(state, segment, op === 0xF0
      ? maximum(state) ? 0 : 1 : storedShells(state).length ? 0 : 1);
    if (op === 0xDC) {
      e.moneyAfter = get(state, 'gold') - e.quote;
      return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
    }
    if (op === 0x9C || op === 0xBC) {put(state, 'gold', e.moneyAfter); return;}
    if (op === 0xAA) return refill(state);
    if (op === 0xA6) {
      const path = `${vehiclePath(state)}.shell_count.${e.shellSlot}`;
      put(state, `${vehiclePath(state)}.shell_type.${e.shellSlot}`, e.item);
      put(state, path, (get(state, path) + state.context.service_amount) & 255);
      e.transactions.push({type: 'shell', vehicle: state.context.vehicle, item: e.item,
        index: e.shellSlot, quantity: state.context.service_amount, quote: e.quote}); return;
    }
    if (op === 0xAE) {put(state, 'gold', creditedGold(get(state, 'gold'), e.quote)); return;}
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xB098) return prepare(state, 'special');
      if (callback === 0xB027) return prepare(state, 'armor');
      if (callback === 0xB074) {
        const row = storedShells(state)[e.sale]; e.item = row.id; e.shellSlot = row.index;
        const unit = quote(state); e.unit = unit - (unit & 255) + ((unit & 255) >>> 1);
        return prepare(state, 'sale');
      }
      if (callback === 0xF49B) {e.sale = 0; return;}
      if (callback === 0xA28C) {
        state.context.service_amount = formula(state, 'current-vehicle-armor-deficit');
        e.quote = state.context.service_amount ? formula(state, 'current-armor-input-cost') : 0; return;
      }
      if (callback === 0xB03E) {
        const quantity = state.context.service_amount, values = counts(state), types = Array.from({length: 6},
          (_, index) => get(state, `${vehiclePath(state)}.shell_type.${index}`));
        values[e.shellSlot] = (values[e.shellSlot] - quantity) & 255;
        if (!values[e.shellSlot]) {
          values.splice(e.shellSlot, 1); values.push(0);
          types.splice(e.shellSlot, 1); types.push(255);
        }
        values.forEach((count, index) => put(state, `${vehiclePath(state)}.shell_count.${index}`, count));
        types.forEach((id, index) => put(state, `${vehiclePath(state)}.shell_type.${index}`, id));

        e.transactions.push({type: 'sell-shell', vehicle: state.context.vehicle, item: e.item,
          index: e.shellSlot, quantity, quote: e.quote}); return;
      }
      if (callback === 0xA4F6) {
        acceptInterfaceQuantity(state);
        e.quote = state.context.service_amount ? formula(state, 'current-armor-input-cost') : 0; return;
      }
      if (callback === 0xA6E3) {
        put(state, `${vehiclePath(state)}.sp`, (get(state, `${vehiclePath(state)}.sp`) + state.context.service_amount) & 65535);
        e.transactions.push({type: 'armor', vehicle: state.context.vehicle, quantity: state.context.service_amount, quote: e.quote}); return;
      }
      if (callback === 0xA58E) {
        e.quote = formula(state, e.supplyKind ? 'current-party-armor-cost' : 'current-party-ammunition-cost');
        e.branch = e.supplyKind ? Number(Boolean(e.quote)) : Number(vehicles(state).some(vehicle =>
          SERVICE_PARTS.some(part => {
            const path = `vehicle.${vehicle}`, id = get(state, `${path}.equipment.${part}`);
            return id > 0 && id < 0x65 && ((capacity(id) - (get(state, `${path}.equipment_state.${part}`) & 63)) & 255);
          })));
        return;
      }
      if (callback === 0xA601) {
        const updates = [];
        for (const vehicle of [...vehicles(state)].reverse()) {
          const path = `vehicle.${vehicle}`;
          if (e.supplyKind) {
            const current = {...state, context: {...state.context, vehicle}};
            updates.push([`${path}.sp`, (get(state, `${path}.sp`) + formula(current, 'current-vehicle-armor-deficit')) & 65535]);
          } else for (const part of SERVICE_PARTS) {
            const id = get(state, `${path}.equipment.${part}`);
            if (id < 0x65) updates.push([`${path}.equipment_state.${part}`,
              ((get(state, `${path}.equipment_state.${part}`) & 0xC0) + capacity(id)) & 255]);
          }
        }
        e.supplyUpdates = updates;
        if (e.supplyKind) return resumeCallback(state);
        e.callbackWait = {record: 'record:06:123'};
        e.status = 'waiting'; state.pause = {kind: 'wait', quantity: false}; return;
      }
    }
    block(state, `此调用的原生 ${op.toString(16).toUpperCase()} 效果未确认`);
  };
  return {menus, select, operate, resumeCallback, quantityMenu: state => state.pause.selector === 2,
    saleIndex: () => 0, inventoryKind: () => 0, weaponRows: weapons, shellRows: storedShells};
}

// @editor-module 财产保管在两侧当前库存之间绑定所选物理槽。

function storageServiceDomain(fields, {block, branch, changeSegment}) {
  const {get, put, vehicles, roles, vehiclePath, items, overlays, effects} = fields;
  const stored = state => Array.from({length: 64}, (_, index) => ({index,
    id: get(state, `property_storage.item.${index}`), condition: get(state, `property_storage.paired_condition.${index}`)}));
  const object = state => state.execution.receiverKind === 0 ? vehiclePath(state) : `role.${SERVICE_ROLES[state.context.role]}`;
  const inventory = state => {
    const e = state.execution, path = object(state);
    if (e.receiverKind) return [...get(state, `${path}.${e.category ? 'inventory' : 'equipment'}`)];
    return Array.from({length: 8}, (_, index) => get(state, `${path}.${e.category ? `item.${index}` : `equipment.${SERVICE_PARTS[index]}`}`));
  };
  const entries = state => {
    const values = inventory(state), e = state.execution;
    return !e.receiverKind && !e.category ? values.flatMap((id, index) => id ? [{id, index}] : [])
      : values.slice(0, carriedInventoryCount(values)).map((id, index) => ({id, index}));
  };
  const actors = state => state.execution.receiverKind ? roles(state) : vehicles(state);
  const sort = state => {
    const rows = stored(state).sort((a, b) => b.id - a.id);
    rows.forEach((row, index) => {
      put(state, `property_storage.item.${index}`, row.id);
      put(state, `property_storage.paired_condition.${index}`, row.condition);
    });
    if (rows.every(row => row.id)) block(state, '满 64 槽保管物的首零扫描越界未确认');
  };
  const menus = state => {
    if (state.control === 2) return ['存入', '取出', '退出'];
    if (state.control === 7) return ['战车', '人物', '退出'];
    if ([11, 36].includes(state.control)) return actors(state).map(id => state.execution.receiverKind
      ? ['猎人', '机械师', '战士'][id] : `战车 ${id + 1}`);
    if (state.control === 16) return ['装备', '道具'];
    if (state.control === 19) return entries(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    if (state.control === 49) return stored(state).filter(row => row.id)
      .map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    return [];
  };
  const select = (state, index) => {
    const e = state.execution;
    if (state.pause.selector === 1) {
      state.context[e.receiverKind ? 'role' : 'vehicle'] = actors(state)[index]; state.selections.object = index;
    } else if (state.control === 16) {e.category = index; e.sale = 0;}
    else if (state.control === 19) e.sale = index;
    else if (state.control === 49) {e.stored = index; e.storagePage = Math.max(0, index - 7);}
  };
  const withdraw = state => {
    const e = state.execution, rows = inventory(state), destination = rows.indexOf(0);
    if (destination < 0) return block(state, '当前接收栏没有空位');
    const path = object(state);
    if (e.receiverKind) {rows[destination] = e.item; put(state, `${path}.${e.category ? 'inventory' : 'equipment'}`, rows);}
    else {
      put(state, `${path}.${e.category ? `item.${destination}` : `equipment.${SERVICE_PARTS[destination]}`}`, e.item);
      if (!e.category) put(state, `${path}.equipment_state.${SERVICE_PARTS[destination]}`, e.condition);
    }
    put(state, `property_storage.item.${e.stored}`, 0);
    e.transactions.push({type: 'withdraw', source: e.stored, destination, object: path, item: e.item});
  };
  const operate = (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if ([0xC9, 0x93].includes(op)) return;
    if (op === 0xD4) {e.menuSelector = operation.operands[1]; e.choice = 0; return;}
    if (op === 0xC3) {e.objectList = segment.index; return;}
    if (op === 0xDF) return branch(state, segment, vehicles(state).length ? 1 : 0);
    if (op === 0xE9) return branch(state, segment, get(state, 'property_storage.item.62') ? 1 : 0);
    if (op === 0xEC) {
      sort(state);
      if (e.status === 'unknown') return;
      return branch(state, segment, get(state, 'property_storage.item.0') ? 1 : 0);
    }
    if (op === 0xE0) return branch(state, segment, e.receiverKind);
    if (op === 0xBB) {e.branch = e.receiverKind === 0 && state.context.vehicle >= 8 ? 1 : 0; return;}
    if (op === 0xBF) {e.category = 0; e.sale = 0; return;}
    if (op === 0xD9) return branch(state, segment, entries(state).length ? 1 : 0);
    if (op === 0xBA) {e.branch = inventory(state).at(-1) ? 1 : 0; return;}
    if (op === 0xEB) return branch(state, segment, e.item <= 0xDC ? 0 : 1);
    if (op === 0xEA) {
      const mask = e.category ? 0 : get(state, `${object(state)}.${e.receiverKind ? 'slot_flags' : 'equipped_mask_raw'}`);
      const result = inventorySaleBranch(e.item, mask & (0x80 >> e.saleSlot));
      return branch(state, segment, result);
    }
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA1AA) {e.receiverKind = e.choice; return;}
      if (callback === 0xA13E) return;
      if (callback === 0xA9D9) {
        const row = entries(state)[e.sale];
        if (!row) return block(state, '所选携带物已不在当前栏');
        e.item = row.id; e.saleSlot = row.index; return;
      }
      if (callback === 0xA0DF) {
        const index = state.context[e.receiverKind ? 'role' : 'vehicle'];
        const choice = inventoryStatusBranch(index, suffix => get(state, suffix));
        const continuation = segment.callback_continuation;
        const read = continuation?.reads?.find(row => row.relative_offset === choice);
        if (continuation?.confirmation_status !== 'confirmed' || read?.confirmation_status !== 'confirmed'
            || !Number.isInteger(read.value) || read.value >= 0xFE)
          return block(state, '人物状态检查的当前脚本续接未确认');
        return changeSegment(state, read.value);
      }
      if (callback === 0xABCE) {
        const destination = stored(state).findIndex(row => !row.id);
        if (destination < 0) return block(state, '保管栏首零扫描越界未确认');
        const plan = inventoryRemoval({vehicle: !e.receiverKind, object: object(state), category: e.category,
          index: e.saleSlot, read: suffix => get(state, suffix), items: items.records, overlays, effects});
        const condition = !e.receiverKind && !e.category
          ? get(state, `${object(state)}.equipment_state.${SERVICE_PARTS[e.saleSlot]}`) : null;
        put(state, `property_storage.item.${destination}`, e.item);
        if (e.item >= 0x41 && e.item < 0x99) put(state, `property_storage.paired_condition.${destination}`, condition);
        commitInventoryRemoval(state, plan, put, object(state));
        e.transactions.push({type: 'deposit', source: e.saleSlot, destination, object: object(state), item: e.item});
        return;
      }
      if (callback === 0xABEC) return;
      if (callback === 0xAC12) {
        const row = stored(state)[e.stored];
        if (!row?.id) return block(state, '所选保管物为空');
        e.item = row.id; e.condition = row.condition;
        e.receiverKind = row.id >= 0xCB || row.id >= 0x41 && row.id < 0x99 ? 0 : 1;
        e.category = row.id >= 0x99 ? 1 : 0;
        state.selections.object = 0;
        state.context[e.receiverKind ? 'role' : 'vehicle'] = actors(state)[0]; return;
      }
      if (callback === 0xF4C6) {
        if (!e.item) return block(state, '取出缺少已确认的物品类别');
        return;
      }
      if (callback === 0xAC33) return withdraw(state);
    }
    block(state, `此保管调用的原生 ${op.toString(16).toUpperCase()} 效果未确认`);
  };
  return {menus, select, operate, actors, quantityMenu: () => false,
    saleIndex: state => entries(state)[state.execution.sale]?.index ?? 0,
    inventoryKind: state => state.execution.category};
}

// @editor-module 多层服务共用应用执行、选择布局与数量协议。

function listQuantityServiceExecution({command, graph, text, navigation, ...data}) {
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
        exports: {saleIndex: domain.saleIndex, inventoryKind: domain.inventoryKind, resumeCallback: domain.resumeCallback},
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
    if (state.execution.callbackWait) {
      if (!['a', 'b'].includes(input.type)) return state;
      state.execution.trace.push({node: state.node, input: input.type, callback: 0xA601,
        evidence: 'project/evidence/reverse-engineering/inventory-transactions/observations.json#party-supply'});
      execution.resumeCallback(state); state.execution.status = 'running'; state.pause = null;
      return execution.resume(state);
    }
    if (input.type === 'amount' && state.execution.status === 'waiting' && state.pause.quantity)
      return setInterfaceQuantity(state, input.value);
    return execution.advance(state, input);
  }};
}

// @editor-module 多层服务取得当前字段并把执行现场传给既有语义预览。

async function startListQuantityServiceExecution(model, selected, dependencies) {
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', goods: 'shop-goods-selector', weapon: 'supply-weapon-selector',
    category: 'sale-inventory-category-selector', inventory: 'sale-inventory-item-selector',
    storage: 'storage-withdraw-selector', shell: 'shell-sale-selector'};
  const [raw, items, shells, overlays, effects, interfaces, selectionLayout, selectionMovement, selectors, codes] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readDocument('shell-record'),
    dependencies.readDocument('shared-indexed-byte-overlays'), dependencies.readDocument('role-equipment-derived'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(names), read), facilityRuntimeCodeValues(['equipment-quantity-unit-price',
      'armor-price-rounding-bias', 'armor-price-divisor', 'armor-equipment-item-limit'], read),
  ]);
  const count = model.record.id ? (await dependencies.readField('facility-config', model.record.id, 'payload_length')).value : 0;
  const goods = await Promise.all(Array.from({length: count}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const rows = raw.all(`save.slot.${dependencies.context.slot}.`);
  const adapter = listQuantityServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    items, shells, overlays, effects, codes, goods, fieldStatuses: Object.fromEntries(rows.map(row => [row.fieldId, row.status])),
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(selectors, name)]))}});
  const initial = adapter.initial({fields: Object.fromEntries(rows.map(row => [row.fieldId, structuredClone(row.value)])),
    context: {...dependencies.context, service_amount: 0}});
  selected.executionAdapter = adapter; selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

async function listQuantityServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  if (node.pause.kind === 'choice') preview.selection_cursor = {
    resource_id: 'selection-layout', kind: 'inline-text-confirm', protocol: 'text-confirmation'};
  if (execution) {
    const e = execution.execution;
    const menu = preview.shop_menu || {};
    const listIndex = menu.service_weapon_menu || menu.ammunition_selection ? e.weaponChoice
      : menu.shell_goods ? e.goods : menu.callback_prompt_handle ? e.armorChoice ?? 0
      : menu.retained_service_prompt ? e.supplyChoice ?? 0 : execution.selections.choice;
    const index = menu.service_weapon_menu || menu.ammunition_selection ? e.weaponChoice
      : execution.control === 49 ? e.stored - e.storagePage : execution.selections.choice;
    preview.runtime_context = {...preview.runtime_context, save_slot: execution.context.slot,
      role_slot: execution.context.role, vehicle_slot: execution.context.vehicle, shop_instance: selected.instance,
      choice_index: index, list_choice_index: listIndex,
      shop_item_index: e.goods, sale_item_index: selected.executionAdapter.saleIndex(execution),
      stored_item_index: e.stored, first_row: e.storagePage, shell_index: e.shellSlot ?? 0};
    preview.service_preview_state = {values: execution.fields, selection: execution.context, terminal: {}, conditions: []};
    if (preview.shop_menu?.sale_item_bar)
      preview.shop_menu.sale_item_bar = selected.executionAdapter.inventoryKind(execution) ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  if (execution?.execution.callbackWait) {
    preview.shop_menu = {...preview.shop_menu, welcome_record: execution.execution.callbackWait.record};
    preview.runtime_context.confirmed_waits = 0;
    delete preview.selection_cursor;
    for (const layer of preview.layers.filter(layer => layer.shop_welcome)) {
      layer.record = execution.execution.callbackWait.record; layer.inline_confirm = false;
    }
  }
  preview = await dependencies.resolveMenu(preview);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}

// @editor-module 专用效果同步同一快照中的存档字段与派生队伍表示。

function specialServiceFields(data) {
  const fields = listQuantityFields(data), {get, roles} = fields;
  const put = (state, suffix, value) => fields.put(state, suffix,
    get(state, suffix) instanceof Uint8Array ? Uint8Array.from(value) : value);
  const rolePath = state => `role.${SERVICE_ROLES[state.context.role]}`;
  const status = (state, value) => {
    const path = rolePath(state);
    put(state, `${path}.status`, value);
    for (const [name, mask] of [['acid', 8], ['numb', 128]])
      put(state, `${path}.${name}`, Number(value !== 255 && Boolean(value & mask)));
    put(state, `${path}.dead`, Number(value === 255));
  };
  const equipmentState = (state, vehicle, part, value) => {
    put(state, `vehicle.${vehicle}.equipment_state.${part}`, value);
    put(state, `vehicle.${vehicle}.${part}_damaged`, Number(Boolean(value & 128)));
  };
  const party = state => {
    const slots = [...get(state, 'entity_scene_object_slots')];
    SERVICE_ROLES.forEach((role, index) => {slots[index] = get(state, `role.${role}.current_vehicle`);});
    for (let index = 0; index < 3; index++) slots[4 + index] = get(state, `active_rental_vehicle_preset.${index}`);
    put(state, 'entity_scene_object_slots', slots);
    state.domainResults.party = roles(state).map(index => ({role: index,
      present: get(state, `role.${SERVICE_ROLES[index]}.present`),
      status: get(state, `role.${SERVICE_ROLES[index]}.status`),
      vehicle: slots[index]}));
  };
  const board = (state, vehicle) => {
    const path = rolePath(state);
    state.context.vehicle = vehicle;
    put(state, `${path}.current_vehicle`, vehicle);
    put(state, `${path}.present`, get(state, `${path}.present`) | 128);
    put(state, `${path}.driving`, 1); party(state);
  };
  const unboard = (state, vehicle) => {
    SERVICE_ROLES.forEach(role => {
      const path = `role.${role}`;
      if (get(state, `${path}.current_vehicle`) !== vehicle) return;
      put(state, `${path}.current_vehicle`, 255);
      put(state, `${path}.present`, get(state, `${path}.present`) & 127);
      put(state, `${path}.driving`, 0);
    });
    const slots = [...get(state, 'entity_scene_object_slots')];
    if (slots[3] === vehicle) {slots[3] = 255; put(state, 'entity_scene_object_slots', slots);}
    party(state);
  };
  const damaged = state => fields.vehicles(state).flatMap(vehicle => SERVICE_PARTS.flatMap((part, index) => {
    const item = get(state, `vehicle.${vehicle}.equipment.${part}`);
    const condition = get(state, `vehicle.${vehicle}.equipment_state.${part}`);
    return item && condition & 192 ? [{vehicle, part, index, item}] : [];
  }));
  return {...fields, put, rolePath, status, equipmentState, party, board, unboard, damaged};
}

// @editor-module 战车改造只执行已有资格、计价、载重与设备字段效果。

function specialVehicleServiceDomain(cid, fields, data, {block, branch, changeSegment}) {
  const {get, put, vehiclePath, formula} = fields;
  const read = (state, suffix) => get(state, `${vehiclePath(state)}.${suffix}`);
  const price = code => {
    const row = data.items.equipment_editor.numeric_codes.find(row => row.raw_code === code && row.available);
    if (!Number.isInteger(row?.value)) throw new TypeError('底盘报价码未确认');
    return row.value;
  };
  return (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if (op === 0xFD && cid === 0x28) {
      const id = read(state, 'equipment.engine');
      const eligible = !read(state, 'equipped.engine') ? 1 : read(state, 'equipment_state.engine') & 192 ? 2
        : [0x7B, 0x7E, 0x81, 0x84, 0x87, 0x8A, 0x8D, 0x90].includes(id) ? 3 : 0;
      return branch(state, segment, eligible);
    }
    if (op === 0xE6) {
      e.quote = formula(state, 'current-chassis-capacity-cost');
      return branch(state, segment, read(state, 'ammo_capacity') >= 128 ? 1 : 0);
    }
    if (op === 0xE7) {
      const defense = read(state, 'defense');
      e.quote = formula(state, 'current-chassis-weight-cost');
      const preset = data.vehicles.presets.find(row => row.preset_id === state.context.vehicle);
      const limit = preset?.chassis_weight?.internal_units;
      if (!Number.isInteger(limit)) return block(state, '底盘上限缺少当前预设基重量');
      return branch(state, segment, limit >= defense ? 0 : 1);
    }
    if (op === 0xE8) {
      const mask = data.overlays.descending_bit_masks[e.hole];
      if (!Number.isInteger(mask)) return block(state, '孔位许可掩码未确认');
      e.quote = Math.floor(price(0xE0 + state.context.vehicle) / [10, 40, 30][e.hole]);
      return branch(state, segment, read(state, 'mount_mask_raw') & mask ? 1 : 0);
    }
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA27B) return;
      if (callback === 0xAA69) return changeSegment(state, read(state, 'equipment_state.chassis') ? 9 : 10);
      if (callback === 0xAA48) {e.weapon = 4; e.quote = formula(state, 'current-engine-upgrade-price'); return;}
      if (callback === 0xAA42) {
        const id = read(state, 'equipment.engine');
        formula(state, 'current-engine-upgrade-price');
        put(state, `${vehiclePath(state)}.equipment.engine`, id + 1);
        e.transactions.push({type: 'engine', vehicle: state.context.vehicle, from: id, to: id + 1, quote: e.quote});
        return;
      }
      if (callback === 0xAAA4) {
        const index = e.project === 2 ? e.hole : e.project + 3;
        e.weightIncrease = data.codes[`chassis-upgrade-weight-${index}`];
        const load = currentVehicleEquipmentLoad({read: suffix => read(state, suffix), items: data.items.records,
          extra: e.weightIncrease, limit: data.codes['armor-equipment-item-limit']});
        if (!load) return block(state, '底盘改造载重或当前引擎容量未确认');
        state.domainResults.load = load;
        e.branch = load.overloaded ? 1 : 0; return;
      }
      if (callback === 0xA146) {
        const path = vehiclePath(state);
        put(state, `${path}.chassis_weight`, (read(state, 'chassis_weight') + e.weightIncrease) & 65535);
        if (e.project === 0) put(state, `${path}.ammo_capacity`, (read(state, 'ammo_capacity') + 8) & 255);
        if (e.project === 1) put(state, `${path}.defense`, (read(state, 'defense') + 10) & 65535);
        if (e.project === 2) {
          const mask = read(state, 'mount_mask_raw') | data.overlays.descending_bit_masks[e.hole];
          put(state, `${path}.mount_mask_raw`, mask);
          SERVICE_PARTS.slice(0, 3).forEach((part, index) => put(state, `${path}.mount_permission.${part}`, Number(Boolean(mask & (128 >> index)))));
        }
        e.transactions.push({type: 'chassis', vehicle: state.context.vehicle, project: e.project, hole: e.hole, quote: e.quote});
        return;
      }
    }
    return false;
  };
}

// @editor-module 修理保留战车标题行与设备行并在接受报价后清除损坏位。
function specialRepairServiceDomain(fields, {block, branch}) {
  const {get, put, vehicles, damaged, formula, equipmentState} = fields;
  const scan = state => {
    const rows = damaged(state), entries = [];
    for (const vehicle of vehicles(state)) {
      const parts = rows.filter(row => row.vehicle === vehicle);
      if (parts.length) entries.push({vehicle, header: true}, ...parts);
    }
    state.execution.repairEntries = entries;
    return entries;
  };
  const bind = (state, row) => {
    if (!row || row.header) throw new TypeError('当前修理行不是设备');
    state.context.vehicle = row.vehicle;
    state.execution.weapon = row.index;
    state.execution.repairTarget = row;
    state.execution.quote = formula(state, 'current-repair-cost');
  };
  const repair = (state, rows) => {
    for (const row of rows.filter(row => !row.header)) {
      const path = `vehicle.${row.vehicle}.equipment_state.${row.part}`;
      equipmentState(state, row.vehicle, row.part, get(state, path) & 63);
    }
    state.execution.transactions.push({type: 'repair', targets: structuredClone(rows.filter(row => !row.header)),
      quote: state.execution.quote});
    scan(state);
  };
  return {
    scan,
    operate(state, operation, segment) {
      const e = state.execution, op = operation.opcode;
      if (op === 0xF6) {
        const entries = scan(state);
        e.repairRowCount = entries.length;
        return branch(state, segment, entries.length === 0 ? 0 : entries.length === 2 ? 2 : 1);
      }
      if (op === 0xA0) {bind(state, scan(state)[1]); e.branch = 0; return;}
      if (op === 0xA1 || op === 0xA3) {scan(state); e.repairChoice = 0; e.scope = 0; return;}
      if (op === 0xA2) {
        const entries = e.repairEntries;
        if (!entries?.length) return block(state, '空修理列表的原生计数回绕未确认');
        e.quote = entries.filter(row => !row.header).reduce((total, row) => {
          bind(state, row); return (total + e.quote) % 0x1000000;
        }, 0);
        return;
      }
      if (op === 0xED) {
        const row = e.repairEntries[e.repairChoice];
        if (!row || row.header) return branch(state, segment, 0);
        bind(state, row); return branch(state, segment, 1);
      }
      if (op === 0xBE) {
        if (!e.repairTarget) return block(state, '单项修理缺少设备行');
        repair(state, [e.repairTarget]); return;
      }
      if (op === 0xA4) {repair(state, e.repairEntries || []); return;}
      return false;
    },
  };
}

// @editor-module 出租初始化复用战车字段模板并同步乘员、归还与队伍。

function specialRentalServiceDomain(fields, data, {block, branch}) {
  const {get, put, board, unboard, party, rolePath} = fields;
  const rentals = state => [2, 1, 0].filter(index => get(state, `active_rental_vehicle_preset.${index}`) < 128);
  const release = (state, index) => {
    unboard(state, index + 8); put(state, `active_rental_vehicle_preset.${index}`, 255); party(state);
    state.execution.transactions.push({type: 'return', vehicle: index + 8});
  };
  return {
    rentals,
    operate(state, operation, segment) {
      const e = state.execution, op = operation.opcode;
      if (op === 0xFB) return branch(state, segment, rentals(state).length);
      if (op === 0x98) {for (const index of rentals(state)) release(state, index); return;}
      if (op === 0xE1) return branch(state, segment, get(state, `${rolePath(state)}.present`) & 128 ? 1 : 0);
      if (op === 0xE2) {
        const index = e.returnRoles[e.returnChoice];
        if (!Number.isInteger(index)) return block(state, '归还选择缺少活动出租位');
        e.returnRental = index;
        return branch(state, segment, fields.vehicles(state).includes(index + 8) ? 0 : 1);
      }
      if (op === 0xC0) {
        const slot = [0, 1, 2].find(index => get(state, `active_rental_vehicle_preset.${index}`) >= 128);
        if (slot === undefined) return block(state, '出租记录已满');
        const values = saveRentalVehicleTemplate(e.preset, data);
        const target = 8 + slot;
        const names = [...get(state, `vehicle.${target}.name_codes`)];
        names[6] = values.nameCode;
        for (const [suffix, value] of Object.entries(values)) if (suffix !== 'nameCode') put(state, `vehicle.${target}.${suffix}`, value);
        put(state, `vehicle.${target}.name_codes`, names);
        put(state, `active_rental_vehicle_preset.${slot}`, e.preset);
        board(state, target);
        e.transactions.push({type: 'rent', vehicle: target, preset: e.preset, role: state.context.role});
        return;
      }
      if (op === 0xD2) {
        const callback = operation.operands[0] | operation.operands[1] << 8;
        if (callback === 0xFA99) {e.rentalChoice = 0; return;}
        if (callback === 0xA1F4) return;
        if (callback === 0xA4AF) {e.preset = data.goods[e.rentalChoice]; return;}
        if (callback === 0xA450) {
          e.returnRoles = rentals(state); e.returnChoice = 0;
          if (e.returnRoles.length) state.context.vehicle = 8 + e.returnRoles[0];
          return;
        }
        if (callback === 0xA43F) {release(state, e.returnRental); return;}
        if (callback === 0xA411) {
          const vehicle = get(state, `${rolePath(state)}.current_vehicle`);
          if (vehicle >= 128) return block(state, '换乘缺少原战车');
          state.domainResults.parkedVehicle = {vehicle, positionStatus: '场景位置更新未确认'};
          unboard(state, vehicle); return;
        }
      }
      return false;
    },
  };
}

// @editor-module 镜片按已确认的逆序匹配表计算组合并保留借用标志。
const combinations = [
  [[255, 255, 255, 0xBA], 0x26], [[0, 255, 255, 255], 0x25],
  [[0, 0xBC, 0xBA, 0xB9], 0x24], [[0, 0xBB, 0xBA, 0xB9], 0x24],
  [[0, 0xBC, 0xBB, 0xBA], 0x24], [[0, 0xBC, 0xBB, 0xB9], 0x24],
  [[0, 0xB9, 0xBB, 0xBC], 0x23], [[0, 0xBA, 0xBB, 0xBC], 0x23],
  [[0, 0xB9, 0xBA, 0xBB], 0x23], [[0, 0xB9, 0xBA, 0xBC], 0x23],
  [[0xB9, 0xBC, 0xBA, 0xBB], 0x28],
];

function specialLensCombination(arrangement) {
  if (!Array.isArray(arrangement) || arrangement.length !== 4
      || arrangement.some(id => ![0, 0xB9, 0xBA, 0xBB, 0xBC].includes(id)))
    throw new TypeError('镜片排列超出已确认的四槽域');
  const packed = [...arrangement].reverse().filter(Boolean);
  if (packed.length < 3) throw new TypeError('少于三枚镜片的组合依赖未确认的临时缓冲');
  while (packed.length < 4) packed.push(0);
  return [...combinations].reverse().find(([pattern]) => pattern.every((id, index) =>
    id === 255 || id === [...packed].reverse()[index]))?.[1] ?? 0x27;
}

function specialLensServiceDomain(fields, {block, branch, changeSegment}) {
  const {get, put, roles, rolePath} = fields;
  const flag = id => `global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`;
  const laser = state => roles(state).flatMap(role => {
    const path = `role.${['hunter', 'mechanic', 'soldier'][role]}.equipment`;
    return [...get(state, path)].map((id, index) => ({path, index, id})).filter(row => row.id >= 0x23 && row.id < 0x29);
  })[0];
  return (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if (op === 0x9F) {
      e.availableLenses = [];
      for (const id of [0xB9, 0xBA, 0xBB, 0xBC]) {
        const found = roles(state).find(role => get(state, `role.${['hunter', 'mechanic', 'soldier'][role]}.inventory`).includes(id));
        if (get(state, flag(id))) {e.availableLenses.push(id); continue;}
        if (found === undefined) continue;
        const path = `role.${['hunter', 'mechanic', 'soldier'][found]}.inventory`;
        const values = [...get(state, path)], index = values.indexOf(id);
        values.splice(index, 1); values.push(0); put(state, path, values); put(state, flag(id), 1);
        e.availableLenses.push(id);
      }
      e.choice = e.availableLenses.length;
      return;
    }
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA7BB) return;
      if (callback === 0xB169) {e.arrangement = [0, 0, 0, 0]; e.lensIndex = 0; return;}
      if (callback === 0xB221) {
        e.lens = e.availableLenses[e.lensIndex++];
        return changeSegment(state, e.lens ? 9 : 10);
      }
      if (callback === 0xB1A1) {
        if (e.arrangement[e.lensPosition] === 0) {
          e.arrangement[e.lensPosition] = e.lens;
          return changeSegment(state, 8);
        }
        return changeSegment(state, 9);
      }
      if (callback === 0xEF02) {
        e.item = specialLensCombination(e.arrangement);
        state.domainResults.laser = {arrangement: [...e.arrangement], item: e.item}; return;
      }
      if (callback === 0xB1B9) {e.laserTarget = laser(state); e.branch = e.laserTarget ? 0 : 1; return;}
      if (callback === 0xB1D5) {
        const target = laser(state);
        if (!target) return block(state, '镜片结果缺少当前携带激光炮');
        const values = [...get(state, target.path)]; values[target.index] = e.item; put(state, target.path, values);
        e.transactions.push({type: 'laser', item: e.item, arrangement: [...e.arrangement]}); return;
      }
    }
    if (op === 0xBA) {e.branch = get(state, `${rolePath(state)}.inventory`).at(-1) ? 1 : 0; return;}
    if (op === 0x9D) {
      const values = [...get(state, `${rolePath(state)}.inventory`)];
      const index = values.indexOf(0);
      if (index < 0) return block(state, '激光炮交付缺少空栏');
      values[index] = e.item; put(state, `${rolePath(state)}.inventory`, values);
      e.transactions.push({type: 'laser', item: e.item, arrangement: [...e.arrangement]}); return;
    }
    return false;
  };
}

// @editor-module 专用服务沿公共应用执行器推进并在未知传递效果前停止。

function specialServiceExecution({command, graph, text, navigation, ...data}) {
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
        if (cid === 0x2B && lens(state, operation) !== false) return;
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

// @editor-module 专用服务取得当前字段并复用已发布画面的组件与控件。

async function startSpecialServiceExecution(model, selected, dependencies) {
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', service: 'service-list-selector', rental: 'rental-list-selector', lens: 'laser-arrangement-selector'};
  const [raw, items, vehicles, overlays, interfaces, selectionLayout, selectionMovement, selectors, codes] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readDocument('vehicle-preset'),
    dependencies.readDocument('shared-indexed-byte-overlays'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(names), read), facilityRuntimeCodeValues(['minor-repair-price',
      'armor-equipment-item-limit', ...Array.from({length: 10}, (_, index) => `chassis-weight-price-${index}`),
      ...Array.from({length: 5}, (_, index) => `chassis-upgrade-weight-${index}`)], read),
  ]);
  const count = model.record.id ? (await dependencies.readField('facility-config', model.record.id, 'payload_length')).value : 0;
  const goods = await Promise.all(Array.from({length: count}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const rows = raw.all(`save.slot.${dependencies.context.slot}.`);
  const adapter = specialServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    items, vehicles, overlays, codes, goods, fieldStatuses: Object.fromEntries(rows.map(row => [row.fieldId, row.status])),
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(selectors, name)]))}});
  const context = {...dependencies.context,
    activeSaveSlot: raw.find('save.directory.selected_slot')?.value};
  const initial = adapter.initial({fields: Object.fromEntries(rows.map(row => [row.fieldId, structuredClone(row.value)])), context});
  selected.executionAdapter = adapter; selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0; delete selected.restoredPreview;
  return initial;
}

async function specialServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  if (node.pause.kind === 'choice') preview.selection_cursor = {
    resource_id: 'selection-layout', kind: 'inline-text-confirm', protocol: 'text-confirmation'};
  if (execution) {
    const e = execution.execution;
    preview.runtime_context = {...preview.runtime_context, save_slot: execution.context.slot,
      role_slot: execution.context.role, vehicle_slot: execution.context.vehicle, shop_instance: selected.instance,
      choice_index: execution.selections.choice, list_choice_index: execution.selections.choice,
      shop_item_index: e.rentalChoice ?? 0, upgrade_kind: e.project, upgrade_part: e.hole,
      service_amount: execution.context.service_amount,
      service_part: e.weapon, lens_arrangement: e.arrangement, laser_item: e.item};
    preview.service_preview_state = {values: execution.fields, selection: execution.context,
      terminal: {service_amount: execution.context.service_amount, repair_part: e.weapon,
        upgrade_kind: e.project, upgrade_part: e.hole}, conditions: []};
  } else preview = await dependencies.resolveConditions(preview);
  preview = await dependencies.resolveMenu(preview);
  if (execution?.pause?.kind === 'menu') execution.execution.menuSelector = preview.selection_cursor?.selector;
  if (execution?.execution.arrangement) preview.layers = preview.layers.map(layer =>
    layer.kind === 'laser_lens_runtime' ? {...layer,
      slots: execution.execution.arrangement.flatMap((id, index) => id ? [index] : [])} : layer);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}

// @editor-module 商店阶段适配器提供临时上下文、区域内容与窗口历史。

async function startGenericShopExecution(model, selected, dependencies) {
  if (model.graph.device) {
    const context = {...structuredClone(dependencies.context),
      service: {...dependencies.context.service, command: model.command.command_id, argument: selected.instance}};
    const {adapter, session} = await startDeviceServiceExecution(model, context, dependencies);
    selected.executionAdapter = adapter;
    selected.previewSession = session;
    selected.node = session.state.node; selected.step = 0;
    delete selected.restoredPreview;
    return session.state;
  }
  if (model.graph.special) return startSpecialServiceExecution(model, selected, dependencies);
  if (model.graph.quantities) return startListQuantityServiceExecution(model, selected, dependencies);
  if (model.graph.service) return startSimpleServiceExecution(model, selected, dependencies);
  const selectorNames = {1: 'shop-menu-selector', 6: 'shop-goods-selector', 14: 'shop-actor-selector',
    22: 'shop-actor-selector', 25: 'sale-inventory-category-selector', 29: 'sale-inventory-item-selector'};
  const [rawFields, items, overlays, effects, count, interfaces, selectionLayout, selectionMovement, codeValues] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'),
    dependencies.readDocument('shared-indexed-byte-overlays'), dependencies.readDocument('role-equipment-derived'),
    dependencies.readField('facility-config', model.record.id, 'payload_length'),
    dependencies.readInterfaces(), dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(selectorNames), source => dependencies.readField(source.resource_id, source.entity_handle, source.field)),
  ]);
  const goods = await Promise.all(Array.from({length: count.value}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const fields = Object.fromEntries(rawFields.all(`save.slot.${dependencies.context.slot}.`)
    .map(field => [field.fieldId, structuredClone(field.value)]));
  const prefix = `save.slot.${dependencies.context.slot}.`;
  if (selected.path === 'funds') fields[prefix + 'gold'] = 0;
  const adapter = genericShopExecution({command: model.command, graph: model.graph,
    text: dependencies.text, goods, items: items.records, overlays, effects, ammunition: [...overlays.level_value_codebook, overlays.zero_prefixed_ascending_bit_masks[0]],
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(selectorNames).map(([control, name]) => [control, fieldSubmenuCodeValue(codeValues, name)]))}});
  const initial = adapter.initial({fields, context: dependencies.context});
  if (selected.path === 'refused') initial.selections.choice = 1;
  selected.executionAdapter = adapter;
  selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

async function genericShopFramePlan(model, selected, dependencies) {
  if (model.graph.special) return specialServiceFramePlan(model, selected, dependencies);
  if (model.graph.quantities) return listQuantityServiceFramePlan(model, selected, dependencies);
  if (model.graph.service && !model.graph.device) return simpleServiceFramePlan(model, selected, dependencies);
  const node = model.graph.nodes.find(node => node.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  if (model.graph.device) {
    const preview = deviceServicePreview(model, {...selected, session: selected.previewSession}, source.preview);
    preview.runtime_context = {...preview.runtime_context, save_slot: dependencies.context.slot,
      facility_instance: selected.instance};
    return {source, preview, lower: null, contents: {device: preview}};
  }
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  const context = structuredClone(execution?.context || dependencies.context);
  let preview = {...structuredClone(source.preview), runtime_context: {...source.preview.runtime_context,
    save_slot: context.slot, role_slot: context.role, vehicle_slot: context.vehicle,
    shop_instance: selected.instance,
    ...(execution ? {choice_index: execution.selections.choice, shop_item_index: execution.execution.goods,
      sale_item_index: selected.executionAdapter.saleIndex(execution),
      list_choice_index: execution.selections.choice} :
      selected.path && node.binding === 'buy-sell' ? {choice_index: selected.path === 'refused' ? 1 : 0} : {})}};
  if (execution) {
    preview.service_preview_state = {values: execution.fields,
      selection: execution.context, terminal: {}, conditions: []};
    if (preview.shop_menu.sale_item_bar) preview.shop_menu.sale_item_bar = execution.execution.category ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  const path = model.paths.find(path => path.id === selected.path);
  if (!execution) preview = await genericShopServicePreview(preview, {...dependencies,
    path: selected.path, record: model.record, command: model.command,
    final: path && selected.step === path.nodes.length - 1});
  preview = await dependencies.resolveMenu(preview);
  const lower = execution ? {list: Boolean(execution.execution.objectList),
    cursor: [14, 22].includes(execution.control), dependsOn: '输入历史',
    source: model.graph.nodes.find(row => row.segment.index === execution.execution.objectList)}
    : genericShopSelection(model.graph, selected, model.paths, model.party?.count);
  let selectionPreview = null;
  if (lower) {
    const template = lower.list ? genericShopPreview(lower.source, model.command, model.previews)?.preview
      : model.previews.find(row => row.interface_state_id === 'field-command-menu.main');
    if (!template) throw new TypeError('商店左下区缺少对应预览构造');
    selectionPreview = {...structuredClone(template), runtime_context: {...template.runtime_context,
      ...preview.runtime_context, cursor_hidden: !lower.cursor}, service_preview_state: preview.service_preview_state};
    if (!lower.cursor) {
      delete selectionPreview.selection_cursor;
      delete selectionPreview.selection_cursors;
      delete selectionPreview.retained_selection_cursors;
      delete selectionPreview.menu_highlight;
    }
  }
  const dialoguePreview = source.dialoguePreview ? {...source.dialoguePreview,
    runtime_context: preview.runtime_context, service_preview_state: preview.service_preview_state} : null;
  return {source, preview, lower, contents: {name: preview, list: preview,
    selection: selectionPreview || preview, dialogue: dialoguePreview || preview}};
}

function genericShopPreviewSnapshot(model, selected, plan, context) {
  return interfacePreviewState({context, entry: model.graph.entry, node: selected.node,
    control: model.graph.nodes.find(node => node.id === selected.node)?.segment?.index ?? null,
    pause: model.graph.nodes.find(node => node.id === selected.node)?.pause,
    fields: plan?.preview.service_preview_state?.values || {},
    windows: Object.entries(plan?.contents || {}).map(([id, content]) => ({id, content,
      cursor: id === 'selection' ? plan.lower?.cursor : null})),
    selections: plan?.preview.service_preview_state?.selection || {},
    domainResults: {framePlan: plan},
    view: {path: selected.path, step: selected.step, objectSelected: selected.objectSelected, mode: 'sample-view'}});
}

function genericShopRegionSlots(area, region, previews) {
  const overlaps = slot => interfaceBoundsOverlap(slot.bounds, region.bounds);
  const slots = area.slots.filter(overlaps);
  const names = slot => /^submenu-(role|vehicle):/u.test(slot.id) && overlaps(slot);
  if (region.id !== 'selection' || slots.some(names)) return slots;
  const preview = area.preview;
  const menu = previews.find(row => row.interface_state_id === 'field-command-menu.main')
    ?.layers.find(layer => layer.kind === 'layout');
  const lowerLayout = layer => layer.kind === 'layout' && layer.record === menu?.record && layer.shift === menu?.shift;
  if (!preview?.layers.some(layer => lowerLayout(layer) && layer.preserve_glyph_cache_tiles)) return slots;
  for (const stage of [...(preview.glyph_cache_history || [])].reverse()) {
    const inherited = (stage.component_slots || []).filter(names);
    if (inherited.length) return [...slots, ...inherited];
    if (stage.layers.some(layer => lowerLayout(layer) && !layer.preserve_glyph_cache_tiles)) break;
  }
  return slots;
}

// @editor-module 商店页面共用状态机、区域预览、组件树与字段对象控件。

function createShopStateWorkbench({namespace = 'generic-shop', selection, fixedFamily = null,
  fixedCommand = null, toolbarMarkup = '', instanceControl = true, mountComponent = null,
  onInstanceChange = () => {}, widgetFields = () => [], inspectorMarkup = '',
  bindInspector = async () => {}, evidenceVisible = true, previewScene = false,
  pathsInPreview = false, startAtEntry = false, quantityPreview = false, getEntry = () => '',
  componentNodes = () => [], previewFor = preview => preview, decoratePreview = preview => preview, previewToolbarMarkup = '',
  bindPreviewControls = () => {}, onNodeChange = () => {}} = {}) {
  let model, workbench;
  const paintGenerations = new WeakMap();
  const inspectorGenerations = new WeakMap();

  function previewDependencies() {
    return {context: structuredClone(interfacePreviewContext()),
      text: state.project.text_record_edits,
      readFields: () => ensureSaveCurrentFieldObjects(state),
      readDocument: resource => resource.startsWith('project.') ? db.getDocument(resource) : db.getResourceDocument(resource),
      readInterfaces: () => db.getDocument('project.ui.interfaces'),
      readField: (resource, handle, name) => db.getField(resource, handle, name),
      resolveConditions: preview => resolveServiceConditionPreview(previewFor(preview, model)),
      resolveMenu: async preview => decoratePreview(await resolveShopMenuPreview(preview), model)};
  }

  async function readParty(command) {
    return genericShopParty(command, {fields: await ensureSaveCurrentFieldObjects(state), context: interfacePreviewContext()});
  }

  function resetPreviewHistory() {
    const selected = selection();
    selected.previewSession = new InterfacePreviewSession({context: interfacePreviewContext()});
    selected.previewPositions = new Map();
    delete selected.executionAdapter;
    delete selected.restoredPreview;
  }

  async function prepareModel() {
    const selected = selection();
    const [facilities, configuration, dispatch, interfaces] = await Promise.all([
      db.getDocument('project.facilities'), db.getResourceDocument('facility-config'),
      db.getDocument('project.ui.dispatch'), db.getDocument('project.ui.interfaces'),
    ]);
    const shopFamilies = new Set(SHOP_PAGES.map(page => page.route.shopFamily));
    const families = facilities.configuration_loader.pointer_entries.filter(entry => shopFamilies.has(entry.family_id)
      &&
      configuration.families.some(family => Number(family.id) === Number(entry.family_id))
      && facilities.applications.commands.some(command => command.configuration_family?.family_id === entry.family_id));
    families.push(...facilities.applications.commands.filter(command => [...SIMPLE_SERVICE_COMMANDS, ...LIST_QUANTITY_COMMANDS, ...SPECIAL_SERVICE_COMMANDS].includes(command.command_id)
      && !command.configuration_family).map(command => ({family_id: 0x100 + command.command_id,
        command_id: command.command_id, label: command.label})));
    if (fixedFamily != null) selected.family = fixedFamily;
    if (fixedFamily != null && !families.some(entry => entry.family_id === fixedFamily))
      throw new TypeError('商店缺少所属类型的状态机');
    const requestedCommand = fixedCommand == null ? null : facilities.applications.commands.find(row => row.command_id === fixedCommand);
    const family = requestedCommand ? {...families.find(entry => entry.family_id === requestedCommand.configuration_family?.family_id),
      family_id: requestedCommand.configuration_family?.family_id ?? 0x100 + fixedCommand,
      command_id: fixedCommand, label: requestedCommand.label} : families.find(entry => entry.family_id === selected.family) || families[0];
    selected.family = family.family_id;
    const aliases = configuration.families.find(row => Number(row.id) === selected.family)?.records
      || [{id: 0, record_id: null}];
    if (fixedCommand == null && !aliases.some(row => row.id === selected.instance)) {
      selected.instance = aliases[0].id;
      if (fixedFamily != null) onInstanceChange(selected.instance);
    }
    const alias = aliases.find(row => row.id === selected.instance);
    const record = configuration.records.find(row => row.id === alias?.record_id) || {id: null, slots: []};
    const command = requestedCommand || facilities.applications.commands.find(row => family.command_id === row.command_id
      || row.configuration_family?.family_id === selected.family);
    const previews = dispatch.previews;
    const context = bindServicePreviewScene(command.command_id, selected.instance);
    const graph = genericShopGraph(command, state.project.text_record_edits, previews, interfaces.application_branch_sources,
      {catalog: interfaces, invocation: {sceneId: context.scene?.sceneId, argument: selected.instance}});
    const entry = getEntry();
    if (entry !== selected.entryRequest) {
      const entryState = entry?.split(':state:').at(-1);
      const component = componentNodes({command, family, record, graph, previews})
        .find(widget => widget.serviceFragment === entry);
      const target = startAtEntry && entry === command.dialogue_flow?.segments[0]?.id
        ? graph.nodes.find(node => node.id === graph.entry) : graph.nodes.find(node => {
        const preview = genericShopPreview(node, command, previews)?.preview;
        return node.id === component?.nodeId || node.id === entry || node.segment?.id === entry || node.action?.id === entry
          || preview?.id === entry || preview?.interface_entry_id === entry || preview?.interface_state_id === entryState;
      }) || graph.nodes.find(node => node.segment?.actions?.some(action => action.id === entry));
      if (target) {
        selected.node = target.id;
        selected.widget = component?.id || 'screen'; selected.edge = null; selected.path = ''; selected.step = 0;
        resetPreviewHistory();
      }
      if (component) selected.widget = component.id;
      selected.entryRequest = entry;
    }
    const party = graph.basic ? await readParty(command) : null;
    const paths = genericShopPaths(graph, party?.count);
    if (!graph.nodes.some(node => node.id === selected.node)) selected.node = startAtEntry || fixedCommand != null ? graph.entry : graph.nodes.find(node =>
      node.binding === 'buy-sell' && genericShopPreview(node, command, previews))?.id
      || graph.nodes.find(node => genericShopPreview(node, command, previews))?.id || graph.entry;
    if (selected.path !== 'input' && !paths.some(path => path.id === selected.path && path.available)) selected.path = '';
    model = {command, family, record, graph, paths, previews, party};
    const commandDocument = await db.getResourceDocument(`application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`);
    workbench = createInterfaceStateControllerWorkbench({command: commandDocument, selection,
      contextRequirements: ['preview-context', 'save-fields', 'service-invocation'],
      entry: {instance: selected.instance, request: entry, caller: context.scene || null},
      graph: () => model.graph, paths: () => model.paths,
      presentation: genericShopGraphPresentation, available: node => genericShopPreview(node, model.command, model.previews),
      initialize: graph.basic || graph.service || graph.device
        ? () => startGenericShopExecution(model, selection(), previewDependencies()) : null,
      inputs: () => {
        const snapshot = selection().path && selection().previewSession?.state;
        if (snapshot?.execution?.status !== 'waiting') return [];
        const options = selection().executionAdapter.options(snapshot);
        return [...(options.length ? ['up', 'down', 'left', 'right', 'option'] : []), 'a', 'b',
          ...(snapshot.pause?.quantity ? ['amount'] : []),
          ...([0x2C, 0x22].includes(model.command.command_id) ? ['random'] : []),
          ...(model.command.command_id === 0x2C && snapshot.control === 0 ? ['amount'] : [])];
      },
      preview: () => genericShopFramePlan(model, selection(), previewDependencies()),
      references: () => record.id ? [{resourceId: 'facility-config', handle: record.id, field: null}] : [],
      components: {
        current: () => model.widgets || [], selected: () => selection().widget,
        select: id => {selection().widget = id; selection().edge = null;},
        fields: id => {
          const widget = model.widgets?.find(row => row.id === id);
          if (!widget) return [];
          const records = [...new Set([widget.record, ...(widget.components || []).map(component => component.recordId)].filter(Boolean))];
          return [...records.map(handle => ({resourceId: 'text-record', handle, field: null})),
          ...(widget.textEditor ? [{resource: 'text-record', handle: widget.textEditor.recordId}] : []),
          ...genericShopWidgetFields(widget, {mode: genericShopPreview(model.graph.nodes.find(node =>
            node.id === selection().node), model.command, model.previews)?.preview?.shop_menu?.mode,
          record: model.record, family: model.family}), ...widgetFields(widget, model)];
        },
        mount: (...args) => inspector(...args),
      }});
    return {families, family, aliases, configuration, paths, graph, command, previews};
  }

  async function render() {
    const selected = selection();
    const {families, family, aliases, configuration, paths, graph, command, previews} = await prepareModel();
    if (!graph.nodes.some(node => genericShopPreview(node, command, previews))) {
      model.widgets = componentNodes(model, null);
      if (!model.widgets.some(widget => widget.id === selected.widget)) selected.widget = model.widgets[0]?.id;
      return screenWorkbench({namespace, heightMode: 'fill', toolbarMarkup,
        treeTitle: '组件树', treeMarkup: elementTree({nodes: model.widgets,
          selectedId: selected.widget, showIcons: false,
          buttonAttributes: widget => ({'data-generic-widget': widget.id})}),
        inspectorTitle: model.widgets.find(widget => widget.id === selected.widget)?.label || '属性',
        inspectorMarkup: '<div data-generic-inspector></div>'});
    }
    const instanceFamily = {...family, records: aliases.map(row => ({...row,
      values: configuration.records.find(record => record.id === row.record_id)?.slots.map(slot => slot.value) || []}))};
    const instancePicker = shopConfigurationPicker({family: instanceFamily, recordId: selected.instance,
      controlAttribute: 'data-generic-instance', label: '门店',
      labelForRecord: record => facilityConfigurationLabel({...family, id: record.id},
        record.values, record.id, {showHandle: false}),
      productsForRecord: (_family, record) => record.values.map((value, index) => {
        const namespace = family.value_namespace?.slot_schema?.slots?.find(slot => Number(slot.slot) === index)?.namespace
          || family.value_namespace?.namespace;
        const item = namespace === 'item'
          ? state.project.game_data.items.records.find(row => row.id === value) : null;
        const good = family.value_namespace?.goods?.find(row => row.value === value);
        return {item, label: currentTextReference(item ? itemNameRecordId(item) : good?.text_record).label || String(value)};
      })});
    const context = interfacePreviewContext();
    const pathMarkup = `<label class="screen-workbench-selection">路径 <select data-generic-path><option value="">自由查看</option>${graph.basic || graph.service || graph.device ? '<option value="input">输入推进</option>' : ''}${paths.map(path =>
      `<option value="${path.id}"${path.id === selected.path ? ' selected' : ''}${path.available ? '' : ' disabled'}>${esc(path.label)}</option>`).join('')}</select></label>
      <button class="button" type="button" data-generic-step="-1"${!selected.path || selected.step === 0 ? ' disabled' : ''}>上一步</button>
      <button class="button" type="button" data-generic-step="1"${!selected.path || selected.step >= (paths.find(path => path.id === selected.path)?.nodes.length || 0) - 1 ? ' disabled' : ''}>下一步</button>
      <span data-generic-path-position></span>`;
    return screenWorkbench({namespace, className: 'generic-shop-workbench', heightMode: 'fill', bottomSize: 'resizable', bottomFit: true,
      toolbarMarkup: !toolbarMarkup && fixedFamily != null && !instanceControl && pathsInPreview ? '' : `<div class="screen-workbench-stage-toolbar">${toolbarMarkup}${fixedFamily == null && fixedCommand == null ? `<label class="screen-workbench-selection">商店类型 <select data-generic-family>${families.map(entry =>
        `<option value="${entry.family_id}"${entry.family_id === selected.family ? ' selected' : ''}>${esc(entry.label)}</option>`).join('')}</select></label>` : ''}
        ${instanceControl ? `<span${model.record.id && fixedCommand == null ? '' : ' hidden'}>${instancePicker}</span>` : ''}${pathsInPreview ? '' : pathMarkup}</div>`,
      treeTitle: '组件树', treeMarkup: '<div data-generic-widget-tree></div>',
      stageMarkup: screenWorkbenchCanvasStage({namespace, sizing: 'fill',
        toolbarMarkup: `${pathsInPreview ? pathMarkup : ''}${interfacePreviewSlotPicker({value: context.slot, slots: [1, 2, 3],
          controlMarkup: `<select data-generic-preview="slot">${[1, 2, 3].map(slot => `<option${slot === context.slot ? ' selected' : ''}>${slot}</option>`).join('')}</select>`})}
          ${interfacePreviewSaveActorPicker({slot: context.slot, kind: 'role', value: context.role,
            controlMarkup: `<select data-generic-preview="role">${['猎人', '机械师', '战士'].map((label, index) => `<option value="${index}"${index === context.role ? ' selected' : ''}>${label}</option>`).join('')}</select>`})}
          ${interfacePreviewSaveActorPicker({slot: context.slot, kind: 'vehicle', value: context.vehicle,
            controlMarkup: `<select data-generic-preview="vehicle">${Array.from({length: 11}, (_, index) => `<option value="${index}"${index === context.vehicle ? ' selected' : ''}>${index + 1}</option>`).join('')}</select>`})}
          <label class="screen-workbench-selection"${graph.basic ? '' : ' hidden'}><input type="checkbox" data-generic-object-selected${selected.objectSelected ? ' checked' : ''}>已选过对象</label>
          <span data-generic-inputs hidden><select data-generic-option aria-label="输入选项"></select>${[['up', '↑'], ['down', '↓'], ['left', '←'], ['right', '→'], ['a', 'A'], ['b', 'B']].map(([input, label]) =>
            `<button class="button" type="button" data-generic-input="${input}">${label}</button>`).join('')}</span>
          <span data-generic-trade-inputs hidden><label>报价 <input type="number" data-generic-amount min="0" max="9999999" step="1" aria-label="交易报价"></label>
            <label>随机输入 <input type="number" data-generic-random min="0" max="255" step="1" aria-label="随机输入"></label></span>
          <label data-generic-quantity-input hidden>数量 <input type="number" data-generic-quantity min="0" step="1" aria-label="数量"></label>${previewToolbarMarkup}${previewScene ? interfacePreviewSceneMarkup() : ''}`,
        canvasMarkup: '<canvas width="256" height="240" data-generic-canvas aria-label="通用商店状态画面"></canvas>',
        zoomStatusMarkup: '<span data-generic-temporary></span><span data-generic-frame-status role="status"></span>'}),
      inspectorTitle: selected.edge ? '转移' : '属性', inspectorMarkup: '<div data-generic-inspector></div>',
      bottomMarkup: workbench.graphMarkup(),
    });
  }

  async function regionPreview(root) {
    const generation = (paintGenerations.get(root) || 0) + 1;
    paintGenerations.set(root, generation);
    const isCurrent = () => root.isConnected && paintGenerations.get(root) === generation;
    const selected = selection(), node = model.graph.nodes.find(node => node.id === selected.node);
    const source = genericShopPreview(node, model.command, model.previews);
    const canvas = root.querySelector('[data-generic-canvas]'), context = canvas.getContext('2d');
    const clearFrame = () => {
      if (model.graph.device) context.clearRect(0, 0, 256, 240);
      else {context.fillStyle = '#000'; context.fillRect(0, 0, 256, 240);}
    };
    canvas.dataset.genericPainting = '';
    root.querySelector('[data-generic-frame-status]').textContent = '';
    if (selected.executionAdapter && selected.path && selected.previewSession.state.execution.status === 'returned') {
      clearFrame();
      root.querySelector('[data-generic-temporary]').textContent = '已返回场景交互';
      canvas.dataset.genericState = node.id;
      canvas.dataset.genericRegions = '[]';
      delete canvas.uiGenericShopFrame;
      delete canvas.dataset.genericPainting;
      return {regions: [], source: null, temporary: []};
    }
    if (!source) {
      clearFrame();
      root.querySelector('[data-generic-temporary]').textContent = selected.previewSession.state.execution?.callLabel || '';
      canvas.dataset.genericState = node.id;
      delete canvas.uiGenericShopFrame;
      delete canvas.dataset.genericRegions;
      delete canvas.dataset.genericPainting;
      return {regions: node.regions.map(region => ({...region, sources: [region.source], components: []})), source: null, temporary: []};
    }
    try {
      const plan = selected.restoredPreview?.domainResults.framePlan || await workbench.preview();
      if (!isCurrent()) return null;
      const {preview, lower} = plan;
      const background = await interfacePreviewSceneImage(preview.interface_preview_state || null);
      if (!isCurrent()) return null;
      const regions = await paintInterfaceStateFrame(canvas, node.regions, {
        background,
        resolve: region => plan.contents[region.id],
        paint: (surface, regionSource) => paintUiConstructionSemanticPreview(surface, regionSource,
          {isCurrent, backgroundCanvas: canvas}),
        read: uiConstructionPreviewRegion, isCurrent,
        decorate: (region, {area, source: regionSource}) => {
          const slots = genericShopRegionSlots(area, region, model.previews);
          const label = region.id === 'selection' ? slots.some(slot => /^submenu-(role|vehicle):/u.test(slot.id))
            ? '人物·战车选择' : '主菜单' : region.label;
          return {...region, label, ...(region.id === 'selection' && lower
            ? {cursor: lower.cursor, dependsOn: lower.dependsOn, retention: '对象列表保留至退出商店'} : {}),
            sources: [region.source, region.reference, regionSource.id,
              ...new Set(region.components.map(component => component.recordId).filter(Boolean))],
            slots, preview: area.preview};
        }});
      if (!regions || !isCurrent()) return null;
      if (!selected.previewSession) resetPreviewHistory();
      if (selected.executionAdapter && selected.path) {
        selected.previewSession.project({windows: Object.entries(plan.contents).map(([id, content]) => ({id, content})),
          domainResults: {...selected.previewSession.state.domainResults, framePlan: plan}});
      } else if (!selected.restoredPreview) {
        selected.previewSession.capture(genericShopPreviewSnapshot(model, selected, plan, interfacePreviewContext()));
        if (selected.path) selected.previewPositions.set(selected.step, selected.previewSession.position);
      }
      delete selected.restoredPreview;
      const execution = selected.executionAdapter && selected.path ? selected.previewSession.state.execution : null;
      root.querySelector('[data-generic-temporary]').textContent = execution
        ? model.graph.device ? execution.reason || node.label
          : `金钱 ${selected.previewSession.state.fields[`save.slot.${selected.previewSession.state.context.slot}.gold`]} · 成交 ${execution.transactions.length}${execution.reason ? ` · 未确认：${execution.reason}` : execution.status === 'returned' ? ' · 已返回场景交互' : ''}`
        : preview.service_preview_state?.conditions.length
        ? `已临时满足：${preview.service_preview_state.conditions.map(row => row.label).join('、')}` : '';
      root.querySelector('[data-generic-temporary]').title = root.querySelector('[data-generic-temporary]').textContent;
      canvas.dataset.genericState = node.id;
      canvas.dataset.genericRegions = JSON.stringify(regions.map(({components, slots, preview, ...region}) => region));
      canvas.uiGenericShopFrame = {regions, preview};
      return {regions, source, temporary: preview.service_preview_state?.conditions || []};
    } catch (error) {
      editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
      if (isCurrent()) {
        const status = root.querySelector('[data-generic-frame-status]');
        status.textContent = status.title = error.message;
      }
      return null;
    } finally {
      if (isCurrent()) delete canvas.dataset.genericPainting;
    }
  }

  function retainScrollRange(scroller, content) {
    content.style.minHeight = scroller.scrollTop > 0 ? `${content.getBoundingClientRect().height}px` : '';
  }

  function widgetFactsMarkup(widget) {
    const {bounds, components = []} = widget;
    return `<dl class="screen-workbench-facts" data-generic-widget-facts><div><dt>位置</dt><dd>${bounds.x}, ${bounds.y}</dd></div>
      <div><dt>尺寸</dt><dd>${bounds.width} × ${bounds.height}</dd></div>
      <div><dt>来源</dt><dd>${esc([...new Set(components.map(row => row.recordId))].join('、'))}</dd></div></dl>`;
  }

  function positionRuntimePanel(root) {
    const panel = root.ownerDocument.querySelector('[data-runtime-page-panel]');
    if (!panel) return;
    panel.open = false;
    root.querySelector('.workspace-inspector').append(panel);
  }

  async function inspector(root, result, rerender) {
    const generation = (inspectorGenerations.get(root) || 0) + 1;
    inspectorGenerations.set(root, generation);
    const isCurrent = () => root.isConnected && inspectorGenerations.get(root) === generation;
    const selected = selection(), host = root.querySelector('[data-generic-inspector]');
    const edge = model.graph.edges.find(edge => edge.id === selected.edge);
    if (edge) {
      root.querySelector('.workspace-inspector > h3').textContent = '转移';
      const members = model.graph.edges.filter(row => row.id === edge.id || selected.edgeIds?.includes(row.id));
      const declarationLabel = label => label.replace(/(?: · (?:条件／)?效果未确认| 的完整效果未确认)(?=；|$)/gu, '');
      const declarationValues = values => values.filter(value => !['未确认', '完整效果未确认'].includes(value))
        .map(value => value.replace('已发布调用参数', '调用参数').replace('已确认字段效果', '字段效果'));
      host.innerHTML = `<dl class="screen-workbench-facts"><dt>输入 / 选项</dt><dd>${esc([...new Set(members.map(row => row.input))].join(' / '))}</dd><dt>条件</dt><dd>${esc([...new Set(members.map(row => declarationLabel(row.condition || '')).filter(Boolean))].join('；') || '无附加条件')}</dd>
        <dt>来源</dt><dd>${esc(model.graph.nodes.find(node => node.id === edge.from)?.label)}</dd><dt>去向</dt><dd>${esc(model.graph.nodes.find(node => node.id === edge.to)?.label || '应用返回')}</dd>${evidenceVisible && edge.evidence ? `<dt>证据</dt><dd>${esc(edge.evidence)}</dd>` : ''}</dl>
        ${members.map(member => `<h4>${esc(member.input)}</h4>${member.routes.map(route => `<p>控制段：${route.controls.map(index => String(index).padStart(2, '0')).join(' → ')}${route.arrival == null ? '' : ` → ${String(route.arrival).padStart(2, '0')}（到输入等待）`}</p>${route.declarations.map(row =>
          `<dl class="screen-workbench-facts"><dt>${esc(declarationLabel(row.label))}</dt><dd>读取：${esc(declarationValues(row.reads).join('、'))}</dd><dd>效果：${esc(declarationValues(row.writes).join('、') || (row.confirmed ? '无写入' : ''))}</dd>${evidenceVisible ? `<dd>证据：${esc(row.evidence)}</dd>` : ''}</dl>`).join('')}`).join('')}`).join('')}`;
      return;
    }
    const declarations = result?.regions || [];
    const widget = model.widgets.find(row => row.id === selected.widget);
    const region = widget?.region;
    const node = model.graph.nodes.find(node => node.id === selected.node);
    root.querySelector('.workspace-inspector > h3').textContent = widget?.label || '属性';
    if (mountComponent && await mountComponent(host, widget, {model, rerender, isCurrent})) return;
    if (widget?.textEditor) {
      host.innerHTML = fixedTextEditorMarkup({...widget.textEditor, editorId: `${namespace}:${widget.id}`, label: widget.label});
      await bindFixedTextEditors(host, {onSaved: ({reset}) => rerender({refreshInspector: Boolean(reset)})})?.ready;
      if (isCurrent()) positionRuntimePanel(root);
      return;
    }
    if (!region) {
      const snapshot = selected.executionAdapter && selected.path && (model.graph.special || model.graph.device)
        ? selected.previewSession.state.domainResults : null;
      const laserItem = snapshot?.laser && state.project.game_data.items.records.find(row => row.id === snapshot.laser.item);
      host.innerHTML = `${node.pause.kind === 'unknown' ? '' : `<p>${esc(node.input)}</p>`}${result?.temporary.length ? `<p>服务临时状态：${result.temporary.map(row => esc(row.label)).join('、')}</p>` : ''}
      ${selected.executionAdapter && selected.path && evidenceVisible ? `<p class="muted">证据：${esc(selected.executionAdapter.evidence)}</p>` : ''}
      ${snapshot?.party ? `<dl class="screen-workbench-facts"><dt>当前队伍</dt><dd>${snapshot.party.map(row => esc(`${['猎人', '机械师', '战士'][row.role]}：${row.status === 255 ? '尸体' : '存活'} · ${row.vehicle < 128 ? `战车 ${row.vehicle + 1}` : '步行'}`)).join('<br>')}</dd></dl>` : ''}
      ${snapshot?.laser ? `<dl class="screen-workbench-facts"><dt>镜片排列</dt><dd>${snapshot.laser.arrangement.map(id => id ? id.toString(16).toUpperCase() : '空').join(' → ')}</dd><dt>组合结果</dt><dd>${esc(`物品 ${snapshot.laser.item.toString(16).toUpperCase()}${laserItem ? ` · ${currentTextReference(itemNameRecordId(laserItem)).label}` : ''}`)}</dd></dl>` : ''}
      ${snapshot?.parkedVehicle ? `<p>${esc(snapshot.parkedVehicle.positionStatus)}</p>` : ''}
      ${snapshot?.revival ? `<p>${esc(snapshot.revival.animationStatus)}</p>` : ''}
      ${snapshot?.call ? `<p>结局交接：${esc(snapshot.call.pendingEffects.join('、'))}</p>` : ''}
      ${snapshot?.scene ? scenePositionPickerMarkup({entries: state.project.scenes?.editable_scenes || [],
        sceneId: snapshot.scene.sceneId, x: snapshot.scene.x, y: snapshot.scene.y, readOnly: true, label: '到达楼层'}) : ''}
      ${snapshot?.donation ? `<p>${snapshot.donation.paid ? `已扣款 ${snapshot.donation.amount}` : '未扣款'} · 事件 ${esc(snapshot.donation.event)} ${snapshot.donation.eventSet ? '已置位' : '未置位'}</p>` : ''}
      ${evidenceVisible && node.pause.evidence ? `<p class="muted">输入等待证据：${esc(node.pause.evidence)}</p>` : ''}<table class="generic-shop-declarations"><thead><tr><th>区域</th><th>显隐</th><th>光标</th></tr></thead><tbody>${node.regions.map(row => {
      const declaration = declarations.find(item => item.id === row.id);
      return `<tr><td>${esc(declaration?.label || row.label)}</td><td>${declaration?.visible == null ? '' : declaration.visible ? '显示' : '隐藏'}</td><td>${declaration?.cursor ? '◀' : ''}</td></tr>`;
    }).join('')}</tbody></table>${inspectorMarkup}<div data-generic-field-controls></div>`;
      await mountInterfaceWidgetFields(host.querySelector('[data-generic-field-controls]'), widgetFields(widget, model),
        {getObject: (resource, handle) => db.getFieldObject(resource, handle), isCurrent});
      if (!isCurrent()) return;
      await bindInspector(host, {rerender, isCurrent});
      if (!isCurrent()) return;
      host.querySelectorAll('[data-scene-position-picker]').forEach(picker =>
        hydrateScenePositionPicker(picker, {entries: state.project.scenes?.editable_scenes || []}));
      return;
    }
    const components = widget.components || [];
    host.innerHTML = `${widgetFactsMarkup(widget)}
      <div data-generic-field-controls></div><div data-generic-text-controls></div>`;
    const fieldHost = host.querySelector('[data-generic-field-controls]');
    const mode = result?.source?.preview.shop_menu?.mode;
    await mountInterfaceWidgetFields(fieldHost, [...genericShopWidgetFields(widget,
      {mode, record: model.record, family: model.family}), ...widgetFields(widget, model)],
    {getObject: (resource, handle) => db.getFieldObject(resource, handle), isCurrent});
    if (!isCurrent()) return;
    if (region === 'selection') {
      host.querySelector('[data-generic-field-controls]').innerHTML = widget.controlsMarkup || '';
      await paintFieldMenuIcons(root);
      return;
    }
    const records = new Map();
    for (const component of components) {
      if (typeof component.recordId !== 'string' || !component.recordId.startsWith('record:')
          || component.recordId.startsWith('record:03:')) continue;
      const record = state.project.text_record_edits?.records?.[component.recordId];
      if (!record?.editable) continue;
      if (!Number.isInteger(component.offset) || !Number.isInteger(component.length) || component.length < 1) continue;
      if (!textRecordRuntimeWritableRanges(record).some(range => component.offset >= range.offset
        && component.offset + component.length <= range.offset + range.length)) continue;
      if (!records.has(component.recordId)) records.set(component.recordId, new Map());
      records.get(component.recordId).set(component.offset, component.length);
    }
    const textHost = host.querySelector('[data-generic-text-controls]');
    textHost.innerHTML = [...records].map(([recordId, ranges]) =>
      fixedTextEditorMarkup({recordId, editorId: `${namespace}:${region}:${recordId}`, compact: true,
        ranges: fixedTextRecordRangesWithPadding(recordId,
          [...ranges].sort(([a], [b]) => a - b).map(([offset, length]) => ({offset, length})))
          .reduce((merged, {offset, length}) => {
          const last = merged.at(-1);
          if (last && offset <= last.offset + last.length) last.length = Math.max(last.length, offset + length - last.offset);
          else merged.push({offset, length});
          return merged;
        }, []), label: widget.label})).join('');
    await bindFixedTextEditors(textHost, {
      onDraft: () => {root.querySelector('[data-generic-canvas]').dataset.genericPainting = '';},
      onSaved: rerender,
      onState: () => {
        if (host.querySelector('[aria-invalid="true"]')) delete root.querySelector('[data-generic-canvas]').dataset.genericPainting;
      },
    })?.ready;
    if (!isCurrent()) return;
    positionRuntimePanel(root);
  }

  async function bind(root, {rerender}) {
    root = root.querySelector(`[data-screen-workbench="${namespace}"]`);
    if (!root) return;
    const selected = selection();
    if (!selected.previewSession) resetPreviewHistory();
    if (!root.querySelector('[data-generic-canvas]')) {
      const showSelection = () => inspector(root, null, rerender);
      root.addEventListener('click', event => {
        const button = event.target.closest('[data-generic-widget]');
        if (!button || !root.contains(button)) return;
        selected.widget = button.dataset.genericWidget;
        root.querySelectorAll('[data-generic-widget]').forEach(item =>
          item.closest('.element-tree-node').classList.toggle('is-selected', item === button));
        void showSelection().catch(error => {
          root.querySelector('[data-generic-inspector]').textContent = error.message;
        });
      });
      root.addEventListener('field-object-saved', () => {void rerender();});
      await showSelection();
      return;
    }
    const report = error => {
      if (root.isConnected) {
        const status = root.querySelector('[data-generic-frame-status]');
        status.textContent = status.title = error.message;
      }
    };
    let result = null, refreshGeneration = 0, selectionGeneration = 0;
    const graphController = workbench.bind(root, {cacheKey: `${namespace}-graph:${selected.family}`});
    const refreshSelection = async ({keepInspector = false} = {}) => {
      const generation = ++selectionGeneration;
      root.dataset.genericSelecting = '';
      root.querySelectorAll('[data-generic-widget]').forEach(button =>
        button.closest('.element-tree-node').classList.toggle('is-selected', button.dataset.genericWidget === selected.widget));
      root.querySelectorAll('[data-generic-edge]').forEach(edge =>
        edge.classList.toggle('selected', JSON.parse(edge.dataset.genericEdgeIds).includes(selected.edge)));
      const widget = model.widgets?.find(row => row.id === selected.widget);
      const bounds = !selected.edge && widget?.bounds;
      let outline = root.querySelector('[data-interface-selection]');
      if (bounds) {
        if (!outline) {
          outline = document.createElement('div');
          outline.dataset.interfaceSelection = '';
          root.querySelector('[data-generic-canvas]').parentElement.append(outline);
        }
        outline.hidden = false;
        outline.dataset.bounds = JSON.stringify(bounds);
        const {x, y, width, height} = bounds;
        Object.assign(outline.style, {left: `${x / 256 * 100}%`, top: `${y / 240 * 100}%`,
          width: `${width / 256 * 100}%`, height: `${height / 240 * 100}%`});
      } else if (outline) outline.hidden = true;
      const scroller = root.querySelector('.workspace-inspector');
      const {scrollTop, scrollLeft} = scroller;
      retainScrollRange(scroller, root.querySelector('[data-generic-inspector]'));
      try {
        if (keepInspector && bounds) {
          const facts = root.querySelector('[data-generic-widget-facts]');
          if (facts) facts.outerHTML = widgetFactsMarkup(widget);
        } else if (!keepInspector) await inspector(root, result, ({refreshInspector = false} = {}) => refresh({reload: true,
          keepInspector: !refreshInspector && !root.hasAttribute('data-generic-selecting')}));
      }
      finally {
        if (selectionGeneration === generation) {
          scroller.scrollTop = scrollTop; scroller.scrollLeft = scrollLeft;
          delete root.dataset.genericSelecting;
          workbench.rememberSelection();
        }
      }
    };
    const refresh = async ({reload = false, keepInspector = false} = {}) => {
      const generation = ++refreshGeneration;
      inspectorGenerations.set(root, (inspectorGenerations.get(root) || 0) + 1);
      const isCurrent = () => root.isConnected && refreshGeneration === generation;
      root.dataset.genericRefreshing = '';
      try {
        if (reload) {resetPreviewHistory(); await prepareModel();}
        if (!isCurrent()) return;
        if (model.graph.basic) {
          model.party = await readParty(model.command);
          if (!isCurrent()) return;
          const context = selected.executionAdapter && selected.path
            ? selected.previewSession.state.context : interfacePreviewContext();
          if (!selected.executionAdapter || !selected.path) {
            context.role = model.party.role; context.vehicle = model.party.vehicle;
          }
          root.querySelector('[data-generic-preview="role"]').value = context.role;
          root.querySelector('[data-generic-preview="vehicle"]').value = context.vehicle;
          await Promise.all(['role', 'vehicle'].map(kind =>
            syncReferencePickerControl(root.querySelector(`[data-generic-preview="${kind}"]`))));
          if (!isCurrent()) return;
          model.paths = genericShopPaths(model.graph, model.party.count);
          const active = model.paths.find(path => path.id === selected.path);
          if (active && !selected.executionAdapter) {
            selected.step = Math.min(selected.step, active.nodes.length - 1);
            selected.node = active.nodes[selected.step];
          }
        }
        if ((model.graph.basic || model.graph.service || model.graph.device) && selected.path && !selected.executionAdapter)
          await workbench.initialize();
        if (!isCurrent()) return;
        const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
        if (execution) {
          for (const key of ['slot', 'role', 'vehicle']) {
            const control = root.querySelector(`[data-generic-preview="${key}"]`);
            control.value = execution.context[key];
            await syncReferencePickerControl(control);
          }
          if (!isCurrent()) return;
        }
        const path = execution || model.paths.find(path => path.id === selected.path);
        const objectSelected = root.querySelector('[data-generic-object-selected]');
        objectSelected.checked = execution ? Boolean(execution.execution.objectList)
          : Boolean(genericShopSelection(model.graph, selected, model.paths, model.party?.count)?.list);
        objectSelected.disabled = Boolean(path) || !model.graph.basic || model.party.count <= 1
          || model.graph.nodes.find(node => node.id === selected.node).selectionMode !== 'switch';
        root.querySelector('[data-generic-path]').value = selected.path;
        root.querySelector('[data-generic-step="-1"]').disabled = !execution || selected.previewSession.position === 0;
        root.querySelector('[data-generic-step="1"]').disabled = !execution || execution.execution.status !== 'waiting';
        root.querySelector('[data-generic-path-position]').textContent = execution ? `输入 ${selected.previewSession.position}` : '';
        const inputs = root.querySelector('[data-generic-inputs]');
        inputs.hidden = !execution;
        const options = execution ? workbench.options(execution) : [];
        const option = root.querySelector('[data-generic-option]');
        option.innerHTML = options.map((label, index) => {
          const item = /^物品 [0-9A-F]+$/u.test(label) ? state.project.game_data.items.records.find(row =>
            row.id === Number.parseInt(label.slice(3), 16)) : null;
          const name = item ? currentTextReference(itemNameRecordId(item)).label
            : label.startsWith('record:') ? currentTextReference(label).label : label;
          return `<option value="${index}"${index === execution.selections.choice ? ' selected' : ''}>${esc(name)}</option>`;
        }).join('');
        option.hidden = !options.length;
        const tradeInputs = root.querySelector('[data-generic-trade-inputs]');
        tradeInputs.hidden = !execution || ![0x2C, 0x22].includes(model.command.command_id);
        root.querySelector('[data-generic-amount]').parentElement.hidden = model.command.command_id === 0x22;
        const quantityInput = root.querySelector('[data-generic-quantity-input]');
        const previewAmount = !execution && quantityPreview && genericShopPreview(
          model.graph.nodes.find(node => node.id === selected.node), model.command, model.previews)?.preview?.shop_menu?.service_amount;
        quantityInput.hidden = !execution?.pause?.quantity && !previewAmount;
        const quantity = root.querySelector('[data-generic-quantity]');
        quantity.value = execution?.execution.quantity?.value ?? (previewAmount ? interfacePreviewContext().service_amount ?? 0 : 0);
        quantity.max = execution?.execution.quantity?.maximum ?? (previewAmount ? 65535 : 0);
        quantity.disabled = !previewAmount && execution?.execution.status !== 'waiting';
        for (const [selector, value] of [['amount', execution?.context.service_amount], ['random', execution?.randomInputs[0]]]) {
          const control = root.querySelector(`[data-generic-${selector}]`);
          control.value = value ?? 0;
          control.disabled = execution?.execution.status !== 'waiting' || model.command.command_id === 0x2C && execution?.control !== 0;
        }
        inputs.querySelectorAll('button').forEach(button => {
          button.disabled = execution?.execution.status !== 'waiting'
            || !options.length && !['a', 'b'].includes(button.dataset.genericInput);
        });
        workbench.refreshGraph(root);
        graphController?.layout();
        const next = await regionPreview(root);
        if (!isCurrent()) return;
        const widgets = [...await genericShopWidgets(next, model.graph.nodes.find(node => node.id === selected.node), model.record, model.family),
          ...componentNodes(model, next)];
        if (!isCurrent()) return;
        result = next;
        model.widgets = widgets;
        if (!keepInspector && !widgets.some(widget => widget.id === selected.widget)) selected.widget = 'screen';
        const scroller = root.querySelector('.workspace-tree'), {scrollTop, scrollLeft} = scroller;
        retainScrollRange(scroller, root.querySelector('[data-generic-widget-tree]'));
        root.querySelector('[data-generic-widget-tree]').innerHTML = elementTree({nodes: widgets,
          selectedId: selected.widget, showIcons: false,
          buttonAttributes: widget => ({'data-generic-widget': widget.id})});
        scroller.scrollTop = scrollTop; scroller.scrollLeft = scrollLeft;
        await refreshSelection({keepInspector});
      } finally {if (isCurrent()) delete root.dataset.genericRefreshing;}
    };
    const change = (changes, {structure = false} = {}) => {
      if (['family', 'instance', 'path', 'objectSelected'].some(key => key in changes && changes[key] !== selected[key]))
        resetPreviewHistory();
      Object.assign(selected, changes);
      const update = structure ? rerenderElementTreeKeepingSelectionVisible(
        root.querySelector('.element-tree-node.is-selected > button'), rerender) : refresh();
      return update.catch(report);
    };
    const chooseNode = id => {
      if (model.widgets?.find(widget => widget.id === selected.widget)?.textEditor) selected.widget = 'screen';
      onNodeChange(model.graph.nodes.find(node => node.id === id));
      return change({node: id, edge: null, ...(selected.path ? {path: '', step: 0} : {})});
    };
    root.querySelector('[data-generic-family]')?.addEventListener('change', event => change({
      family: Number(event.target.value), instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0}, {structure: true}));
    root.querySelector('[data-generic-full-graph]').addEventListener('click', () => change({fullGraph: !selected.fullGraph, edge: null}, {structure: true}));
    const picker = root.querySelector('[data-generic-instance]')?.closest('[data-module-reference-picker]');
    bindReferencePicker(picker, {paint: hydrateModuleComponents, onSelect: value => {
      onInstanceChange(Number(value));
      return change({instance: Number(value)}, {structure: true});
    }});
    root.querySelector('[data-generic-path]').addEventListener('change', event => {
      const path = model.paths.find(row => row.id === event.target.value);
      if (model.widgets?.find(widget => widget.id === selected.widget)?.textEditor) selected.widget = 'screen';
      change({path: event.target.value === 'input' ? 'input' : path?.id || '', step: 0,
        node: path?.nodes[0] || selected.node, edge: null});
    });
    root.querySelector('[data-generic-object-selected]').addEventListener('change', event =>
      change({objectSelected: event.target.checked}));
    root.querySelectorAll('[data-generic-step]').forEach(button => button.addEventListener('click', () => {
      if (Number(button.dataset.genericStep) > 0) {void input({type: 'a'}).catch(report); return;}
      const snapshot = selected.previewSession?.previous();
      if (snapshot) {
        selected.restoredPreview = snapshot;
        Object.assign(interfacePreviewContext(), snapshot.context);
      }
      if (snapshot) change({step: selected.previewSession.position, node: snapshot.node, edge: null});
    }));
    const input = async value => {
      if (!selected.executionAdapter || root.hasAttribute('data-generic-refreshing')) return;
      const snapshot = workbench.advance(value);
      delete selected.restoredPreview;
      await change({step: selected.previewSession.position, node: snapshot.node, edge: null});
    };
    root.querySelectorAll('[data-generic-input]').forEach(button => button.addEventListener('click', () => {
      void input({type: button.dataset.genericInput}).catch(report);
    }));
    root.querySelector('[data-generic-option]').addEventListener('change', event => {
      void input({type: 'option', index: Number(event.target.value)}).catch(report);
    });
    for (const type of ['amount', 'random']) root.querySelector(`[data-generic-${type}]`).addEventListener('change', event => {
      void input({type, value: Number(event.target.value)}).catch(report);
    });
    root.querySelector('[data-generic-quantity]').addEventListener('change', event => {
      if (quantityPreview && !selected.executionAdapter && event.target.checkValidity()) {
        interfacePreviewContext().service_amount = Number(event.target.value);
        resetPreviewHistory();
        void refresh().catch(report);
        return;
      }
      void input({type: 'amount', value: Number(event.target.value)}).catch(report);
    });
    const activate = event => {
      const element = event.target.closest('[data-generic-node], [data-generic-edge], [data-generic-widget]');
      if (!element || !root.contains(element)) return;
      if (event.type === 'keydown') {
        if (!element.matches('[data-generic-node], [data-generic-edge]') || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
      }
      if (element.dataset.genericWidget) {
        workbench.selectComponent(element.dataset.genericWidget);
        void refreshSelection().catch(report);
      } else if (element.dataset.genericNode) void chooseNode(element.dataset.genericNode);
      else {
        Object.assign(selected, {edge: element.dataset.genericEdge, edgeIds: JSON.parse(element.dataset.genericEdgeIds)});
        void refreshSelection().catch(report);
      }
    };
    root.addEventListener('click', activate);
    root.addEventListener('keydown', activate);
    root.querySelectorAll('[data-generic-preview]').forEach(select => {
      bindReferencePicker(select.closest('[data-module-reference-picker]'));
      select.addEventListener('change', () => {
        resetPreviewHistory();
        interfacePreviewContext()[select.dataset.genericPreview] = Number(select.value);
        if (select.dataset.genericPreview === 'slot') {
          if (selected.path) selected.step = 0;
          for (const kind of ['role', 'vehicle']) updateReferencePickerItems(
            root.querySelector(`[data-generic-preview="${kind}"]`).closest('[data-module-reference-picker]'),
            interfacePreviewSaveActorEntries(Number(select.value), kind));
        }
        void refresh().catch(report);
      });
    });
    root.addEventListener('field-object-saved', () => {void refresh({reload: true}).catch(report);});
    bindPreviewControls(root, {refresh: () => refresh().catch(report)});
    bindScreenWorkbenchBottomResize({namespace, root: root.parentElement});
    bindScreenWorkbenchZoom({namespace, root: root.parentElement, zoom: selected.zoom, onChange: zoom => {selected.zoom = zoom;}});
    if (previewScene) await bindInterfacePreviewScene(root, {rerender});
    try {await refresh();} catch (error) {report(error);}
  }
  return {render, bind};
}

var shopStateWorkbench = /*#__PURE__*/Object.freeze({
  __proto__: null,
  createShopStateWorkbench: createShopStateWorkbench
});

// @editor-module 专用服务页向公共宿主提供正文、字段引用与临时预览输入。

const pages = new Map();

function isSpecialServicePage(definition) {
  return [0x21, 0x22, 0x23, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x30].includes(definition?.commandId);
}

async function renderSpecialServicePage(definition, {inspectorExtraMarkup = ''} = {}) {
  const commandId = `application-command:${definition.commandId.toString(16).toUpperCase().padStart(2, '0')}`;
  const context = interfacePreviewContext();
  const entries = sceneServicePreviewEntries([{command: definition.commandId,
    instance: context.service?.command === definition.commandId ? context.service.argument : 0}],
  context.scene?.sceneId, context.service?.entryHandle);
  const objects = await db.getFieldObjects(commandId);
  const bindings = objects.map(object => ({resource: commandId, handle: object.id, separate: true}));
  let page = pages.get(definition.id);
  if (page?.repository !== state.projectRepository) {
    page = {repository: state.projectRepository, selected: {family: 0x100 + definition.commandId,
      instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit'}};
    pages.set(definition.id, page);
  }
  const selected = page.selected;
  const previewFor = preview => {
    const body = entries.find(entry => `body:${entry.fragmentId}:${entry.preview.id}` === selected.widget);
    return body?.preview && !body.preview.missing?.length ? structuredClone(body.preview) : preview;
  };
  let toolbar = '';
  if ([0x21, 0x2A].includes(definition.commandId)) toolbar += `<label class="screen-workbench-selection">金额
    <input type="number" min="0" max="9999999" data-special-amount value="${esc(context.service_amount ?? '')}"></label>`;
  if (definition.commandId === 0x2A) toolbar += `<label class="screen-workbench-selection">姓名缓冲区
    <input type="text" data-special-name placeholder="十六进制字节，9F 结尾" value="${esc(context.runtime_name_buffer ?? '')}"></label>`;
  if (definition.commandId === 0x2B) toolbar += `<span class="screen-workbench-selection" role="group" aria-label="镜片运行时槽位">镜片槽位
    ${[0, 1, 2, 3].map(index => `<label><input type="checkbox" data-special-lens="${index}"${state.laserLensPreviewSlots?.includes(index) ? ' checked' : ''}>${index + 1}</label>`).join('')}</span>`;
  page.workbench = createShopStateWorkbench({namespace: `special-service:${definition.id}`,
    selection: () => selected, fixedFamily: selected.family, evidenceVisible: false,
    previewScene: true, pathsInPreview: true, getEntry: () => state.interfacePageEntry || '',
    inspectorMarkup: `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue"${definition.commandId === 0x2A
      ? ` title="${esc(entries.find(entry => entry.preview.shop_menu?.game_defect)?.preview.shop_menu.game_defect || '')}"` : ''}>对话窗口 ↗</a>${inspectorExtraMarkup}`,
    widgetFields: widget => widget?.id === 'screen' || widget?.id === 'service-fields' ? bindings : [],
    bindInspector: host => bindRecordLinks(host, route => {location.href = route;}),
    componentNodes: model => {
      const bodies = entries.filter(entry => entry.record).map(entry => {
        const node = model.graph.nodes.find(node => node.action?.id === entry.fragmentId
          && node.publishedPreview?.id === entry.preview.id)
          || model.graph.nodes.find(node => node.publishedPreview?.id === entry.preview.id)
          || model.graph.nodes.find(node => node.action?.id === entry.fragmentId);
        return {id: `body:${entry.fragmentId}:${entry.preview.id}`, label: `${uiRecordComponentLabel(entry.record)}正文`,
          kind: 'text', depth: 2, nodeId: node?.id, serviceFragment: entry.fragmentId,
          textEditor: {recordId: entry.record, mode: 'capacity'}};
      });
      return distinctUiComponentLabels([{id: 'service-fields', label: '服务字段', kind: 'group', depth: 1},
        {id: 'service-bodies', label: '回应正文', kind: 'group', depth: 1}, ...bodies]);
    },
    previewFor, previewToolbarMarkup: toolbar,
    decoratePreview: preview => {
      if (definition.commandId === 0x2A && preview.shop_menu?.runtime_name_buffer) return {...preview,
        layers: preview.layers.map(layer => layer.facility_parameter_bindings?.some(binding =>
          binding.value_source?.operation === 'school-reset-name-buffer') ? {...layer,
          facility_parameter_context: {...layer.facility_parameter_context,
            runtimeNameBuffer: servicePreviewContext(preview, interfacePreviewContext()).runtime_name_buffer}} : layer)};
      if (definition.commandId !== 0x2B || !preview.shop_menu?.laser_arrangement) return preview;
      const arrangement = preview.runtime_context?.lens_arrangement;
      const layer = {kind: 'laser_lens_runtime', phase: preview.shop_menu.laser_empty_result ? 'result' : 'arrangement',
        slots: arrangement ? arrangement.flatMap((id, index) => id ? [index] : []) : state.laserLensPreviewSlots || []};
      return {...preview, layers: [...preview.layers.filter(layer => layer.kind !== 'laser_lens_runtime'), layer]};
    },
    onNodeChange: node => {
      const body = entries.find(entry => `body:${entry.fragmentId}:${entry.preview.id}` === selected.widget);
      state.interfacePageEntry = body?.fragmentId || node?.action?.id || node?.segment?.id || null;
      selected.entryRequest = state.interfacePageEntry || '';
      replaceHistoryUrl(currentViewUrl());
    },
    bindPreviewControls: (root, {refresh}) => {
      for (const [selector, field] of [['[data-special-amount]', 'service_amount'], ['[data-special-name]', 'runtime_name_buffer']])
        root.querySelector(selector)?.addEventListener('change', event => {
          interfacePreviewContext()[field] = field === 'service_amount'
            ? event.target.value === '' ? undefined : Number(event.target.value) : event.target.value.trim() || undefined;
          void refresh();
        });
      root.querySelectorAll('[data-special-lens]').forEach(input => input.addEventListener('change', () => {
        state.laserLensPreviewSlots = [...root.querySelectorAll('[data-special-lens]:checked')]
          .map(input => Number(input.dataset.specialLens));
        void refresh();
      }));
    },
  });
  return {stateWorkbenchMarkup: await page.workbench.render()};
}

function bindSpecialServicePage(root, options) {
  return pages.get(state.interfacePage)?.workbench.bind(root, options);
}

// @editor-module 服务页组织场景角色、界面与对话，文字编辑由字段对象控件承担。

const quantityServicePages = new Set(['vehicle-supply-service', 'storage-service']);
const quantityWorkbenches = new Map();

function isQuantityServicePage(pageId = state.interfacePage) {
  return quantityServicePages.has(pageId);
}

async function renderQuantityServicePage() {
  const definition = interfacePageDefinition(state.interfacePage);
  const key = definition.id;
  if (state.quantityServiceStateMachines?.repository !== state.projectRepository)
    state.quantityServiceStateMachines = {repository: state.projectRepository, selections: new Map()};
  const selections = state.quantityServiceStateMachines.selections;
  if (!selections.has(key)) selections.set(key, {family: 0x100 + definition.commandId,
    instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0,
    objectSelected: false, zoom: 'fit'});
  const details = await renderServicePage();
  const workbench = createShopStateWorkbench({namespace: `service-state-${key}`,
    fixedFamily: 0x100 + definition.commandId, selection: () => selections.get(key),
    evidenceVisible: false, previewScene: true, pathsInPreview: true, quantityPreview: true,
    getEntry: () => state.interfacePageEntry || state.interfacePageScreen?.replace(/^ui-screen:/u, '') || '',
    inspectorMarkup: `<p><a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a></p>
      ${details.treeExtraMarkup}${details.inspectorExtraMarkup}`,
    bindInspector: host => bindServicePage(host),
  });
  quantityWorkbenches.set(key, workbench);
  return workbench.render();
}

async function bindQuantityServicePage(root, {rerender}) {
  await quantityWorkbenches.get(state.interfacePage)?.bind(root, {rerender});
}

const SIMPLE_SERVICE_PAGES = new Set(['vehicle-wash-service', 'paralysis-massage-service', 'vehicle-trade-service']);
const simpleServiceWorkbenches = new Map();

function isSimpleServicePage(pageId = state.interfacePage) {
  return SIMPLE_SERVICE_PAGES.has(pageId);
}

async function renderSimpleServicePage() {
  const {createShopStateWorkbench} = await Promise.resolve().then(function () { return shopStateWorkbench; });
  const definition = interfacePageDefinition(state.interfacePage);
  const command = `application-command:${definition.commandId.toString(16).toUpperCase().padStart(2, '0')}`;
  const description = await renderServicePage();
  const objects = await db.getFieldObjects(command);
  const fields = [...objects.map(object => ({resource: command, handle: object.id})),
    ...(definition.configHandles || []).map(handle => ({resource: definition.configResourceId, handle}))]
    .map(binding => ({...binding, separate: true, options: {stacked: true}}));
  if (state.simpleServiceStateMachines?.repository !== state.projectRepository)
    state.simpleServiceStateMachines = {repository: state.projectRepository, selections: new Map()};
  const selections = state.simpleServiceStateMachines.selections;
  if (!selections.has(definition.id)) selections.set(definition.id, {
    family: 0x100 + definition.commandId, instance: 0, node: null, widget: 'screen',
    edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit',
  });
  const workbench = createShopStateWorkbench({namespace: `service-state-${definition.id}`,
    fixedFamily: 0x100 + definition.commandId, selection: () => selections.get(definition.id),
    startAtEntry: true, evidenceVisible: false, previewScene: true, pathsInPreview: true,
    getEntry: () => state.interfacePageEntry || state.interfacePageScreen || '',
    inspectorMarkup: `<p><a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a></p>${description.treeExtraMarkup}`,
    bindInspector: host => bindRecordLinks(host, route => {location.href = route;}),
    widgetFields: widget => widget?.id === 'screen' ? fields : [],
  });
  simpleServiceWorkbenches.set(definition.id, workbench);
  return workbench.render();
}

async function bindSimpleServicePage(root, {rerender}) {
  await simpleServiceWorkbenches.get(state.interfacePage).bind(root, {rerender});
}

function isServicePage(pageId = state.interfacePage) {
  return Boolean(interfacePageDefinition(pageId)?.servicePage || interfacePageDefinition(pageId)?.serviceFlow);
}

async function renderServicePage() {
  const definition = interfacePageDefinition(state.interfacePage);
  const [actors, scenes, command] = await Promise.all([
    db.getAll("scene-actor", []),
    db.getDocument("project.scenes", {}),
    db.getResourceDocument(`application-command:${definition.commandIds[0]
      .toString(16).toUpperCase().padStart(2, "0")}`, {}),
  ]);
  const sceneById = new Map((scenes.editable_scenes || []).map(scene => [Number(scene.id), scene]));
  const entryActors = new Set((definition.entryActors || []).map(actor => actor.uid));
  const serviceActors = actors.filter(actor => definition.commandIds.includes(Number(actor.text_region))
    || entryActors.has(actor.uid));
  const actorTable = serviceActors.length ? dataTable({
    columns: [
      {key: "uid", label: "角色", mono: true, width: 110, cell: actor => {
        const scene = sceneById.get(Number(actor.entry_id));
        return scene ? `<a href="?view=scenes&amp;scene=${encodeURIComponent(scene.slug)}&amp;sceneMode=logic&amp;sceneObject=actor:${actor.id}">${esc(actor.uid)}</a>` : esc(actor.uid);
      }},
      {key: "scene", label: "场景", width: 56, wrap: true, cell: actor => esc(sceneById.get(Number(actor.entry_id))?.name || "")},
      {key: "x", label: "X", width: 24},
      {key: "y", label: "Y", width: 24},
    ],
    rows: serviceActors,
    rowId: actor => actor.uid,
    recordRoute: actor => {
      const scene = sceneById.get(Number(actor.entry_id));
      return scene ? `?view=scenes&scene=${encodeURIComponent(scene.slug)}&sceneMode=logic&sceneObject=actor:${actor.id}` : null;
    },
  }) : '';
  if (isSpecialServicePage(definition)) return renderSpecialServicePage(definition, {
    inspectorExtraMarkup: actorTable ? panel('场景角色', `<div data-service-actors>${actorTable}</div>`, {flat: true}) : '',
  });
  const storageLink = definition.id === "storage-service"
    ? `<a class="editor-inline-link" href="?view=save&amp;saveSection=storage">财产保管 ↗</a>` : "";
  const family = command.configuration_family?.family_id
    ?? (command.configuration_family_resource_id
      ? Number.parseInt(command.configuration_family_resource_id.split(':').at(-1), 16) : null);
  const argument = interfacePreviewContext().service?.command === definition.commandId
    ? interfacePreviewContext().service.argument : 0;
  const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
  const configuration = `<div data-service-config="application-command:${hex(definition.commandId)}"></div>
    ${family == null ? '' : `<div data-service-config="application-config-family:${hex(family)}"></div>
      <div data-service-config="facility-config" data-service-row="application-config-instance:${hex(family)}:${hex(argument)}"></div>`}
    ${definition.configResourceId ? (definition.configHandles || [null]).map(handle =>
      `<div data-service-config="${esc(definition.configResourceId)}"${handle ? ` data-service-row="${esc(handle)}"` : ''}></div>`).join('') : ''}`;
  return {
    className: "facility-ui-workbench service-ui-workbench",
    treeExtraMarkup: actorTable ? panel('场景角色',
      `<div data-service-actors>${actorTable}</div>${storageLink}`, {flat: true}) : storageLink,
    inspectorExtraMarkup: configuration,
  };
}

async function bindServicePage(root = document, {repaint = () => {}, rerender = async () => {}} = {}) {
  const actors = root.querySelector("[data-service-actors]");
  if (actors) bindRecordLinks(actors, route => {location.href = route;});
  if (isSpecialServicePage(interfacePageDefinition(state.interfacePage))) return bindSpecialServicePage(root, {rerender});
  for (const host of root.querySelectorAll('[data-service-config]')) {
    const objects = await db.getFieldObjects(host.dataset.serviceConfig);
    if (!host.isConnected) return;
    const handle = host.dataset.serviceRow;
    await Promise.all(objects.filter(object => !handle || object.fields.some(field => field.entityHandle === handle)).map(object => {
      const container = host.ownerDocument.createElement('div');
      host.append(container);
      return object.mount(container, {rowHandles: handle ? [handle] : undefined,
        compactIdentity: host.dataset.serviceConfig.startsWith('application-config-family:')});
    }));
  }
}

var servicePages = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindQuantityServicePage: bindQuantityServicePage,
  bindServicePage: bindServicePage,
  bindSimpleServicePage: bindSimpleServicePage,
  isQuantityServicePage: isQuantityServicePage,
  isServicePage: isServicePage,
  isSimpleServicePage: isSimpleServicePage,
  renderQuantityServicePage: renderQuantityServicePage,
  renderServicePage: renderServicePage,
  renderSimpleServicePage: renderSimpleServicePage
});

export { createShopStateWorkbench, servicePages };
