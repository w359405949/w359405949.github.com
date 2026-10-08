// @editor-module 商店菜单由应用命令记录引用、代码参数与当前存档字段构造。
import {servicePreviewFields, servicePreviewContext, servicePreviewTerminalState} from '../core/service-preview-state.js';
import {db} from '../core/project-db.js';
import {SHARED_UI_SPRITE_SOURCE} from '../core/shared-sprite-pattern-source.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {facilityRuntimeCodeValues} from '../core/facility-runtime-code-sources.js';
import {state} from '../core/state.js';
import {storagePreviewEntries} from '../core/storage-preview-entries.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {terminalPreviewState} from '../core/terminal-preview-state.js';
import {vehicleTradeDecision} from '../core/vehicle-trade-parameters.js';
import {vehicleWeightProviderScript} from '../views/status-ui.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {rentalListRowSources} from '../core/vehicle-preset-views.js';

const PARAMETERS = ['shop-text-region', 'shop-menu-record', 'shop-menu-selector',
  'shop-gold-origin', 'shop-menu-frame-record', 'shop-category-record-base', 'shop-menu-line-origin'];
const COMMIT_PARAMETERS = ['shop-dialogue-transfer-selector', 'shop-dialogue-commit-column', 'shop-dialogue-commit-width',
  'shop-dialogue-commit-row', 'shop-dialogue-commit-packet-rows', 'shop-dialogue-commit-packets'];
const LIST_PARAMETERS = ['service-list-selector', 'service-list-origin', 'service-list-row-record',
  'service-list-row-step', 'service-list-name-region'];
const GOODS_PARAMETERS = ['shop-goods-more-threshold', 'shop-goods-down-object', 'shop-goods-arrow-x',
  'shop-goods-down-y', 'shop-goods-origin', 'shop-goods-page-size', 'shop-goods-row-record',
  'shop-goods-selector', 'shop-tank-detail-record', 'shop-engine-detail-record', 'shop-engine-item-threshold',
  'shop-human-detail-label', 'shop-human-weapon-threshold', 'shop-human-detail-record',
  'service-list-row-step', 'shop-item-name-region', 'shop-tank-category-record-base',
  'shop-tank-effect-number-record', 'shop-tank-effect-blank-selector', 'shop-tank-target-record-base',
  'shop-tank-effect-item-limit', 'shop-tank-empty-name',
  ...Array.from({length: 12}, (_, index) => `shop-equipment-category-threshold-${index}`),
  ...Array.from({length: 12}, (_, index) => `shop-equipment-category-marker-${index}`)];
const ACTOR_PARAMETERS = ['shop-actor-selector', 'shop-actor-name-origin', 'shop-actor-name-record',
  'shop-actor-marker-object', 'shop-actor-marker-x', 'shop-actor-marker-bottom-y',
  'shop-actor-marker-row-step', 'shop-actor-coordinate-loop-start', 'shop-actor-domain',
  'menu-text-origin-low', 'menu-text-origin-high'];
