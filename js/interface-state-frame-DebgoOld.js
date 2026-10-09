import { referencePickerMarkup, esc, moduleComponentDefinition, renderModuleComponent, uiPaintPattern, hex, sceneInteractionTileChanges, sceneElevatorPoints, sceneElevatorDestinations } from './monster-figure-C07vG7yu.js';
import { facilityConfigurationLabel, applyBattleResultEffects } from './story-component-labels-C9k8orBA.js';
import { playerTileFromSaveCamera, FIELD_MAIN_MENU_LABELS, interfaceRegionComponents, interfaceComponentBounds, interfaceApplicationExecution, DEVICE_SERVICE_EVIDENCE, executeFacilityWindowRoutine, SERVICE_ROLES, interfacePreviewState, fieldSubmenuCodeValues, fieldSubmenuCodeValue, InterfacePreviewSession, projectInterfaceRegions, intersectInterfaceBounds } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { interfacePreviewContext, saveFields, prepareStorySceneActions, storySceneActions } from './preview-sound-DHDXA99x.js';
import { uiJsRenderSources, uiConstructionModel, resolveStatusUiPreview, interfaceItemSlotProviders, interfaceRecordProviders, uiDialogueActorName, executeSceneActionLocalHandler } from './charset-BJ0aS3Xk.js';

function productMarkup(product) {
  const owner = product.item?.category?.owner;
  const moduleId = owner === "tank" ? "tank-item" : "human-item";
  const icon = product.item && moduleComponentDefinition(moduleId, "preview")
    ? renderModuleComponent(moduleId, "preview", {entry: product.item})
    : `<span class="scene-shop-product-glyph" aria-hidden="true">物</span>`;
  return `<span class="scene-shop-product">${icon}<span>${esc(product.label)}</span></span>`;
}

function shopConfigurationPreview(products, emptyLabel = '') {
  return products.length
    ? `<span class="scene-shop-products">${products.map(productMarkup).join('')}</span>`
    : emptyLabel ? `<span class="scene-shop-products-empty">${esc(emptyLabel)}</span>` : '';
}

function shopConfigurationPicker({
  family, recordId, productsForRecord, controlAttribute, controlValue = "", className = "",
  label = "售卖配置", countLabel = "项货品", emptyLabel = "没有货品",
  filterLabel = "搜索实例或货品", filterPlaceholder = "实例编号或货品名称",
  labelForRecord = record => facilityConfigurationLabel({...family, id: record.id}, record.values),
  currentLabelForRecord = null,
}) {
  const items = (family.records || []).map(record => {
    const products = productsForRecord(family, record);
    return {
      value: String(Number(record.id)),
      label: labelForRecord(record),
      currentLabel: currentLabelForRecord?.(record) || '',
      disabled: record.disabled === true,
      description: `${products.length} ${countLabel}`,
      filter: [labelForRecord(record), record.id_hex, record.id, ...products.map(product => product.label)].join(" "),
      details: shopConfigurationPreview(products, emptyLabel),
    };
  });
  return referencePickerMarkup({
    moduleId: "facility-config",
    value: String(recordId),
    label,
    items,
    className: `shop-configuration-picker ${className}`.trim(),
    filterLabel,
    filterPlaceholder,
    compact: true,
    previewPanel: true,
    controlMarkup: `<select hidden ${controlAttribute}="${esc(controlValue)}">${
      (family.records || []).map(record => `<option value="${Number(record.id)}"${
        Number(record.id) === Number(recordId) ? " selected" : ""}${record.disabled ? ' disabled' : ''}>${esc(labelForRecord(record))}</option>`).join("")
    }</select>`,
  });
}

// @editor-module 非战斗菜单组件引用布局图块与文本选区。


function fieldMenuCurrentInvestigationPreview() {
  const slot = interfacePreviewContext().slot;
  if (!saveFields.ready() || !saveFields.slotStatus(slot).valid) return null;
  const prefix = `save.slot.${slot}`;
  const scene = saveFields.object(`${prefix}.scene_id`).value;
  const position = playerTileFromSaveCamera(saveFields.object(`${prefix}.camera_x`).value,
    saveFields.object(`${prefix}.camera_y`).value);
  for (let vehicle = 10; vehicle >= 0; vehicle--) {
    const target = `${prefix}.field_object.${vehicle}`;
    if (saveFields.object(`${target}.scene_id`).value !== scene
        || saveFields.object(`${target}.x`).value !== position.x
        || saveFields.object(`${target}.y`).value !== position.y) continue;
    const source = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
      item.interface_state_id === 'walking-dialogue.start');
    const record = source?.vehicle_investigation?.record;
    if (!record) throw new TypeError('战车调查缺少文字调用');
    const preview = fieldMenuInteractionPreview(record, 'field-investigation');
    if (!preview) return null;
    return {...preview, runtime_context: {...preview.runtime_context,
      save_slot: slot, investigation_target: target, scene, ...position},
      vehicle_investigation: true,
      layers: preview.layers.filter(layer => !layer.interaction_prefix)
        .map(layer => layer.dialogue_runtime
        ? {...layer, provider_scripts: {}, provider_save_names: {
          [interfaceRecordProviders(layer, [0xE8, 0xFC, 0xFD])[0]]: `${prefix}.vehicle.${vehicle}.name_codes`}} : layer)};
  }
  return null;
}

function fieldMenuInteractionPreview(record, pageId) {
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.id === 'constructor:field-dialogue-no-target');
  if (!preview) return null;
  const body = preview.layers.findLast(layer => layer.kind === 'script');
  if (!body) return null;
  const icons = fieldMenuIcons(preview);
  const menuIndex = FIELD_MAIN_MENU_LABELS.indexOf(pageId === 'field-investigation' ? '调查' : '对话');
  const icon = icons.find(item => item.index === menuIndex);
  const origin = icons[0];
  const actorName = uiDialogueActorName(Number(state.fieldMenuRole || 0));
  return {...preview, runtime_context: {...preview.runtime_context, target: record}, layers: preview.layers.map(layer =>
    layer === body ? {...layer, record, page_index: 0,
      provider_scripts: {...layer.provider_scripts,
        ...(actorName ? {7: `text_slots.slots.${actorName.source}`} : {})}}
      : icon && origin && layer.kind === 'generic_metasprite' ? {...layer,
        anchor_x: layer.anchor_x + icon.bounds.x - origin.bounds.x,
        anchor_y: layer.anchor_y + icon.bounds.y - origin.bounds.y,
      } : {...layer})};
}

function fieldMenuRolePreview(preview, roleId) {
  return resolveStatusUiPreview(preview, {kind: "character-status", role_slot: roleId}, state.project);
}

function fieldMenuLoadoutSelection(preview, index) {
  for (const layer of (preview?.layers || []).map(layer => interfaceItemSlotProviders(layer))) {
    const savedProvider = layer.provider_save_items?.providers?.[index];
    if (savedProvider !== undefined) return {record_id: `save-item-provider:${savedProvider}`};
    const sequences = [...(layer.provider_record_sequences || []),
      ...(layer.provider_record_sequence ? [layer.provider_record_sequence] : [])];
    const provider = sequences.find(sequence => sequence.providers?.[index] !== undefined)
      ?.providers[index];
    if (provider !== undefined) return {record_id: `provider:${provider}`};
  }
  return null;
}

function fieldMenuVehiclePreview(preview, presetId, pageId, {
  source = interfacePreviewContext().actor.startsWith('save-vehicle:') ? 'save' : 'rom',
} = {}) {
  if (!preview) return preview;
  if (source === 'save' && preview.layers?.some(layer => layer.runtime_save_item)) {
    const slot = interfacePreviewContext().slot;
    const vehicle = Number(presetId);
    preview = {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
      layers: preview.layers.map(layer => {
        if (!layer.runtime_save_item) return layer;
        const {field_id, index, index_context, ...binding} = layer.runtime_save_item;
        if (field_id?.includes('.vehicle.')) return {...layer, runtime_save_item: {
          ...layer.runtime_save_item, field_id: field_id.replace(/^save\.slot\.[12]\./u, `save.slot.${slot}.`)
            .replace(/\.vehicle\.\d+\./gu, `.vehicle.${vehicle}.`)}};
        return {...layer, runtime_save_item: {...binding,
          field_ids: Array.from({length: 8}, (_, item) => `save.slot.${slot}.vehicle.${vehicle}.item.${item}`),
          index, index_context}};
      })};
  }
  if (preview.field_submenu_vehicle) {
    if (source === 'save') {
      const vehicle = Number(presetId);
      const slot = interfacePreviewContext().slot;
      const resolved = JSON.parse(JSON.stringify(preview), (key, value) => typeof value === 'string'
        ? value.replace(/^save\.slot\.[12]\./u, `save.slot.${slot}.`)
          .replace(/\.vehicle\.\d+\./gu, `.vehicle.${vehicle}.`) : value);
      const {preset_id, ...binding} = resolved.field_submenu_vehicle;
      resolved.field_submenu_vehicle = {...binding, vehicle};
      resolved.runtime_context = {...resolved.runtime_context, save_slot: slot};
      return resolved;
    }
    const preset = state.project?.game_data?.vehicles?.presets
      ?.find(row => Number(row.preset_id) === Number(presetId));
    if (!preset) throw new TypeError(`战车预设 ${presetId} 不存在`);
    return {...preview,
      field_submenu_vehicle: {...preview.field_submenu_vehicle, preset_id: Number(presetId)},
      runtime_context: {...preview.runtime_context, source: "rom-initial"}};
  }
  return preview;
}

function fieldMenuIcons(preview) {
  const layer = preview?.layers?.find(item => item.kind === "layout");
  if (!layer) return [];
  const layout = uiConstructionModel().static_assets?.layouts?.find(item => item.id === layer.record);
  const cells = new Map(layout?.render?.logical_tile_writes || []);
  return Array.from({length: 8}, (_, index) => {
    const column = 2 + (index % 2) * 5;
    const row = 2 + Math.floor(index / 2) * 2;
    const positions = Array.from({length: 8}, (_, cell) => (row + Math.floor(cell / 4)) * 32 + column + cell % 4);
    return {id: `field-menu-icon:${index}`, index, recordId: layer.record,
      tiles: positions.map(position => cells.get(position)),
      bounds: {x: column * 8, y: (row + Number(layer.shift || 0) / 32) * 8,
        width: 32, height: 16}};
  });
}

function fieldMenuIconMarkup(index) {
  return `<canvas width="32" height="16" data-field-menu-icon="${index}"
    aria-label="${FIELD_MAIN_MENU_LABELS[index]}"></canvas>`;
}

function fieldMenuIconNodes(preview, screenId) {
  return fieldMenuIcons(preview).map(icon => ({id: icon.id, kind: "image",
    label: FIELD_MAIN_MENU_LABELS[icon.index], depth: 1, screenId,
    labelMarkup: `${fieldMenuIconMarkup(icon.index)}<span>${FIELD_MAIN_MENU_LABELS[icon.index]}</span>`,
    selection: {bounds: icon.bounds},
    controlsMarkup: `<div class="field-menu-icon-inspector">${fieldMenuIconMarkup(icon.index)}
      <details><summary>物理位置</summary><nav aria-label="图标图块">${icon.tiles.map(tile => {
        const bank = tile < 0xC0 ? 0x0A : 0x0B;
        const localTile = tile & 0x3F;
        return `<a class="editor-inline-link" href="?view=bytemap-chr&amp;chrTile=${bank * 64 + localTile}">
          ${hex(bank, 2)}:${hex(localTile, 2)} ↗</a>`;
      }).join(" ")}</nav></details></div>`,
  }));
}

async function paintFieldMenuIcons(root = document) {
  const canvases = [...root.querySelectorAll("[data-field-menu-icon]")];
  if (!canvases.length) return;
  const project = state.project;
  const {patterns, corePatterns} = await uiJsRenderSources();
  if (state.project !== project) return;
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.interface_state_id === 'field-command-menu.main');
  if (!preview) throw new TypeError('主菜单图标缺少窗口构造');
  const icons = fieldMenuIcons(preview);
  for (const canvas of canvases) {
    if (!canvas.isConnected) continue;
    const icon = icons[Number(canvas.dataset.fieldMenuIcon)];
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(32, 16);
    icon.tiles.forEach((tile, index) => uiPaintPattern(pixels.data, 32, 16,
      patterns, corePatterns, tile, index % 4 * 8, Math.floor(index / 4) * 8,
      [], [0x0F, 0x30, 0x10, 0x00]));
    context.imageSmoothingEnabled = false;
    context.putImageData(pixels, 0, 0);
  }
}