const record = (region, id) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(id).padStart(3, '0')}`;

export async function resolveShopMenuPreview(preview, {readCodeField} = {}) {
  if (!preview.shop_menu) return preview;
  if (preview.shop_menu.storage_actor_selection) {
    const save = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
    const entries = storagePreviewEntries(save, preview.runtime_context?.save_slot ?? servicePreviewContext(preview, interfacePreviewContext()).slot,
      {sorted: true});
    const index = preview.runtime_context?.stored_item_index ?? preview.runtime_context?.choice_index ?? 0;
    if (!Number.isInteger(index) || index < 0 || index >= entries.length || !entries[index].id)
      throw new TypeError('保管物接收人缺少当前所选物品');
    const values = await fieldSubmenuCodeValues(['storage-vehicle-item-first', 'storage-human-item-first',
      'storage-vehicle-tool-first'], readCodeField);
    const item = entries[index].id;
    const vehicle = item >= fieldSubmenuCodeValue(values, 'storage-vehicle-tool-first')
      || item >= fieldSubmenuCodeValue(values, 'storage-vehicle-item-first')
        && item < fieldSubmenuCodeValue(values, 'storage-human-item-first');
    const mode = preview.shop_menu.storage_actor_response
      ? vehicle ? 'service-vehicle-dialogue' : 'service-character-dialogue'
      : vehicle ? 'service-vehicle-select' : 'service-character-target';
    const welcome = preview.shop_menu.storage_actor_welcome_handles?.[vehicle ? 'vehicle' : 'character'];
    preview = {...preview, shop_menu: {...preview.shop_menu, mode,
      ...(welcome ? {welcome_handle: welcome} : {})},
      layers: preview.layers.map(layer => layer.storage_actor_names ? {...layer,
        shop_actor_names: !vehicle, shop_vehicle_names: vehicle} : layer)};
  }
  const source = preview.shop_menu;
  const goods = ['goods-list', 'herbal-goods'].includes(source.mode);
  const goodsActors = source.mode === 'goods-actor-select';
  const goodsVehicles = source.mode === 'goods-vehicle-select';
  const serviceActors = source.mode === 'service-actor-select';
  const characterSelect = ['service-character-select', 'service-character-target'].includes(source.mode);
  const characterDialogue = source.mode === 'service-character-dialogue';
  const rentalReturn = source.mode === 'service-rental-return';
  const pairedActors = goodsActors || serviceActors || characterSelect || characterDialogue && source.storage_actor_response;
  const goodsConfirm = ['goods-confirm', 'goods-actor-select', 'goods-vehicle-select'].includes(source.mode);
  const vehicleSelect = goodsVehicles || ['service-vehicle-select', 'service-vehicle-dialogue', 'service-vehicle-menu'].includes(source.mode);
  const reception = source.mode === 'reception' || rentalReturn
    || ['service-vehicle-select', 'service-vehicle-dialogue', 'service-character-select', 'service-character-target', 'service-character-dialogue', 'service-repair-dialogue'].includes(source.mode);
  const serviceList = ['inn-list', 'inn-dialogue', 'service-list', 'service-actor-select', 'service-dialogue',
    'decoration-list', 'decoration-dialogue'].includes(source.mode);
  const selectedIndex = Number(preview.runtime_context?.list_choice_index
    ?? (source.mode === 'service-vehicle-menu' ? preview.runtime_context?.choice_index : 0) ?? 0);

  const needsCommit = preview.layers.some(layer => layer.dialogue_scroll_commit);
  const parameters = reception ? ['shop-text-region'] : PARAMETERS.filter(name =>
    !(serviceList || goods || goodsConfirm || source.prompt_handle) || !['shop-menu-record', 'shop-menu-selector'].includes(name));
  if (source.shell_quantity_input) parameters.push('shell-sale-quantity-label', 'shell-sale-quantity-label-region');
  if (serviceList) parameters.push(...LIST_PARAMETERS);
  if (vehicleSelect || preview.layers.some(layer => layer.shop_vehicle_names)) parameters.push('shop-actor-selector', 'shop-actor-name-origin',
    'shop-vehicle-name-record', 'menu-text-origin-low', 'menu-text-origin-high',
    'vehicle-menu-clear-selector');
  if (!vehicleSelect && preview.layers.some(layer => layer.vehicle_menu_clear))
    parameters.push('vehicle-menu-clear-selector');
  if (source.retained_service_menu) parameters.push('chassis-project-menu-record',
    'shop-gold-origin', 'shop-menu-frame-record', 'shop-category-record-base', 'shop-menu-line-origin');
  if (source.callback_record_base) parameters.push(source.callback_record_base);
  if (source.callback_menu_record) parameters.push(source.callback_menu_record, source.callback_menu_selector);
  if (source.service_weapon_menu) parameters.push('supply-weapon-selector');
  if (source.no_ammunition_components) parameters.push('supply-empty-clear-tile');
  if (source.sale_item_bar) parameters.push('sale-inventory-header-record', 'sale-inventory-name-origin',
    'sale-inventory-name-record', 'sale-inventory-item-selector');
  if (source.inventory_category_selection) parameters.push('sale-inventory-category-selector');
  if (source.selector_code_parameter) parameters.push(source.selector_code_parameter);
  if (source.shell_purchase_input) parameters.push('supply-ammunition-input-label',
    'supply-input-cursor', 'supply-input-digit');
  if (source.rental_list) parameters.push('rental-list-origin', 'rental-list-row-record',
    'rental-list-frame-record', 'rental-list-selector', 'service-list-row-step');
  if (source.engine_eligibility_handle) parameters.push('engine-damage-mask',
    ...Array.from({length: 8}, (_, index) => `engine-terminal-item-${index}`));
  if (source.wash_result) parameters.push('wash-action-record', 'wash-name-record',
    'wash-wax-item', 'wash-lead-item', 'runtime-action-record-region', 'runtime-wash-name-region');
  if (goods || goodsConfirm) parameters.push(...GOODS_PARAMETERS);
  if (goodsActors || goodsVehicles) parameters.push(...ACTOR_PARAMETERS);
  if (goodsVehicles) parameters.push('shop-vehicle-unconditional-item-threshold');
  if (serviceActors || characterSelect || characterDialogue) parameters.push('shop-actor-selector', 'shop-actor-name-origin',
    'shop-actor-name-record', 'menu-text-origin-low', 'menu-text-origin-high');
  if (characterSelect || characterDialogue) parameters.push('vehicle-menu-clear-selector');
  if (source.welcome_script) parameters.push('story-dialogue-region-02');
  if (source.wanted_information_actor) parameters.push('wanted-intelligence-record-base',
    'wanted-intelligence-text-region', 'wanted-name-text-region');
  if (source.wanted_claim) parameters.push('wanted-claim-scan-limit', 'wanted-claim-event-base');
  if (source.medical_status_markers) parameters.push(...ACTOR_PARAMETERS, 'medical-status-marker-base');
  if (source.service_amount) parameters.push('service-input-initial-amount');
  if (source.service_amount_input) parameters.push(...(source.service_amount === 'money'
    ? ['service-money-input-record', 'service-money-input-selector',
      'service-money-input-cursor', 'service-money-input-digit']
    : ['supply-input-record', 'supply-input-selector', 'supply-input-cursor', 'supply-input-digit',
      source.service_amount === 'armor' ? 'supply-armor-input-label' : 'supply-ammunition-input-label']));
  if (source.laser_arrangement) parameters.push('laser-cannon-chr-bank',
    'laser-arrangement-selector', 'laser-arrangement-cursor-object',
    'laser-cannon-backdrop-record', 'laser-cannon-layout-record', 'laser-cannon-palette-index');
  if (source.laser_cursor_object) parameters.push(source.laser_cursor_object);
  if (source.laser_empty_result) parameters.push('laser-carried-weapon-first', 'laser-carried-weapon-limit',
    'laser-borrowed-lens-first', 'laser-borrowed-lens-limit');
  const values = await fieldSubmenuCodeValues(needsCommit
    ? [...parameters, ...COMMIT_PARAMETERS] : parameters, readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const amount = source.service_amount ? servicePreviewContext(preview, interfacePreviewContext()).service_amount
    ?? preview.vehicle_trade?.default_amount ?? read('service-input-initial-amount') : null;
  if (amount !== null && (!Number.isInteger(amount) || amount < 0
      || amount > (source.service_amount === 'money' ? 9999999 : 65535)))
    throw new TypeError('服务输入金额或数量超出已确认的位数范围');
  const appValue = async (handle, field) => (await db.getField(source.resource_id, handle, field)).value;
  let tradeResult;
  if (preview.vehicle_trade?.kind === 'decision') {
    const [prices, thresholds, items] = await Promise.all([
      Promise.all(Array.from({length: 8}, (_, index) => db.getField('application-command', 'application-command:2C:00', `value${index}`))),
      Promise.all(Array.from({length: 8}, (_, index) => db.getField('application-command', 'application-command:2C:01', `value${index}`))),
      db.getResourceDocument('item-entry'),
    ]);
    tradeResult = vehicleTradeDecision(amount, servicePreviewTerminalState(preview, terminalPreviewState(preview)).tradeResult === 'accepted' ? 0 : 255,
      prices.map(field => field.value), thresholds.map(field => field.value), items.equipment_editor.numeric_codes);
  }
  const welcomeHandle = tradeResult
    ? preview.vehicle_trade[`${tradeResult.accepted ? 'accepted' : 'rejected'}_handle`]
    : source.welcome_handle
    || `${source.resource_id}:runtime-record-slot:${source.welcome_slot}`;
  let welcome;
  let region;
  if (source.welcome_script) {
    const reference = source.welcome_script;
    const bytes = (await db.getField(reference.resource_id, reference.entity_handle, 'bytecode')).value;
    if (bytes[0] !== 0x02 || !Number.isInteger(bytes[1]))
      throw new TypeError('商店剧情正文缺少已确认的文字操作');
    welcome = bytes[1];
    region = read('story-dialogue-region-02');
  } else {
    welcome = await appValue(welcomeHandle, 'record_id');
    region = source.welcome_region_field
      ? await appValue(welcomeHandle, source.welcome_region_field) : read('shop-text-region');
  }
  if (source.welcome_alias) {
    const id = record(region, welcome);
    const text = await db.getResourceDocument('text-record');
    const bytes = (await db.getField('text-record', id, 'bytes')).value;
    const range = text.records[id].protected_ranges.filter(row => row.token === 0xEB)
      [source.welcome_alias.occurrence ?? 0];
    const branch = source.welcome_alias.branch;
    if (!range || ![0, 1].includes(branch) || bytes[range.offset] !== 0xEB
        || !Number.isInteger(bytes[range.offset + branch + 1])
        || bytes[range.offset + branch + 1] === 255)
      throw new TypeError('设施正文别名缺少已确认的选择分支');
    welcome = bytes[range.offset + branch + 1];
  }
  let speaker = null;
  if (source.callback_record_base) {
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 2)
      throw new TypeError('底盘结果正文缺少已确认的改造项目');
    welcome = read(source.callback_record_base) + selectedIndex;
  }
  if (source.speaker_script) {
    const reference = source.speaker_script;
    const bytes = (await db.getField(reference.resource_id, reference.entity_handle, 'bytecode')).value;
    if (bytes[0] !== 0x25 || !Number.isInteger(bytes[1]))
      throw new TypeError('设施接待缺少已确认的说话人操作');
    speaker = bytes[1];
  }
  const menu = source.callback_prompt_handle ? await appValue(source.callback_prompt_handle, 'value')
    : source.retained_service_prompt ? await appValue(source.retained_service_prompt, 'record_id')
    : source.retained_service_menu ? read('chassis-project-menu-record')
    : reception || serviceList || goods || goodsConfirm ? null
    : source.prompt_handle ? await appValue(source.prompt_handle, 'record_id') : read('shop-menu-record');
  const selector = rentalReturn ? preview.selection_cursor?.selector
    : source.selector_code_parameter ? read(source.selector_code_parameter)
    : source.service_amount_input ? read(source.service_amount === 'money'
      ? 'service-money-input-selector' : 'supply-input-selector')
    : source.callback_selector_handle ? await appValue(source.callback_selector_handle, 'value')
    : source.service_weapon_menu ? read('supply-weapon-selector')
    : source.inventory_item_selection ? read('sale-inventory-item-selector')
    : source.inventory_category_selection ? read('sale-inventory-category-selector')
    : source.rental_list ? read('rental-list-selector')
    : source.callback_menu_selector ? read(source.callback_menu_selector)
    : source.laser_arrangement ? read('laser-arrangement-selector')
    : source.selector_handle ? await appValue(source.selector_handle, 'selector')
    : vehicleSelect && !source.prompt_handle ? read('shop-actor-selector') : reception ? null : goods || goodsConfirm ? read('shop-goods-selector') : serviceList ? read('service-list-selector')
    : source.prompt_handle ? await appValue(source.prompt_handle, 'selector') : read('shop-menu-selector');
  const family = Number.parseInt(source.resource_id.split(':')[1], 16) - 0x10;
  if (family < 0 || family > 40 || !Number.isInteger(welcome) || welcome === 255)
    throw new TypeError('商店菜单缺少已确认的应用命令记录引用');
  const commit = needsCommit ? {column: read('shop-dialogue-commit-column'),
    width: read('shop-dialogue-commit-width'), row: read('shop-dialogue-commit-row'),
    rows: read('shop-dialogue-commit-packet-rows') * read('shop-dialogue-commit-packets')} : null;
  if (commit && (read('shop-dialogue-transfer-selector') !== 0 || commit.width < 1 || commit.rows < 1
      || commit.column + commit.width > 32 || commit.row + commit.rows > 30))
    throw new TypeError('商店对话提交区域缺少已确认的字段来源');
  const slot = Number(preview.runtime_context?.save_slot ?? 1);
  const save = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
  let rentalReturnRow = null;
  if (rentalReturn && !preview.glyph_cache_replay) {
    const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle;
    const rentalSlots = [2, 1, 0].filter(index =>
      save.object(`save.slot.${slot}.active_rental_vehicle_preset.${index}`).value < 0x80);
    rentalReturnRow = rentalSlots.indexOf(vehicle - 8);
    if (rentalReturnRow < 0) throw new TypeError('还车选择缺少所选出租战车位');
  }
  if (source.laser_empty_result) {
    const roles = ['hunter', 'mechanic', 'soldier'].filter(role =>
      save.object(`save.slot.${slot}.role.${role}.present`).value);
    const hasLaser = roles.some(role => save.object(`save.slot.${slot}.role.${role}.equipment`).value
      .some(item => item >= read('laser-carried-weapon-first') && item < read('laser-carried-weapon-limit')));
    const availableLens = roles.some(role => save.object(`save.slot.${slot}.role.${role}.inventory`).value
      .some(item => item >= read('laser-borrowed-lens-first') && item < read('laser-borrowed-lens-limit')
        && !save.object(`save.slot.${slot}.global_event_flag.${item.toString(16).toUpperCase()}`).value));
    if (!save.object(`save.slot.${slot}.global_event_flag.16`).value || !hasLaser || availableLens)
      throw new TypeError('激光炮空镜片结果要求已持有激光炮且当前队伍没有可借出的镜片');
  }
  let saleContext = null;
  let salePath = null;
  let saleFields = null;
  if (source.sale_item_bar) {
    const role = ['hunter', 'mechanic', 'soldier'][servicePreviewContext(preview, interfacePreviewContext()).role];
    if (!role || !['equipment', 'inventory'].includes(source.sale_item_bar))
      throw new TypeError('收购报价缺少当前人物携带栏');
    if (source.sale_entity === 'vehicle') {
      const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle;
      if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10)
        throw new TypeError('出售报价缺少当前战车');
      const columns = source.sale_item_bar === 'equipment'
        ? ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8']
        : Array.from({length: 8}, (_, index) => index);
      saleFields = columns.map(column => `save.slot.${slot}.vehicle.${vehicle}.${source.sale_item_bar === 'equipment' ? 'equipment' : 'item'}.${column}`);
    } else salePath = `save.slot.${slot}.role.${role}.${source.sale_item_bar}`;
    const index = preview.runtime_context?.sale_item_index ?? 0;
    const items = saleFields ? saleFields.map(field => save.object(field).value) : save.object(salePath).value;
    if (!Number.isInteger(index) || index < 0 || index >= items.length
        || (!items[index] && !source.sale_item_optional && !source.inventory_category_selection))
      throw new TypeError('收购报价缺少当前人物的所选物品');
    saleContext = items[index] ? {saleItem: items[index]} : {};
  }
  if (source.role_status_records || source.required_role_status) {
    const role = ['hunter', 'mechanic', 'soldier'][servicePreviewContext(preview, interfacePreviewContext()).role];
    if (!role) throw new TypeError('资格回应缺少当前人物');
    const path = `save.slot.${slot}.role.${role}`;
    if (source.required_role_status && !save.object(`${path}.${source.required_role_status}`).value)
      throw new TypeError('当前人物不满足此资格回应的状态条件');
    if (source.role_status_records) {
      const status = save.object(`${path}.dead`).value ? 'dead'
        : save.object(`${path}.numb`).value ? 'numb' : null;
      const handle = status && source.role_status_records[status];
      if (!handle) throw new TypeError('当前人物没有已确认的酒吧资格拒绝条件');
      welcome = await appValue(handle, 'record_id');
    }
  }
  let wantedName = null;
  let wantedContext = null;
  if (source.wanted_claim) {
    const limit = read('wanted-claim-scan-limit'), eventBase = read('wanted-claim-event-base');
    if (limit < 2 || limit > 12 || eventBase + limit > 256)
      throw new TypeError('领赏扫描超出已发布的通缉履历与事件标志范围');
    const selected = preview.service_preview_state?.terminal?.wantedId;
    if (Number.isInteger(selected) && selected > 0 && selected < limit) wantedContext = {wantedId: selected};
    for (let target = 1; !wantedContext && target < limit; target++) {
      const flag = (eventBase + target).toString(16).toUpperCase().padStart(2, '0');
      if (save.object(`save.slot.${slot}.wanted_defeat_level_at_victory.${target}`).value
          && !save.object(`save.slot.${slot}.global_event_flag.${flag}`).value) {
        wantedContext = {wantedId: target};
        break;
      }
    }
    if (!wantedContext) throw new TypeError('当前存档没有已击破且尚未领赏的通缉目标');
  }
  if (source.wanted_information_actor) {
    const explicit = preview.runtime_context?.wanted_information_target;
    const actor = explicit === undefined ? await db.get(source.wanted_information_actor) : null;
    const target = explicit ?? (await db.getField('scene-actor', actor.uid, 'interaction_or_record_id')).value;
    if (actor && (actor.interaction_mode !== 'service-handler' || actor.text_region !== 0x25)
        || !Number.isInteger(target) || target < 0 || target > 11)
      throw new TypeError('通缉情报缺少所属事务所的目标参数');
    const defeated = target && save.object(`save.slot.${slot}.wanted_defeat_level_at_victory.${target}`).value;
    welcome = (read('wanted-intelligence-record-base') + (defeated ? 255 : target)) & 255;
    region = read('wanted-intelligence-text-region');
    if (target) wantedName = record(read('wanted-name-text-region'), target);
  }
  if ((vehicleSelect || source.requires_driving) && !['hunter', 'mechanic', 'soldier'].some(role =>
    save.object(`save.slot.${slot}.role.${role}.driving`).value))
    throw new TypeError('车辆服务选择须有乘车人物');
  let repairComponent = null;
  let repairChoice = null;
  let ammunitionComponent = null;
  if (source.no_ammunition_components && ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine',
    'chassis', 'generic_7', 'generic_8'].some(part => {
    const id = save.object(`save.slot.${slot}.vehicle.${servicePreviewContext(preview, interfacePreviewContext()).vehicle}.equipment.${part}`).value;
    return id > 0 && id < 0x75;
  })) throw new TypeError('无可补给武器回应要求所选战车没有携带武器');
  if (source.ammunition_selection) {
    const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle;
    if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10)
      throw new TypeError('弹药补给缺少当前战车');
    const parts = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8']
      .filter(part => {const id = save.object(`save.slot.${slot}.vehicle.${vehicle}.equipment.${part}`).value;
        return id > 0 && id < 0x75;});
    const part = parts[selectedIndex];
    if (!part) throw new TypeError('弹药补给所选武器超出当前携带范围');
    ammunitionComponent = {vehicle, part};
  }
  if (source.repair_component_mode) {
    const components = [];
    let row = 0;
    for (const vehicle of save.object(`save.slot.${slot}.entity_scene_object_slots`).value.slice(0, 4)) {
      if (vehicle >= 128) continue;
      if (vehicle > 10) throw new TypeError('修理编队缺少已确认的战车位');
      const first = components.length;
      for (const part of ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8']) {
        if (save.object(`save.slot.${slot}.vehicle.${vehicle}.equipment.${part}`).value
            && save.object(`save.slot.${slot}.vehicle.${vehicle}.equipment_state.${part}`).value & 0xC0)
          components.push({vehicle, part, row: ++row});
      }
      if (components.length > first) row++;
    }
    if (source.repair_component_mode === 'single') {
      if (components.length !== 1 || components[0].vehicle !== servicePreviewContext(preview, interfacePreviewContext()).vehicle)
        throw new TypeError('单项修理须只有所选战车的一件损坏设备');
      repairComponent = components[0];
    } else if (source.repair_component_mode === 'selected') {
      const candidates = components.filter(component => component.vehicle === servicePreviewContext(preview, interfacePreviewContext()).vehicle);
      const index = preview.runtime_context?.repair_item_index ?? 0;
      if (!Number.isInteger(index) || !candidates[index])
        throw new TypeError('部件报价缺少所选战车的损坏设备');
      repairComponent = candidates[index];
      repairChoice = repairComponent.row - (preview.runtime_context?.first_row ?? 0);
      if (repairChoice < 0 || repairChoice > 7)
        throw new TypeError('所选修理部件不在当前八行列表内');
    } else if (source.repair_component_mode !== 'multiple' || components.length < 2)
      throw new TypeError('修理范围选择须有多件损坏设备');
  }
  const vehicles = vehicleSelect ? save.object(`save.slot.${slot}.entity_scene_object_slots`).value : null;
  const vehicleRow = vehicleSelect ? [...vehicles.slice(0, 4)].indexOf(servicePreviewContext(preview, interfacePreviewContext()).vehicle) : null;
  if (vehicleSelect && vehicleRow < 0) throw new TypeError('车辆选择缺少当前队伍中的所选战车');
  const vehicleName = vehicleSelect
    ? save.object(`save.slot.${slot}.vehicle.${servicePreviewContext(preview, interfacePreviewContext()).vehicle}.name_codes`) : null;
  if (source.engine_eligibility_handle) {
    const vehicle = `save.slot.${slot}.vehicle.${servicePreviewContext(preview, interfacePreviewContext()).vehicle}`;
    const terminal = Array.from({length: 8}, (_, index) => read(`engine-terminal-item-${index}`));
    const choice = !save.object(`${vehicle}.equipped.engine`).value ? 1
      : save.object(`${vehicle}.equipment_state.engine`).value & read('engine-damage-mask') ? 2
      : terminal.includes(save.object(`${vehicle}.equipment.engine`).value) ? 3 : 0;
    if (!choice) throw new TypeError('发动机仍可改造，不能进入资格拒绝分支');
    const targets = await appValue(source.engine_eligibility_handle, 'targets');
    const app = await db.getResourceDocument(source.resource_id);
    const action = app.dialogue_flow.segments[targets[choice]]?.actions.find(row =>
      row.kind === 'text-record' && row.source === 'application-vm-literal');
    if (!action) throw new TypeError('发动机资格分支缺少所属正文读取');
    welcome = await appValue(`${source.resource_id}:text-record:${action.prg_offset}`, 'record_id');
  }
  const washPrice = source.wash_price_handle
    ? (await appValue(source.wash_price_handle, 'value'))
      * [...save.object(`save.slot.${slot}.entity_scene_object_slots`).value.slice(0, 4)]
        .filter(value => value < 128).length : null;
  let washRecords = null;
  if (source.wash_result) {
    for (const vehicle of save.object(`save.slot.${slot}.entity_scene_object_slots`).value.slice(0, 4)) {
      if (vehicle >= 128) continue;
      if (vehicle > 10) throw new TypeError('清洗编队缺少已确认的战车位');
      for (let index = 0; index < 8; index++) {
        const item = save.object(`save.slot.${slot}.vehicle.${vehicle}.item.${index}`).value;
        if ([read('wash-wax-item'), read('wash-lead-item')].includes(item))
          throw new TypeError('清洗特殊携带物的结果阶段尚未确认');
      }
    }
    washRecords = {provider_records: {15: record(read('runtime-action-record-region'), read('wash-action-record'))},
      runtime_record_pair: record(read('runtime-wash-name-region'), read('wash-name-record'))};
  }
  const listLayers = [];
  const rentalRows = [];
  if (source.rental_list) {
    const configuration = await db.getResourceDocument('facility-config');
    const reference = configuration.families.find(row => row.id === source.config_family)
      ?.records.find(row => row.id === (preview.runtime_context?.shop_instance ?? 0));
    if (!reference) throw new TypeError('出租列表缺少当前配置实例');
    const count = (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
    if (!Number.isInteger(count) || count < 1 || count > 4)
      throw new TypeError('出租列表超出已确认的四行选择域');
    for (let index = 0; index < count; index++) {
      const preset = (await db.getField('facility-config', reference.record_id, `slot:${index}`)).value;
      const row = rentalListRowSources(state.project, preset);
      if (!row) throw new TypeError('出租列表缺少当前车型名称、底盘或 SP');
      rentalRows.push({kind: 'script', record: record(2, read('rental-list-row-record')),
        cursor: read('rental-list-origin') + index * read('service-list-row-step'),
        glyph_pixel_y_offset: -4, glyph_cache_inline_state: true,
        provider_script_hex: {7: row.nameCodeScriptHex},
        provider_records: {10: row.chassisNameRecord}, provider_constants: {11: row.initialSp}});
    }
  }
  let selectedName = null;
  if (serviceList) {
    const configuration = await db.getResourceDocument('facility-config');
    const instance = preview.runtime_context?.shop_instance ?? 0;
    const reference = configuration.families.find(row => row.id === source.config_family)
      ?.records.find(row => row.id === instance);
    if (!reference) throw new TypeError('设施列表缺少当前配置实例');
    const count = (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
    if (!Number.isInteger(count) || count < 1 || count > 4)
      throw new TypeError('设施列表超出已确认的四行选择域');
    const names = await Promise.all(Array.from({length: count}, async (_, index) =>
      (await db.getField('facility-config', reference.record_id, `slot:${index}`)).value));
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= count)
      throw new TypeError('设施选择序号超出当前配置列表');
    selectedName = names[selectedIndex];
    const listPrices = ['bar', 'decoration'].includes(source.price_kind);
    const priceKey = id => listPrices ? `service-${source.price_kind}-price-${id}` : `inn-price-${id}`;
    const prices = listPrices
      ? await fieldSubmenuCodeValues(names.map(priceKey), readCodeField)
      : await facilityRuntimeCodeValues(names.map(priceKey), readCodeField);
    const items = await db.getResourceDocument('item-entry');
    for (const [index, id] of names.entries()) {
      const priceCode = listPrices
        ? fieldSubmenuCodeValue(prices, priceKey(id)) : prices[priceKey(id)];
      const price = items.equipment_editor.numeric_codes.find(row => row.raw_code === priceCode);
      if (!price?.available || !Number.isSafeInteger(price.value))
        throw new TypeError('设施列表缺少当前价格码字段');
      listLayers.push({kind: 'script', record: record(2, read('service-list-row-record')),
        cursor: read('service-list-origin') + index * read('service-list-row-step'),
        glyph_pixel_y_offset: -4, glyph_cache_inline_state: true,
        provider_records: {10: record(read('service-list-name-region'), id)},
        provider_constants: {11: price.value}});
    }
  }
  let goodsWelcome = null;
  let shellNoWeaponsName = null;
  if (source.shell_no_weapons) {
    const vehicles = [...save.object(`save.slot.${slot}.entity_scene_object_slots`).value.slice(0, 4)]
      .filter(vehicle => vehicle < 128);
    const vehicle = vehicles.at(-1);
    if (!Number.isInteger(vehicle) || vehicle > 10)
      throw new TypeError('无武器回应缺少队伍名单的末辆战车');
    const name = save.object(`save.slot.${slot}.vehicle.${vehicle}.name_codes`);
    shellNoWeaponsName = fixedRuntimeTextScriptHex(saveNameTextSource(name, name.value));
  }
  let shellSale = null;
  if (source.shell_sale_quote || source.shell_quantity_input) {
    const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle, index = preview.runtime_context?.shell_index ?? 0;
    const prefix = `save.slot.${slot}.vehicle.${vehicle}`;
    const type = save.object(`${prefix}.shell_type.${index}`).value;
    const count = save.object(`${prefix}.shell_count.${index}`).value;
    const quantity = servicePreviewContext(preview, interfacePreviewContext()).service_amount ?? (source.shell_quantity_input ? 0 : 1);
    const shells = await db.getResourceDocument('shell-record');
    const price = shells.records.find(row => row.id === type)?.price;
    if (!price?.available || !Number.isInteger(price.value) || count < 1 || !Number.isInteger(quantity)
        || quantity < (source.shell_quantity_input ? 0 : 1) || quantity > count) throw new TypeError('炮弹出售缺少当前数量与价格');
    const unit = price.value - (price.value & 0xFF) + ((price.value & 0xFF) >>> 1);
    shellSale = {quantity, count, price: (unit * quantity) % 0x1000000};
  }
  let goodsMore = false;
  let shellPurchase = null;
  if (source.shell_purchase_input || source.shell_purchase_quote) {
    const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle;
    const capacity = save.object(`save.slot.${slot}.vehicle.${vehicle}.ammo_capacity`).value;
    const total = Array.from({length: 6}, (_, index) =>
      save.object(`save.slot.${slot}.vehicle.${vehicle}.shell_count.${index}`).value)
      .reduce((sum, count) => sum + count, 0);
    const quantity = servicePreviewContext(preview, interfacePreviewContext()).service_amount ?? 0;
    if (!Number.isInteger(capacity) || total >= capacity || !Number.isInteger(quantity)
        || quantity < 0 || quantity > capacity - total)
      throw new TypeError('特殊炮弹购买缺少当前剩余容量与输入数量');
    shellPurchase = {quantity, maximum: capacity - total};
  }
  let selectedGoods = null;
  const goodsLayers = [];
  const detailLayers = [];
  const actorMarkers = [];
  if (goods || goodsConfirm) {
    const configuration = await db.getResourceDocument('facility-config');
    const instance = preview.runtime_context?.shop_instance ?? 0;
    const reference = configuration.families.find(row => row.id === family)
      ?.records.find(row => row.id === instance);
    if (!reference) throw new TypeError('商品列表缺少当前配置实例');
    const count = (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
    const pageSize = read('shop-goods-page-size');
    goodsMore = count >= read('shop-goods-more-threshold');
    if (goods && !source.welcome_script && !source.shell_goods)
      goodsWelcome = await appValue(`${source.resource_id}:runtime-record-slot:${goodsMore ? 1 : 0}`, 'record_id');
    const selected = Number(preview.runtime_context?.shop_item_index ?? 0);
    if (!Number.isInteger(count) || count < 1 || count > 20 || pageSize !== 4
        || !Number.isInteger(selected) || selected < 0 || selected >= count)
      throw new TypeError('商品列表超出已确认的配置与选择域');
    const start = Math.min(Math.max(0, selected - pageSize + 1), count - 1);
    const ids = await Promise.all(Array.from({length: Math.min(pageSize, count - start)}, async (_, index) =>
      (await db.getField('facility-config', reference.record_id, `slot:${start + index}`)).value));
    const shellCatalog = source.shell_goods ? await db.getResourceDocument('shell-record') : null;
    const items = shellCatalog ? ids.map(id => shellCatalog.records.find(row => row.id === id))
      : await Promise.all(ids.map(id => db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null)));
    const nameRegion = shellCatalog ? Number.parseInt(shellCatalog.name_region.asset_id.split('.').at(-1), 16)
      : read('shop-item-name-region');
    const numeric = (item, name) => {
      const field = item?.[name];
      if (!field?.available || !Number.isSafeInteger(field.value))
        throw new TypeError('商品详情缺少当前数值码字段');
      return field.value;
    };
    for (const [index, item] of items.entries()) {
      if (!item?.name_source) throw new TypeError('商品缺少名称字段');
      goodsLayers.push({kind: 'script', record: record(2, read('shop-goods-row-record')),
        cursor: read('shop-goods-origin') + index * read('service-list-row-step'),
        glyph_pixel_y_offset: -4, glyph_cache_inline_state: true,
        provider_records: {10: record(nameRegion, item.id)},
        provider_constants: {11: numeric(item, 'price')}});
    }
    if (count >= read('shop-goods-more-threshold')) goodsLayers.push({kind: 'generic_metasprite',
      object_id: read('shop-goods-down-object'), anchor_x: read('shop-goods-arrow-x'),
      anchor_y: read('shop-goods-down-y'), oam_y_bias: 1, sprite_pattern_source: SHARED_UI_SPRITE_SOURCE});
    const item = items[selected - start];
    selectedGoods = {name: record(nameRegion, item.id), price: numeric(item, 'price'), index: selected - start};
    if (goodsActors || (goodsVehicles && !(family & 1))) {
      const reference = source.eligibility_byte_sources?.[item.id];
      const unconditional = goodsVehicles && item.id >= read('shop-vehicle-unconditional-item-threshold');
      if ((!reference && !unconditional) || (goodsActors && read('shop-actor-domain') !== 3))
        throw new TypeError('商品适用标记缺少所属字段来源');
      const flags = unconditional ? null
        : (await db.getField(reference.resource_id, reference.entity_handle, reference.field)).value;
      const masks = goodsActors
        ? (await db.getResourceDocument('shared-indexed-byte-overlays')).descending_bit_masks : null;
      const targets = goodsVehicles ? vehicles.slice(0, read('shop-actor-coordinate-loop-start') + 1)
        : ['hunter', 'mechanic', 'soldier'];
      for (const [index, target] of targets.entries()) {
        if (goodsVehicles) {
          if (target >= 128) continue;
          if (target > 10) throw new TypeError('商品适用标记缺少已确认的战车位');
          if (!unconditional && !(flags & save.object(`save.slot.${slot}.vehicle.${target}.mount_mask_raw`).value)) continue;
        } else if (!save.object(`save.slot.${slot}.role.${target}.present`).value || !(flags & masks[index])) continue;
        actorMarkers.push({kind: 'generic_metasprite', object_id: read('shop-actor-marker-object'),
          anchor_x: read('shop-actor-marker-x'), anchor_y: read('shop-actor-marker-bottom-y')
            - (read('shop-actor-coordinate-loop-start') - index + 1) * read('shop-actor-marker-row-step'),
          oam_y_bias: 1, sprite_pattern_source: SHARED_UI_SPRITE_SOURCE});
      }
    }
    if (family === 0) {
      const category = Array.from({length: 12}, (_, index) => read(`shop-equipment-category-threshold-${index}`))
        .findIndex(threshold => item.id <= threshold);
      if (category < 0) throw new TypeError('商品缺少 ROM 装备类别');
      const marker = read(`shop-equipment-category-marker-${category}`);
      const codes = await db.getResourceDocument('shared-indexed-byte-overlays');
      const engine = item.id >= read('shop-engine-item-threshold');
      const hasEffect = item.id < read('shop-tank-effect-item-limit');
      const effect = item.equipment?.battle_effect_code;
      detailLayers.push({kind: 'window_clear', source: {preset: '3E', resource_id: 'ui-tile-rectangle-service'}},
        {kind: 'script', record: record(2, engine
          ? read('shop-engine-detail-record') : read('shop-tank-detail-record')),
        cursor: 0, glyph_pixel_y_offset: -4, glyph_cache_inline_state: true,
        provider_records: {...(engine ? {} : {22: record(8, marker - read('shop-tank-category-record-base')),
          18: record(2, hasEffect ? read('shop-tank-effect-number-record') + (effect === read('shop-tank-effect-blank-selector') ? 1 : 0) : read('shop-tank-empty-name')),
          20: record(8, hasEffect ? read('shop-tank-target-record-base') + ((item.equipment.raw_flags & 0x18) >> 3) : read('shop-tank-empty-name'))})},
        provider_constants: {53: numeric(item, 'defense'), ...(hasEffect ? {
          17: effect === 7 ? codes.zero_prefixed_ascending_bit_masks[0] : codes.level_value_codebook[effect],
          58: numeric(item, 'attack')} : {58: 0})},
        provider_script_hex: {54: vehicleWeightProviderScript(item.tank_weight.internal_units),
          ...(item.engine_capacity ? {51: vehicleWeightProviderScript(item.engine_capacity.internal_units)} : {})}});
    } else if (family === 2) {
      const weapon = item.id >= read('shop-human-weapon-threshold');
      detailLayers.push({kind: 'window_clear', source: {preset: '3E', resource_id: 'ui-tile-rectangle-service'}},
        {kind: 'script', record: record(2, read('shop-human-detail-record')), cursor: 0,
        glyph_pixel_y_offset: -4, glyph_cache_inline_state: true,
        provider_records: {15: record(8, read('shop-human-detail-label') + (weapon ? 1 : 0))},
        provider_constants: {10: numeric(item, weapon ? 'attack' : 'defense')}});
    }
  }
  if (source.medical_status_markers) {
    for (const [index, role] of ['hunter', 'mechanic', 'soldier'].entries()) {
      const path = `save.slot.${slot}.role.${role}`;
      if (!save.object(`${path}.present`).value) continue;
      const dead = save.object(`${path}.dead`).value;
      if (!dead && !save.object(`${path}.numb`).value) continue;
      actorMarkers.push({kind: 'generic_metasprite',
        object_id: read('medical-status-marker-base') + (dead ? 0 : 1),
        anchor_x: read('shop-actor-marker-x'), anchor_y: read('shop-actor-marker-bottom-y')
          - (read('shop-actor-coordinate-loop-start') - index + 1) * read('shop-actor-marker-row-step'),
        oam_y_bias: 1, sprite_pattern_source: SHARED_UI_SPRITE_SOURCE});
    }
  }
  const moneyLabel = source.service_amount_input && source.service_amount === 'money'
    ? await appValue(source.amount_label_handles?.[preview.source_binding] || source.amount_label_handle, 'record_id') : null;
  const layers = preview.layers.flatMap(layer => {
      if (layer.shell_purchase_input) return {...layer,
        provider_records: {55: record(2, read('supply-ammunition-input-label'))},
        provider_constants: {8: shellPurchase.quantity, 9: shellPurchase.maximum, 15: shellPurchase.maximum}};
      if (layer.shell_quantity_input) return {...layer,
        provider_records: {55: record(read('shell-sale-quantity-label-region'), read('shell-sale-quantity-label'))},
        provider_constants: {8: shellSale.quantity, 9: shellSale.count}};
      if (layer.supply_empty_logical_clear) return {...layer, tile: read('supply-empty-clear-tile')};
      if (layer.service_amount_digits) return {...layer,
        record: record(2, read('service-money-input-record')),
        runtime_record_pair: record(2, moneyLabel),
        provider_save_values: {6: `save.slot.${slot}.gold`},
        provider_constants: Object.fromEntries([29, 30, 31, 60, 32, 33, 34]
          .map((provider, index) => [provider, Number(String(amount).padStart(7, '0')[index])]))};
      if (layer.service_quantity_input) return {...layer,
        record: record(2, read('supply-input-record')),
        provider_records: {55: record(2, read(source.service_amount === 'armor'
          ? 'supply-armor-input-label' : 'supply-ammunition-input-label'))},
        facility_parameter_context: {...layer.facility_parameter_context, saveSlot: slot,
          vehicle: servicePreviewContext(preview, interfacePreviewContext()).vehicle, ...(ammunitionComponent || {}), amount}};
      if (layer.rental_list_rows) return rentalRows;
      if (layer.rental_list_frame)
        return {...layer, record: record(2, read('rental-list-frame-record'))};
      if (layer.sale_inventory_header && saleContext)
        return {...layer, record: record(2, read('sale-inventory-header-record'))};
      if (layer.sale_inventory_names && saleContext)
        return {...layer, record: record(2, read('sale-inventory-name-record')),
          cursor: read('sale-inventory-name-origin'),
          provider_save_items: {...layer.provider_save_items, field_id: salePath,
            ...(saleFields ? {field_ids: saleFields} : {})}};
      if (layer.callback_menu && source.callback_menu_record)
        return {...layer, record: record(2, read(source.callback_menu_record))};
      if (layer.kind === 'laser_cannon_layout' && source.laser_arrangement)
        return {...layer, record: record(3, read('laser-cannon-layout-record')),
          backdrop_record: record(3, read('laser-cannon-backdrop-record')),
          pattern_bank: read('laser-cannon-chr-bank'), palette_index: read('laser-cannon-palette-index')};
      if (layer.vehicle_menu_clear) return {...layer, source: {...layer.source,
        preset: read('vehicle-menu-clear-selector').toString(16).toUpperCase().padStart(2, '0')}};
      if (layer.shop_vehicle_names) return {...layer, record: record(2, read('shop-vehicle-name-record')),
        cursor: read('shop-actor-name-origin') + read('menu-text-origin-low')
          + (read('menu-text-origin-high') - 0x60) * 256, save_party_names: 'vehicles'};
      if (layer.shop_goods_rows) return goodsLayers.map(row => ({...row, goods_content: true}));
      if (layer.shop_goods_detail) return detailLayers.map(row => ({...row, goods_content: true}));
      if (layer.shop_config_rows) return listLayers;
      if (layer.shop_actor_names) return {...layer, record: record(2, read('shop-actor-name-record')),
        cursor: read('shop-actor-name-origin') + read('menu-text-origin-low')
          + (read('menu-text-origin-high') - 0x60) * 256, save_party_names: 'characters'};
      if (layer.shop_actor_markers) return actorMarkers;
      if (layer.shop_welcome) return {...layer, record: record(region, goodsWelcome ?? welcome),
        ...(saleContext && layer.runtime_save_item ? {runtime_save_item: {...layer.runtime_save_item,
          field_id: salePath, index: preview.runtime_context?.sale_item_index ?? 0}} : {}),
        ...(wantedName === null ? {} : {runtime_record_pair: wantedName}),
        ...(shellNoWeaponsName === null ? {} : {provider_script_hex: {...layer.provider_script_hex, 7: shellNoWeaponsName}}),
        ...(shellSale ? {provider_constants: {...layer.provider_constants, 15: shellSale.quantity,
          223: shellSale.price}} : {}),
        ...(washPrice === null ? {} : {provider_constants: {...layer.provider_constants, 223: washPrice}}),
        ...(washRecords || {}),
        ...(layer.facility_parameter_bindings?.length
          ? {facility_parameter_context: {...layer.facility_parameter_context,
            saveSlot: slot, role: servicePreviewContext(preview, interfacePreviewContext()).role,
            ...(serviceList ? {configuredName: selectedName} : {}),
            ...(wantedContext || {}), ...(saleContext || {}),
            ...(repairComponent || {}),
            ...(ammunitionComponent || {}),
            ...(amount === null ? {} : {amount}),
            ...(source.chassis_upgrade !== undefined ? {upgradeKind: source.chassis_upgrade,
              upgradePart: preview.runtime_context?.list_choice_index ?? 0} : {}),
            ...(vehicleSelect ? {vehicle: servicePreviewContext(preview, interfacePreviewContext()).vehicle} : {})}} : {}),
        ...(layer.shop_selected_vehicle_name ? {provider_script_hex: {...layer.provider_script_hex,
          7: fixedRuntimeTextScriptHex(saveNameTextSource(vehicleName, vehicleName.value))}} : {}),
        ...(speaker === null ? {} : {prefix_record: record(Number.parseInt(layer.prefix_record?.split(':')[1], 16), speaker)}),
        ...(goodsConfirm ? {runtime_record_pair: selectedGoods.name,
          provider_constants: {...layer.provider_constants, 223: source.shell_purchase_quote
            ? selectedGoods.price * shellPurchase.quantity % 0x1000000 : selectedGoods.price,
            ...(source.shell_purchase_quote ? {15: shellPurchase.quantity} : {})},
          dialogue_scroll_commit: commit} : {}),
        ...(source.list_confirm ? {runtime_record_pair: record(read('service-list-name-region'), selectedName)} : {}),
        ...(source.mode === 'inn-dialogue' && layer.facility_parameter_bindings?.length
          ? {facility_parameter_context: {...layer.facility_parameter_context,
            saveSlot: slot, configuredName: selectedName}} : {})};
      if (layer.shop_frame) return {...layer, record: record(3, read('shop-menu-frame-record'))};
      if (layer.shop_gold) return {...layer, cursor: 256 + read('shop-gold-origin'),
        provider_save_values: {6: `save.slot.${slot}.gold`}};
      if (layer.shop_category) return {...layer, record: record(4, family + read('shop-category-record-base'))};
      if (layer.shop_choices) return {...layer, record: record(2, menu),
        ...(layer.facility_parameter_bindings?.length ? {facility_parameter_context:
          {...layer.facility_parameter_context, saveSlot: slot, vehicle: servicePreviewContext(preview, interfacePreviewContext()).vehicle,
            ...(source.runtime_name_buffer ? {runtimeNameBuffer: servicePreviewContext(preview, interfacePreviewContext()).runtime_name_buffer} : {})}} : {}),
        ...(layer.dialogue_scroll_commit ? {dialogue_scroll_commit: commit} : {}),
        line_origin: read('shop-menu-line-origin')};
      return layer;
    });
  if (goods && !goodsMore) {
    const body = layers.find(layer => layer.shop_welcome);
    layers.splice(layers.indexOf(body), 1);
    layers.splice(layers.findIndex(layer => layer.goods_content), 0, body);
  }
  const retainedSelection = source.retained_selection_preview_id && !preview.glyph_cache_replay
    ? state.project.ui.construction.menu_dispatch_data.previews.find(row =>
      row.id === source.retained_selection_preview_id) : null;
  if (source.retained_selection_preview_id && !preview.glyph_cache_replay && !retainedSelection?.selection_cursor)
    throw new TypeError('设施结果缺少已发布的进入菜单选择来源');
  return {...preview, ...(preview.selection_cursor && preview.selection_cursor.kind !== 'inline-text-confirm'
    ? {selection_cursor: {...preview.selection_cursor, selector: pairedActors ? read('shop-actor-selector') : selector,
      ...(source.shell_purchase_input ? {object_id: read('supply-input-cursor'), choice_index: read('supply-input-digit')}
        : source.service_amount_input ? {object_id: read(source.service_amount === 'money'
        ? 'service-money-input-cursor' : 'supply-input-cursor'), choice_index: read(source.service_amount === 'money'
        ? 'service-money-input-digit' : 'supply-input-digit')} : {}),
      ...(source.laser_arrangement ? {object_id: read(source.laser_cursor_object || 'laser-arrangement-cursor-object')} : {}),
      ...(rentalReturn ? {choice_index: rentalReturnRow}
        : pairedActors ? {choice_index: (preview.runtime_context?.actor ?? servicePreviewContext(preview, interfacePreviewContext()).role) * 2}
        : source.service_amount_input || source.shell_purchase_input ? {} : vehicleSelect ? {choice_index: source.prompt_handle || source.callback_prompt_handle ? selectedIndex : vehicleRow * 2}
        : goods ? {choice_index: selectedGoods.index} : repairChoice !== null ? {choice_index: repairChoice} : {})}} : {}),
    ...(preview.retained_selection_cursors ? {retained_selection_cursors:
      preview.retained_selection_cursors.map(binding => binding.rental_item && source.rental_list
        ? {...binding, selector: read('rental-list-selector'),
          choice_index: preview.runtime_context?.shop_item_index ?? 0} : binding.sale_item && saleContext
        ? {...binding, selector: read('sale-inventory-item-selector'),
          choice_index: preview.runtime_context?.sale_item_index ?? 0} : binding.current_actor
        ? {...binding, choice_index: servicePreviewContext(preview, interfacePreviewContext()).role * 2} : binding.sale_category
        ? {...binding, selector: read('sale-inventory-category-selector')} : binding)} : {}),
    ...(preview.selection_cursors ? {selection_cursors: preview.selection_cursors.map(binding =>
      ({...binding, selector, choice_index: vehicleSelect ? (source.prompt_handle || source.callback_prompt_handle ? selectedIndex : vehicleRow * 2)
        : goodsConfirm ? selectedGoods.index : repairChoice ?? selectedIndex}))} : {}),
    ...(retainedSelection ? {selection_cursor: retainedSelection.selection_cursor,
      menu_highlight: {...retainedSelection.selection_cursor,
        choice_index: retainedSelection.runtime_context?.choice_index ?? 0}} : {}),
    ...((goods || goodsConfirm) && preview.glyph_cache_entry ? {glyph_cache_entry: {...preview.glyph_cache_entry,
      application_stages: preview.glyph_cache_entry.application_stages.filter(call =>
        goodsMore || typeof call === 'string' || call.shop_welcome_slot === undefined)}} : {}),
    layers};
}