function startupLoadNodes(screenId) {
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.interface_state_id === 'save-management.file-menu');
  const recordId = preview?.layers?.find(layer => layer.save_slot_values && !layer.glyph_cache_only)?.record;
  if (!recordId) throw new TypeError('读档菜单缺少正文构造');
  return [
    {id: "startup:title", kind: "text", label: "标题", depth: 1, screenId,
      recordId, ranges: [{offset: 2, length: 9}]},
    ...[{label: "存档槽 1", offset: 13, length: 11,
        ranges: [{offset: 13, length: 4}, {offset: 19, length: 5}]},
      {label: "存档槽 2", offset: 26, length: 11,
        ranges: [{offset: 26, length: 4}, {offset: 32, length: 5}]},
      {label: "继续命令", offset: 41, length: 4},
      {label: "移动记录命令", offset: 50, length: 8},
      {label: "重新开始命令", offset: 60, length: 8},
      {label: "删除记录命令", offset: 72, length: 6}].map((entry, index) => ({
        id: `startup:entry:${index}`, kind: "text", label: entry.label,
        depth: 1, screenId, recordId, editorMode: "exact",
        ranges: entry.ranges || [{offset: entry.offset, length: entry.length}],
        selection: {record_id: recordId, ranges: [{offset: entry.offset, length: entry.length}]},
      })),
  ];
}

// @editor-module 组件树按区域及领域提供的组件声明保留身份与字段引用。

async function interfaceStateTree({label, regions, includeEmpty = true}, describeRegion) {
  const widgets = [{id: 'screen', label, kind: 'screen', depth: 0}];
  for (const region of regions || []) {
    if (!region.visible || !includeEmpty && !region.components?.length && !region.slots?.length && !region.children?.length) continue;
    const components = interfaceRegionComponents(region);
    const declaration = describeRegion ? await describeRegion(region, components, widgets) : region;
    widgets.push({id: region.id, label: `${region.label}窗口`, kind: 'layout', depth: 1,
      parentId: 'screen', layer: region.layer, clip: region.clip,
      region: region.id, bounds: interfaceComponentBounds(declaration.layoutComponents || []) || region.bounds, components});
    const parents = new Map([[1, region.id]]);
    for (const child of declaration.children || []) {
      const depth = child.depth ?? 2;
      widgets.push({...child, depth, region: child.region ?? region.id,
        parentId: child.parentId ?? parents.get(depth - 1) ?? region.id, layer: region.layer, clip: region.clip});
      parents.set(depth, child.id);
    }
  }
  return widgets;
}

// @editor-module 设备帧消费显式随机现场并返回已确认的完成结果。

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (value, name) => {
  if (!byte(value)) throw new TypeError(`设备帧缺少 ${name}`);
  return value;
};

const FACILITY_DEVICE_CODE_NAMES = Object.freeze([
  'frog-initial-x', 'frog-finish-x', 'frog-moving-wait',
  ...Array.from({length: 12}, (_, index) => `frog-type-${index}`),
  ...Array.from({length: 12}, (_, index) => `frog-odds-${index}`),
  ...Array.from({length: 3}, (_, index) => `frog-row-y-${index}`),
  ...Array.from({length: 4}, (_, index) => `frog-idle-frame-${index}`),
  ...Array.from({length: 4}, (_, index) => `frog-wait-0-${index}`),
  ...Array.from({length: 2}, (_, index) => `frog-moving-frame-0-${index}`),
  ...Array.from({length: 3}, (_, index) => `frog-moving-frame-${index + 1}`),
  ...Array.from({length: 3}, (_, index) => `frog-speed-${index + 1}`),
  ...Array.from({length: 12}, (_, index) => `frog-wait-${index + 4}`),
  'vending-lottery-ball-object', 'vending-lottery-win-x',
  ...Array.from({length: 16}, (_, index) => `vending-lottery-delta-${index}`),
  ...Array.from({length: 12}, (_, index) => `vending-lottery-wait-${index}`),
  ...Array.from({length: 16}, (_, index) => `vending-lottery-x-${index}`),
  ...Array.from({length: 16}, (_, index) => `vending-lottery-y-${index}`),
]);

function moveFrog(racer, random, codes) {
  const read = name => requireByte(codes[name], name);
  if (racer.type === 0) {
    if (racer.speed) {
      racer.wait = (racer.wait - 1) & 255;
      if (racer.wait < 128) {racer.object = read('frog-idle-frame-0'); return;}
      racer.speed = (racer.speed - 1) & 255;
      racer.wait = read('frog-moving-wait');
    }
    racer.wait = (racer.wait - 1) & 255;
    if (racer.wait >= 128) {
      racer.speed = (racer.speed + 1) & 255;
      racer.wait = read(`frog-wait-0-${random & 3}`);
    }
    racer.x = (racer.x - 1) & 255;
    racer.object = read(`frog-moving-frame-0-${(racer.x >> 1) & 1}`);
    return;
  }
  if (racer.y >= racer.initialY) {
    racer.y = racer.initialY;
    racer.wait = (racer.wait - 1) & 255;
    if (racer.wait < 128) {racer.object = read(`frog-idle-frame-${racer.type}`); return;}
    racer.fractionalSpeed = 255;
    racer.speed = read(`frog-speed-${racer.type}`);
    racer.wait = read(`frog-wait-${racer.type * 4 + (random & 3)}`);
  }
  racer.x = (racer.x - 1) & 255;
  const position = racer.fraction + racer.fractionalSpeed;
  racer.fraction = position & 255;
  racer.y = (racer.y + racer.speed + (position >> 8)) & 255;
  const speed = racer.fractionalSpeed + 64;
  racer.fractionalSpeed = speed & 255;
  racer.speed = (racer.speed + (speed >> 8)) & 255;
  racer.object = read(`frog-moving-frame-${racer.type}`);
}

function moveLottery(frame, codes) {
  frame.remaining = (frame.remaining - 1) & 255;
  if (frame.remaining >= 128) {
    frame.status = 'complete';
    frame.completion = {kind: frame.kind, confirmed: true, position: frame.position,
      won: frame.x === codes['vending-lottery-win-x']};
    return;
  }
  frame.position = (frame.position - 1) & 15;
  frame.x = requireByte(codes[`vending-lottery-x-${frame.position}`], '抽奖横坐标');
  frame.y = requireByte(codes[`vending-lottery-y-${frame.position}`], '抽奖纵坐标');
  frame.object = requireByte(codes['vending-lottery-ball-object'], '抽奖图形') + Number(frame.x === codes['vending-lottery-win-x']);
  frame.wait = frame.remaining < 12 ? requireByte(codes[`vending-lottery-wait-${frame.remaining}`], '抽奖帧等待') : 2;
}

function createFacilityDeviceFrame(kind, input, codes) {
  const random = input?.random;
  requireByte(random?.high, '随机高字节'); requireByte(random?.low, '随机低字节');
  const result = {kind, status: 'running', frame: 0, random: structuredClone(random), completion: null};
  if (kind === 'frog-race') {
    if (!Array.isArray(input.fractional) || input.fractional.length !== 3 || !input.fractional.every(byte))
      throw new TypeError('设备帧缺少调用前 054A 三字节现场');
    result.group = random.high & 3;
    result.racers = Array.from({length: 3}, (_, index) => {
      const type = requireByte(codes[`frog-type-${result.group * 3 + 2 - index}`], '参赛类型');
      if (type > 3) throw new TypeError('参赛类型超出已确认的动画域');
      return {type, odds: requireByte(codes[`frog-odds-${result.group * 3 + 2 - index}`], '赔率'),
        x: requireByte(codes['frog-initial-x'], '起点'), y: codes[`frog-row-y-${index}`],
        initialY: codes[`frog-row-y-${index}`], fraction: input.fractional[index],
        fractionalSpeed: null, speed: 1, wait: 1, object: codes[`frog-idle-frame-${type}`]};
    });
    for (let index = 2; index >= 0; index--) moveFrog(result.racers[index], 0, codes);
    return result;
  }
  if (kind !== 'vending-lottery') throw new TypeError('未声明的设备帧构造');
  result.position = requireByte(input.position, '抽奖起始位置');
  if (result.position > 15) throw new RangeError('抽奖起始位置超出位置表');
  result.remaining = (result.position + 24 + requireByte(codes[`vending-lottery-delta-${random.high & 15}`], '抽奖增量')) & 255;
  result.wait = 0;
  moveLottery(result, codes);
  return result;
}

function advanceFacilityDeviceFrame(current, input, codes) {
  const next = structuredClone(current);
  if (next.status !== 'running') return next;
  if (input?.type !== 'frame') throw new TypeError('设备帧需要逐帧输入');
  if (next.kind === 'frog-race') {
    const random = input.random ?? next.random.frames?.[next.frame];
    if (!byte(random?.high) || !byte(random?.low)) return {...next, status: 'unknown',
      completion: {kind: next.kind, confirmed: false, reason: '赛程缺少本帧显式随机状态'}};
    Object.assign(next.random, {high: random.high, low: random.low});
    let value = random.high;
    for (let index = 2; index >= 0; index--, value >>= 2) {
      const racer = next.racers[index];
      moveFrog(racer, value, codes);
      if (racer.x < requireByte(codes['frog-finish-x'], '终点')) {
        next.status = 'complete';
        next.completion = {kind: next.kind, confirmed: true, winner: index, type: racer.type, odds: racer.odds};
        break;
      }
    }
  } else {
    if (next.wait) next.wait--;
    if (!next.wait) moveLottery(next, codes);
  }
  next.frame++;
  return next;
}

// @editor-module 设备交易按应用正文推进，设备完成结果只提交到快照。

function deviceAnimationExecution({command, graph, text, goods, prices, codes, wager, weaponCapacities = {}, navigation}) {
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

// @editor-module 设备输入仅修改预览快照，未确认效果在调用边界停止。

function deviceServiceExecution({command, graph, text, prices = [], wager, weaponCapacities, destinations = [], goods = [], codes = {}, targets = [], control, alarm, sceneExecution, entry, reason, navigation}) {
  const cid = command.command_id;
  if ([0x1B, 0x1C, 0x1D, 0x32].includes(cid))
    return deviceAnimationExecution({command, graph, text, goods, prices, wager, weaponCapacities, codes, navigation});
  const block = (state, message) => {
    state.execution.status = 'unknown'; state.execution.reason = message;
    state.execution.trace.push({node: state.node, status: 'unknown', reason: message, evidence: DEVICE_SERVICE_EVIDENCE});
    return state;
  };
  const returnToScene = state => {
    state.execution.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
    state.node = 'device:scene-return';
    if (state.context.scene) state.domainResults.scene = {kind: 'scene', ...state.context.scene, confirmed: true};
    return state;
  };
  const commitFlag = (state, flag, value) => {
    const field = `save.slot.${state.context.slot}.global_event_flag.${flag.toString(16).toUpperCase().padStart(2, '0')}`;
    if (!Object.hasOwn(state.fields, field)) return false;
    state.fields[field] = value;
    state.domainResults.controller = {command: cid, entry: entry.handle, flag, value, confirmed: true};
    const reference = `global-event-flag:${flag.toString(16).toUpperCase().padStart(2, '0')}`;
    const controlled = control?.event_flag_reference === reference ? (control.targets || [])
      .filter(row => !row.event_flag_reference || row.event_flag_reference === reference)
      : control?.failure_flag_reference === reference ? (control.targets || []).filter(row => row.event_flag_reference === reference) : [];
    state.domainResults.controlledObjects = {committed: false,
      status: controlled.length ? 'deferred' : 'unknown', references: structuredClone(controlled),
      reason: cid === 0x38 ? `尚缺事件位 $${flag.toString(16).toUpperCase().padStart(2, '0')} 的受控对象读取现场`
        : '受控对象由场景装载或自主动作续接；设备会话只提交事件字段'};
    if (cid === 0x37 && flag >= 0xA0 && flag <= 0xA3 && sceneExecution) {
      state.domainResults.controlledObjects = {...sceneExecution.advance(state), references: structuredClone(controlled)};
      state.execution.transactions.push({type: 'scene-actors', ...state.domainResults.controlledObjects});
    }
    state.execution.transactions.push({type: 'controller', ...state.domainResults.controller});
    return true;
  };
  const comparePassword = state => {
    const flag = codes[`controller-event-flag-${entry.statusIndex}`];
    const length = codes['controller-password-length'];
    const offset = codes[`controller-password-offset-${flag - 0xA0}`];
    if (flag < 0xA0 || flag > 0xA3 || !Number.isInteger(offset) || offset + length > 24)
      return block(state, '此密码终端的比较表未确认');
    const matched = state.execution.passwordBuffer.every((value, index) => value
      === codes[`controller-password-byte-${offset + length - 1 - index}`]);
    state.domainResults.password = {matched, entry: entry.handle, command: cid, confirmed: true};
    state.execution.feedbackFrames = codes['controller-password-feedback-frames'];
    state.execution.reason = `反馈等待 ${state.execution.feedbackFrames} 帧；A / B 推进等待结束`;
    state.node = 'device:password-result'; state.pause = {kind: 'wait'};
    return state;
  };
  const options = state => state.execution.status !== 'waiting' || state.pause?.kind === 'wait' ? [] : cid === 0x1F
    ? destinations.map(row => `楼层 ${row.value}`) : cid >= 0x1B && cid <= 0x1D
      ? goods.slice(0, 6).map((_, index) => `商品格 ${index + 1}`)
      : cid >= 0x36 ? Array.from({length: navigation.capacity || 0}, (_, index) => index === targets.length
        ? 'EXIT' : cid !== 0x37 && targets[index] === 3 ? 'OPEN'
          : cid !== 0x37 && targets[index] === 4 ? 'CLOSE' : cid === 0x37 && targets[index] === 4 ? 'BACK'
            : cid === 0x37 && targets[index] === 3 && codes[`controller-password-key-${index}`] <= 9
              ? String(codes[`controller-password-key-${index}`]) : `键位 ${index + 1}`) : [];
  return {
    options,
    initial({fields, context, view = {}}) {
      const state = interfacePreviewState({fields, context, node: graph.entry, entry: graph.entry,
        view,
        pause: {kind: 'menu'}, selections: {choice: 0}, returnStack: [{caller: 'scene-interaction'}],
        execution: {status: 'waiting', reason: '', trace: [], transactions: [], password: ''}});
      if (reason) return block(state, reason);
      if (cid === 0x1F) {
        const index = destinations.findIndex(row => row.sceneId === context.scene.sceneId);
        if (index < 0 || destinations.length > navigation.count) return block(state, '电梯初始楼层超出当前选择域');
        state.selections.choice = index;
      }
      if (cid >= 0x36 && (!entry || entry.statusIndex < 0 || entry.statusIndex > 22))
        return block(state, '终端实例超出已确认的调用现场');
      if (cid >= 0x36 && (navigation.capacity !== targets.length + 1 || navigation.count !== 12
          || codes['controller-selection-count'] < navigation.capacity))
        return block(state, '终端布局与运行选择域不一致');
      if (cid === 0x37) {
        const length = codes['controller-password-length'];
        if (length !== 6) return block(state, '密码缓冲长度超出已确认的六位输入');
        state.execution.passwordBuffer = Array(length).fill(codes['controller-password-fill']);
        state.execution.passwordCursor = 0;
      }
      state.windows = [{id: 'device', node: state.node, choice: state.selections.choice}];
      if (sceneExecution) sceneExecution.advance(state);
      return state;
    },
    advance(state, input) {
      if (input.type === 'battle-result' && state.node === 'device:password-alarm'
          && state.returnStack.at(-1)?.caller === 'password-alarm') {
        const result = input.result;
        const invocation = result?.invocation;
        const alarmField = `save.slot.${state.context.slot}.global_event_flag.${alarm.pendingEventFlag.toString(16).toUpperCase().padStart(2, '0')}`;
        if (invocation?.saveSlot !== state.context.slot || invocation?.sceneId !== state.context.scene?.sceneId
            || invocation.sourceFields?.[alarmField] !== 1
            || result.outcome === 'victory' && (!result.eventFlags?.includes(alarm.pendingEventFlag)
              || result.sceneReturn?.mode !== 'reload' || result.sceneReturn?.handoff)
            || result.outcome === 'defeat' && result.sceneReturn?.handoff !== 'story-f2'
            || !applyBattleResultEffects(state, result))
          return block(state, '战斗完成效果未确认；保留调查调用栈');
        state.domainResults.battleResult = structuredClone(result);
        state.execution.transactions.push({type: 'battle-result', outcome: result.outcome, effects: structuredClone(result.effects)});
        if (result.sceneReturn.mode === 'reload' && !result.sceneReturn.handoff && sceneExecution) {
          state.domainResults.controlledObjects = sceneExecution.reload(state);
          state.execution.transactions.push({type: 'scene-reload', ...state.domainResults.controlledObjects});
        }
        state.returnStack.pop(); state.execution.reason = '';
        return returnToScene(state);
      }
      if (cid === 0x37 && state.execution.status === 'returned' && input.type === 'a'
          && !state.domainResults.sceneReturn?.handoff)
        return this.initial({fields: state.fields, context: state.context, view: state.view});
      if (state.execution.status !== 'waiting') return state;
      const list = options(state), e = state.execution;
      e.trace.push({node: state.node, input: input.type, selection: state.selections.choice, evidence: DEVICE_SERVICE_EVIDENCE});
      if (cid === 0x37 && state.node === 'device:password-result') {
        if (!['a', 'b'].includes(input.type)) return state;
        const flag = state.domainResults.password.matched ? codes[`controller-event-flag-${entry.statusIndex}`]
          : codes['controller-password-failure-flag'];
        if (!commitFlag(state, flag, 1)) return block(state, '密码终端预览缺少事件字段');
        e.feedbackFrames = 0;
        if (!state.domainResults.password.matched) {
          state.windows = []; state.pause = {kind: 'battle'};
          state.node = 'device:password-alarm';
          if (!alarm) return block(state, '报警战斗入口未确认；保留调查调用栈');
          state.domainResults.battleCall = {...alarm, node: state.node, caller: structuredClone(state.returnStack.at(-1)),
            scene: structuredClone(state.context.scene)};
          state.returnStack.push({caller: 'password-alarm', entry: alarm.actor});
          e.status = 'battle'; e.reason = '等待防御机器战斗完成结果';
          return state;
        }
        e.reason = '';
        return returnToScene(state);
      }
      if (input.type === 'password' && cid === 0x37) {
        const length = codes['controller-password-length'];
        if (!Number.isInteger(length) || length < 1 || length > 6 || !new RegExp(`^[0-9]{0,${length}}$`, 'u').test(input.value))
          throw new RangeError('密码输入超出当前数字域');
        e.password = input.value;
        e.passwordBuffer = Array.from({length}, (_, index) => index < input.value.length
          ? Number(input.value[index]) : codes['controller-password-fill']);
        e.passwordCursor = Math.min(input.value.length, length - 1);
        if (input.value.length < length) return state;
        return comparePassword(state);
      }
      if (input.type === 'option' || ['up', 'down', 'left', 'right'].includes(input.type)) {
        let index = input.index;
        if (input.type !== 'option') {
          const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
            selector: navigation.selector, selection_index: state.selections.choice,
            selection_count: cid === 0x1F ? destinations.length : cid >= 0x36 ? codes['controller-selection-count'] : navigation.count,
            direction_index: ['up', 'down', 'left', 'right'].indexOf(input.type) + 1}, navigation);
          if (result.status !== 'available') return block(state, '设备方向输入缺少已确认的选择布局');
          index = result.state.selection_index;
        }
        if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new RangeError('选择超出当前设备选项');
        state.selections.choice = index; state.windows[0].choice = index;
        return state;
      }
      if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的设备输入');
      if (cid === 0x1F) {
        const row = input.type === 'b' ? destinations.find(row => row.sceneId === state.context.scene.sceneId)
          : destinations[state.selections.choice];
        state.domainResults.scene = {kind: 'scene', sceneId: row.sceneId, x: row.x, y: row.y, confirmed: true};
        state.node = 'device:elevator-arrival';
        e.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
        e.transactions.push({type: 'elevator', cancelled: input.type === 'b', scene: state.domainResults.scene});
        return state;
      }
      if (input.type === 'b') {
        if (cid >= 0x36) return returnToScene(state);
        e.status = 'returned'; state.returnStack.pop(); state.windows = []; state.pause = null;
        return state;
      }
      if (cid >= 0x36 && state.selections.choice === targets.length) return returnToScene(state);
      if (cid === 0x37) {
        const target = targets[state.selections.choice];
        if (target === 1) return state;
        if (target === 4) e.passwordCursor = Math.max(0, e.passwordCursor - 1);
        else if (target === 3) {
          const value = codes[`controller-password-key-${state.selections.choice}`];
          if (!Number.isInteger(value)) return block(state, '当前键位的缓冲值未确认');
          e.passwordBuffer[e.passwordCursor] = value;
          e.password = e.passwordBuffer.filter(value => value <= 9).join('');
          if (e.passwordCursor === codes['controller-password-length'] - 1) return comparePassword(state);
          e.passwordCursor++;
        } else return block(state, '密码键位超出已确认的分派域');
        e.password = e.passwordBuffer.filter(value => value <= 9).join('');
        return state;
      }
      if (cid >= 0x36) {
        const target = targets[state.selections.choice];
        if (target === 1) return state;
        if (![3, 4].includes(target)) return block(state, '控制器选择不在已确认的分派域');
        const flag = codes[`controller-event-flag-${entry.statusIndex}`];
        if (!Number.isInteger(flag) || flag < 0 || flag > 255) return block(state, '控制器事件位未确认');
        if (!commitFlag(state, flag, Number(target === 3))) return block(state, '控制器预览缺少事件字段');
        return returnToScene(state);
      }
      return block(state, '商品已选择；价格、携带物提交及抽奖动画返回未确认');
    },
  };
}

// @editor-module 终端返回的自主动作只更新预览现场，操作数取当前字段对象。

const DEVICE_SCENE_EVIDENCE = 'project/evidence/reverse-engineering/scene-actor-autonomy/observations.json';
const localOperations = new Set(['wait-event-flag-set', 'set-actor-type', 'remove-actor',
  'branch-on-player-position-rectangle', 'toggle-player-control-lock', 'set-actor-position',
  'end-actor-script']);

async function prepareDeviceSceneExecution(context, dependencies, alarm = null) {
  if (!context.scene) return null;
  const [actors, scripts, story, document, pages, sets] = await Promise.all([
    'scene-actor', 'story-autonomous-script', 'project.story',
    `scene:${context.scene.sceneId.toString(16).toUpperCase().padStart(2, '0')}`,
    'metatile-page', 'metatile-set',
  ].map(id => dependencies.readDocument(id)));
  const records = actors.records.filter(row => row.entry_id === context.scene.sceneId);
  const programs = await prepareStorySceneActions(records, scripts, story, {
    getPackageDocument: path => dependencies.readPackageDocument(path),
  });
  const definitions = records.map(record => ({record, actions: storySceneActions(record, programs, story)}))
    .filter(({actions}) => actions[0]?.operation === 'wait-event-flag-set'
      && actions[0].operands[0] >= 0xA0 && actions[0].operands[0] <= 0xA3);
  return definitions.length ? deviceSceneExecution({definitions, scene: document.scene || document, pages, sets, alarm}) : null;
}

function deviceSceneExecution({definitions, scene, pages, sets, alarm}) {
  const initial = () => ({sceneId: scene.id, controlLock: 0, tiles: [],
    actors: definitions.map(({record}) => ({handle: record.uid, id: record.id, cursor: 0,
      x: record.x, y: record.y, actorType: record.actor_type, direction: record.direction,
      marker: record.render_slot_marker, actionState: 0})), pending: []});
  return {reload(state) {
    delete state.view.deviceScene;
    const initialization = [];
    const missing = [];
    if (alarm?.initialization) {
      executeSceneActionLocalHandler(alarm.initialization, {
        read: () => undefined,
        write: (id, value) => {
          const field = id.replace('save.active.', `save.slot.${state.context.slot}.`);
          if (!Object.hasOwn(state.fields, field)) missing.push(`${alarm.actor} 缺少报警初始化事件字段`);
          else {
            state.fields[field] = value;
            if (Array.isArray(state.fields.eventFlags))
              state.fields.eventFlags = state.fields.eventFlags.filter(flag => flag !== alarm.initialization.commandBytes[1]);
            initialization.push({actor: alarm.actor, field, value});
          }
        },
      });
    }
    const result = this.advance(state);
    return {...result, initialization, ...(missing.length ? {confirmed: false, status: 'unknown', reason: missing.join('；')} : {})};
  }, advance(state) {
    const snapshot = state.view.deviceScene ||= initial();
    const effects = [], missing = [];
    snapshot.pending = [];
    for (const actor of snapshot.actors) {
      if (actor.actorType === 255) continue;
      const definition = definitions.find(row => row.record.uid === actor.handle);
      const keys = {'actor.type': 'actorType', 'actor.x': 'x', 'actor.y': 'y',
        'actor.direction': 'direction', 'actor.cursor': 'cursor', 'render.marker': 'marker',
        'render.actionState': 'actionState'};
      const scratch = {};
      const read = id => id.startsWith('save.active.')
        ? state.fields[id.replace('save.active.', `save.slot.${state.context.slot}.`)]
        : id === 'control.controlLock' ? snapshot.controlLock
          : id === 'party.x' ? state.context.scene.x : id === 'party.y' ? state.context.scene.y
            : actor[keys[id]] ?? scratch[id];
      const write = (id, value) => {
        if (id === 'control.controlLock') snapshot.controlLock = value;
        else if (keys[id]) {
          if (actor[keys[id]] !== value) effects.push({actor: actor.handle, field: keys[id], value});
          actor[keys[id]] = value;
        } else scratch[id] = value;
      };
      for (let count = 0; count <= definition.actions.length; count++) {
        const action = definition.actions.find(row => row.cursor === actor.cursor);
        if (!action || !localOperations.has(action.operation) && action.operation !== 'mutate-field-tile-near-actor') {
          missing.push(`${actor.handle} 自主动作未确认`); break;
        }
        let advance;
        if (action.operation === 'wait-event-flag-set'
            && !Object.hasOwn(state.fields, `save.slot.${state.context.slot}.global_event_flag.${action.operands[0].toString(16).toUpperCase().padStart(2, '0')}`)) {
          missing.push(`${actor.handle} 缺少自主动作事件字段`); break;
        }
        if (action.operation === 'mutate-field-tile-near-actor') {
          const changes = sceneInteractionTileChanges(scene, {...actor,
            direction: ['up', 'down', 'left', 'right'][actor.direction]}, {pages, sets}, snapshot.tiles);
          if (!changes.length) {missing.push(`${actor.handle} 地图变化未确认`); break;}
          for (const tile of changes) {
            const at = snapshot.tiles.findIndex(row => row.x === tile.x && row.y === tile.y);
            if (at < 0) snapshot.tiles.push(tile); else snapshot.tiles[at] = tile;
          }
          effects.push({actor: actor.handle, kind: 'scene-tiles', tiles: changes});
          advance = 1;
        } else advance = executeSceneActionLocalHandler({commandBytes: [action.command.opcode, ...action.operands],
          semantic: action.semantic}, {read, write, actor: actor.id, slot: actor.id});
        if (!Number.isInteger(advance)) {missing.push(`${actor.handle} 自主动作返回未确认`); break;}
        if (advance === 0) {
          if (actor.actorType !== 255) snapshot.pending.push({actor: actor.handle, cursor: actor.cursor,
            operation: action.operation, ...(action.operation === 'wait-event-flag-set' ? {flag: action.operands[0]} : {})});
          break;
        }
        actor.cursor = (actor.cursor + advance) & 255;
      }
    }
    return {committed: effects.length > 0, confirmed: missing.length === 0,
      status: missing.length ? 'unknown' : 'confirmed', evidence: DEVICE_SCENE_EVIDENCE,
      actors: structuredClone(snapshot.actors), tiles: structuredClone(snapshot.tiles),
      controlLock: snapshot.controlLock, pending: structuredClone(snapshot.pending), effects,
      reason: missing.join('；')};
  }};
}

// @editor-module 设备预览从字段对象取得入口、配置与选择布局。

async function startDeviceServiceExecution(model, context, dependencies) {
  const cid = model.command.command_id;
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const vending = [0x1B, 0x1C, 0x1D].includes(cid);
  const animated = vending || cid === 0x32;
  const names = [...(animated ? FACILITY_DEVICE_CODE_NAMES : []),
    ...(vending ? ['vending-role-inventory-capacity', 'vending-shell-type-capacity',
      'vending-party-selector', 'vending-shell-overflow-price-code'] : []),
    ...(cid === 0x1C ? ['vending-loaded-weapon-item-limit', 'vending-loaded-weapon-count-mask'] : []),
    ...(cid >= 0x36 ? ['controller-selection-count',
      ...Array.from({length: 23}, (_, index) => `controller-event-flag-${index}`)] : []),
    ...(cid === 0x37 ? ['controller-password-length', 'controller-password-fill',
    'controller-password-feedback-frames', 'controller-password-failure-flag',
    ...Array.from({length: 14}, (_, index) => `controller-password-key-${index}`),
    ...Array.from({length: 24}, (_, index) => `controller-password-byte-${index}`),
    ...Array.from({length: 4}, (_, index) => `controller-password-offset-${index}`)] : [])];
  const [raw, interfaces, layout, movement, parameters] = await Promise.all([
    dependencies.readFields(), dependencies.readInterfaces(), dependencies.readDocument('selection-layout'),
    dependencies.readDocument('code-module'), fieldSubmenuCodeValues(names, read),
  ]);
  const codes = Object.fromEntries(names.map(name => [name, fieldSubmenuCodeValue(parameters, name)]));
  const fields = Object.fromEntries(raw.all(`save.slot.${context.slot}.`).map(row => [row.fieldId, structuredClone(row.value)]));
  const source = model.graph.nodes.find(row => row.pause.kind === 'menu')?.publishedPreview?.facility_screen;
  let selector = null, count = null, destinations = [], goods = [], entry = null, reason = null, targets = [], control = null, alarm = null, prices = [], wager, weaponCapacities = {};
  if (source?.selection_handle) {
    [selector, count] = await Promise.all(['selector', 'count'].map(async name =>
      (await dependencies.readField(source.resource_id, source.selection_handle, name)).value));
  }
  if (cid === 0x32) {
    const instance = context.service?.argument ?? 0;
    const resource = `ui-facility:frog-race:config:${instance.toString(16).toUpperCase().padStart(2, '0')}`;
    wager = (await dependencies.readField(resource, resource, 'price')).value;
  }
  if (cid === 0x1F || cid >= 0x1B && cid <= 0x1D) {
    const configuration = await dependencies.readDocument('facility-config');
    const instance = context.service?.argument ?? 0, family = cid - 0x10;
    const reference = configuration.families.find(row => row.id === family)?.records.find(row => row.id === instance);
    if (!reference) throw new TypeError('设备缺少当前配置');
    const length = (await dependencies.readField('facility-config', reference.record_id, 'payload_length')).value;
    goods = await Promise.all(Array.from({length}, async (_, index) =>
      (await dependencies.readField('facility-config', reference.record_id, `slot:${index}`)).value));
    if (cid === 0x1F) {
      const point = context.scene;
      if (!point) reason = '电梯执行需要场景中的触发格';
      else {
        const [scene, pages, sets, terrain, facilities, scenes] = await Promise.all([
          dependencies.readDocument(`scene:${point.sceneId.toString(16).toUpperCase().padStart(2, '0')}`),
          dependencies.readDocument('metatile-page'), dependencies.readDocument('metatile-set'),
          dependencies.readDocument('field-terrain-behavior-service'), dependencies.readDocument('ui-facility'),
          dependencies.readDocument('project.scenes'),
        ]);
        const elevator = sceneElevatorPoints(scene.scene, {pages, sets, terrain})
          .find(row => row.x === point.x && row.y === point.y && row.instance_id === instance);
        if (!elevator) reason = '当前坐标与配置不对应电梯触发格';
        else destinations = sceneElevatorDestinations(elevator, goods, facilities, scenes);
      }
    }
  }
  if (vending) {
    const items = await dependencies.readDocument('item-entry');
    if (cid === 0x1C) {
      const indexed = await dependencies.readDocument('shared-indexed-byte-overlays');
      weaponCapacities = Object.fromEntries(items.records.filter(row => Number.isInteger(row.equipment?.raw_flags)).map(row => {
        const index = row.equipment.raw_flags & 7;
        return [row.id, index === 7 ? indexed.zero_prefixed_ascending_bit_masks[0] : indexed.level_value_codebook[index]];
      }));
    }
    prices = await Promise.all(goods.slice(0, 6).map(async (id, index) => {
      let price;
      if (id >= 15) price = items.records.find(row => row.id === id)?.price;
      else {
        const raw = id === 14 ? codes['vending-shell-overflow-price-code']
          : (await dependencies.readField('shell-record', `shell:${id.toString(16).toUpperCase().padStart(2, '0')}`, 'price.raw_code')).value;
        price = items.equipment_editor.numeric_codes.find(row => row.raw_code === raw);
      }
      return price?.available ? (price.value & 255) * (cid === 0x1D ? goods[index + 6] : goods[index + 6] & 127) : null;
    }));
  }
  if (cid >= 0x36) {
    const table = model.command.dialogue_flow.segments.find(row => row.index === 2)?.actions
      .find(row => row.kind === 'indexed-segment-table');
    const resourceId = `application-command:${cid.toString(16).toUpperCase()}`;
    if (table) targets = await Promise.all(table.alternatives.map(async (_, index) =>
      (await dependencies.readField(resourceId,
        `${resourceId}:choice-branches:${table.prg_offset}`, `target:${index}`)).value));
    const handle = context.service?.entryHandle || source?.entry_handle;
    if (!handle) reason = '控制终端执行需要对应的场景调查入口';
    else {
      const resource = handle.split(':').slice(0, 2).join(':');
      const [handler, instance] = await Promise.all(['handler_selector', 'instance_id'].map(async name =>
        (await dependencies.readField(resource, handle, name)).value));
      if (handler !== cid - 0x2E) reason = '场景调查入口与终端命令不一致';
      else entry = {handle, handler, instance, statusIndex: instance + (handler === 10 ? 16 : 0)};
    }
    if (entry) {
      const facilities = await dependencies.readDocument('project.facilities');
      const controllers = facilities.facilities?.find(row => row.id === 'computer-controller');
      control = controllers?.instances?.find(row => row.command_id === cid && row.instance_id === entry.instance)?.switch;
      if (cid === 0x37) {
        const target = control?.targets?.find(row => row.event_flag_reference === control.failure_flag_reference);
        if (target) {
          const [actors, scripts, story] = await Promise.all(['scene-actor', 'story-autonomous-script', 'project.story']
            .map(resource => dependencies.readDocument(resource)));
          const actor = actors.records?.find(row => row.uid === target.actor_reference);
          if (actor) {
            const document = await prepareStorySceneActions([actor], scripts, story, {
              getPackageDocument: path => dependencies.readPackageDocument(path),
            });
            const actions = storySceneActions(actor, document, story);
            const [clear, wait, battle, end] = actions;
            const flag = codes['controller-password-failure-flag'];
            if (actions.length === 4 && clear.operation === 'clear-event-flag' && clear.operands[0] === flag
                && wait.operation === 'wait-event-flag-set' && wait.operands[0] === flag
                && battle.operation === 'start-scripted-encounter' && end.command.opcode === 0)
              alarm = {actor: actor.uid, script: battle.handle, formationId: battle.operands[0],
                pendingEventFlag: battle.operands[1], targetStoryState: battle.operands[2],
                initialization: {commandBytes: [clear.command.opcode, clear.operands[0]], semantic: clear.semantic}};
          }
        }
      }
    }
  }
  const profile = layout.profiles?.[layout.selectors?.find(row => row.selector === selector)?.profile];
  const sceneExecution = cid === 0x37 ? await prepareDeviceSceneExecution(context, dependencies, alarm) : null;
  const adapter = deviceServiceExecution({command: model.command, graph: model.graph, text: dependencies.text, destinations,
    goods, prices, wager, weaponCapacities, codes, entry, targets, control, alarm, sceneExecution, reason, navigation: {catalog: interfaces.application_window_sources,
      selector, count, capacity: profile?.capacity, selectionLayout: layout, selectionMovement: movement}});
  return {adapter, session: new InterfacePreviewSession(adapter.initial({fields, context})), goods, destinations, codes};
}

function deviceServicePreview(model, selected, preview) {
  const snapshot = selected.path ? selected.session?.state : null;
  const node = model.graph.nodes.find(row => row.id === selected.node);
  if (node && !node.publishedPreview) return null;
  const result = structuredClone(node?.publishedPreview || preview);
  if (!result || snapshot?.execution.status === 'returned') return null;
  if (!snapshot) return result;
  const frame = snapshot.view.deviceFrame;
  return {...result, ...(frame ? {device_frame: frame} : {}),
    runtime_context: {...result.runtime_context, save_slot: snapshot.context.slot,
    facility_instance: snapshot.context.service?.argument ?? 0, choice_index: snapshot.execution.goods ?? snapshot.selections.choice,
    ...(frame?.kind === 'frog-race' ? {random_group: frame.group, winner_index: frame.completion?.winner} : {})},
    service_preview_state: {values: snapshot.fields, selection: snapshot.context,
      terminal: {passwordInput: snapshot.execution.password || '',
        passwordBuffer: snapshot.execution.passwordBuffer, passwordCursor: snapshot.execution.passwordCursor,
        lotteryResult: snapshot.domainResults.device?.won ? 'win' : 'lose'}, conditions: []}};
}

// @editor-module 状态画面按区域层次合成领域绘制结果。

async function paintInterfaceStateFrame(canvas, regions, {resolve, paint, read, decorate, isCurrent, background = null}) {
  const frame = canvas.ownerDocument.createElement('canvas');
  frame.width = canvas.width; frame.height = canvas.height;
  const context = frame.getContext('2d');
  context.fillStyle = '#000'; context.fillRect(0, 0, frame.width, frame.height);
  if (background) context.putImageData(new ImageData(background.data, background.width, background.height), 0, 0);
  const projected = await projectInterfaceRegions(regions, {resolve,
    paint: async source => {
      const surface = canvas.ownerDocument.createElement('canvas');
      await paint(surface, source);
      return surface;
    }, read, isCurrent,
    decorate: (region, details) => {
      const bounds = intersectInterfaceBounds(region.bounds, region.clip || region.bounds);
      if (region.visible && bounds) {
        const {x, y, width, height} = bounds;
        context.drawImage(details.surface, x, y, width, height, x, y, width, height);
      }
      return decorate ? decorate(region, details) : region;
    }});
  if (!projected || !isCurrent()) return null;
  canvas.getContext('2d').drawImage(frame, 0, 0);
  return projected;
}

export { deviceServicePreview, fieldMenuCurrentInvestigationPreview, fieldMenuIconNodes, fieldMenuInteractionPreview, fieldMenuLoadoutSelection, fieldMenuRolePreview, fieldMenuVehiclePreview, interfaceStateTree, paintFieldMenuIcons, paintInterfaceStateFrame, shopConfigurationPicker, startDeviceServiceExecution, startupLoadNodes };
