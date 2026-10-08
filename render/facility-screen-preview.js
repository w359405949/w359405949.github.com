// @editor-module 设施整屏由应用命令、配置与当前存档字段构造。
import {servicePreviewFields, servicePreviewContext, servicePreviewTerminalState} from '../core/service-preview-state.js';
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue, fieldSubmenuCodeSource} from '../core/field-submenu-code-sources.js';
import {directMetaspriteFrame} from './metasprite.js';
import {selectionCursorCoordinates} from '../core/selection-layout-owner.js';
import {uiFacilityElevatorSceneBase} from '../core/ui-facility-block-owner.js';
import {fieldElevatorSceneRanges} from '../core/field-terrain-behavior.js';
import {terminalPreviewState} from '../core/terminal-preview-state.js';
import {applicationFlowTextHandle} from '../core/application-flow-text.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];
const record = (region, id) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(id).padStart(3, '0')}`;

export async function resolveFacilityScreenPreview(preview, {readCodeField} = {}) {
  const source = preview.facility_screen;
  if (!source) return preview;
  if (['controller', 'elevator', 'vending'].includes(source.kind))
    preview = {...preview, interface_preview_fullscreen: true};
  const slot = servicePreviewContext(preview, interfacePreviewContext()).slot;
  const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
  if (!fields.slotStatus(slot).valid) throw new TypeError('设施整屏缺少有效的当前存档槽');
  if (source.kind === 'save-slot') return resolveSaveSlot(preview, slot, readCodeField);
  if (source.kind === 'teleport') return resolveTeleportScreen(preview, source, fields, slot, readCodeField);
  if (source.kind === 'frog-wager') return resolveFrogWager(preview, source, slot, readCodeField);
  if (source.kind === 'frog-race') return resolveFrogRace(preview, source, slot, readCodeField);
  if (source.kind === 'donation-amount') return resolveDonationAmount(preview, slot, readCodeField);
  if (source.kind === 'storage-withdraw') {
    const values = await fieldSubmenuCodeValues(['storage-withdraw-frame', 'storage-withdraw-selector',
      'storage-condition-record-base'], readCodeField);
    return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
      field_overview: {...preview.field_overview,
        condition_base: fieldSubmenuCodeValue(values, 'storage-condition-record-base')},
      selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
        selector: fieldSubmenuCodeValue(values, 'storage-withdraw-selector')},
      layers: preview.layers.map(layer => layer.storage_frame ? {...layer,
        record: record(3, fieldSubmenuCodeValue(values, 'storage-withdraw-frame'))} : layer)};
  }
  if (source.kind === 'controller') return resolveControllerScreen(preview, source, slot, readCodeField);
  if (source.kind === 'elevator') return resolveElevatorScreen(preview, source, fields, slot, readCodeField);
  const selector = (await db.getField(source.resource_id, source.selection_handle, 'selector')).value;
  const count = (await db.getField(source.resource_id, source.selection_handle, 'count')).value;
  let result = {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector}};
  if (source.kind === 'vending') return resolveVendingScreen(result, source, slot, count, readCodeField);
  if (source.kind === 'experience') {
    const names = ['experience-row-record', ...ROLES.map((_, index) => `experience-row-origin-${index}`)];
    const values = await fieldSubmenuCodeValues(names, readCodeField);
    const title = (await db.getField(source.resource_id, source.title_handle, 'record_id')).value;
    if (count !== 12) throw new TypeError('经验查询退出选择域缺少当前代码来源');
    result.layers = preview.layers.flatMap(layer => {
      if (layer.facility_experience_title) return {...layer, record: record(2, title)};
      if (!layer.facility_experience_rows) return layer;
      return [...ROLES.keys()].reverse().flatMap(index =>
        fields.object(`save.slot.${slot}.role.${ROLES[index]}.present`).value
          ? [{...layer, record: record(2, fieldSubmenuCodeValue(values, 'experience-row-record')),
            cursor: fieldSubmenuCodeValue(values, `experience-row-origin-${index}`),
            experience_role_index: index}] : []);
    });
    result.interface_value_context = {pageId: 'experience-information-terminal', slot, actor: 'save-role:0'};
    return result;
  }
  if (source.kind !== 'jukebox') throw new TypeError('设施整屏构造种类未确认');
  const instance = preview.runtime_context?.facility_instance ?? 0;
  const configuration = await db.getResourceDocument('facility-config');
  const reference = configuration.families.find(row => row.id === 10)?.records.find(row => row.id === instance);
  if (!reference) throw new TypeError('点唱机缺少当前配置实例');
  const configuredTracks = preview.live_configuration?.values;
  const length = configuredTracks?.length
    ?? (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
  if (!Number.isInteger(length) || length < 1 || length > 4 || count !== 8)
    throw new TypeError('点唱机曲目超出已确认的配置与选择域');
  const index = preview.runtime_context?.choice_index ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= length)
    throw new TypeError('点唱机光标超出当前曲目列表');
  const tracks = configuredTracks ?? await Promise.all(Array.from({length}, async (_, index) =>
    (await db.getField('facility-config', reference.record_id, `slot:${index}`)).value));
  const values = await fieldSubmenuCodeValues(['jukebox-text-origin', 'menu-text-origin-low',
    'menu-text-origin-high', 'service-list-row-step', 'field-ui-palette-background',
    'field-ui-palette-foreground', 'field-ui-palette-light', 'field-ui-palette-dark'], readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const scene = fields.object(`save.slot.${slot}.scene_id`).value;
  const handle = `scene:${scene.toString(16).toUpperCase().padStart(2, '0')}`;
  const palettes = await db.getResourceDocument(preview.background_palette_source.resource_id);
  const matches = palettes.records.filter(row => row.scene_references?.includes(handle));
  if (matches.length !== 1 || matches[0].background_palette_source?.length !== 9)
    throw new TypeError('点唱机背景缺少当前场景的调色板字段');
  const colors = matches[0].background_palette_source;
  const background = [0, 3, 6].map(start => [read('field-ui-palette-background'), ...colors.slice(start, start + 3)]);
  background.push(['background', 'foreground', 'light', 'dark'].map(name => read('field-ui-palette-' + name)));
  const sourcePalettes = await db.getResourceDocument('sprite-palette');
  const sprites = (await db.getResourceDocument(preview.sprite_palette_source.resource_id))
    [preview.sprite_palette_source.field].map(row => [...row.colors]);
  for (const row of source.palette_copies) {
    const colors = sourcePalettes.records.find(value => value.handle === row.record)?.fields.nontransparent_colors;
    if (colors?.length !== 3) throw new TypeError('点唱机调色板复制缺少所属记录');
    (row.kind === 'sprite' ? sprites : background)[row.index]
      = [read('field-ui-palette-background'), ...colors];
  }
  const origin = read('jukebox-text-origin') + read('menu-text-origin-low')
    + (read('menu-text-origin-high') - 0x60) * 256;
  const template = preview.layers.find(layer => layer.kind === 'rom_nametable');
  const bytes = template?.raw_hex?.trim().split(/\s+/u).map(value => Number.parseInt(value, 16));
  if (bytes?.length !== 1024) throw new TypeError('点唱机选色缺少 ROM 模板属性表');
  const column = origin & 31;
  const glyphColors = Array.from({length: 30}, (_, row) => {
    const attribute = bytes[0x3C0 + (row >> 2) * 8 + (column >> 2)];
    const palette = (attribute >> (((row & 2) << 1) | (column & 2))) & 3;
    return {first_y: row * 8, last_y: row * 8 + 7, colour: background[palette][1]};
  });
  result = {...result, background_palette_source: null, background_palettes: background,
    sprite_palette_source: null, sprite_palettes: sprites,
    layers: preview.layers.map(layer => layer.kind === 'rom_nametable'
      ? {...layer, palette_sets: background} : layer)};
  result.layers.push(...tracks.map((id, index) => ({kind: 'script', record: record(13, id),
    cursor: origin + index * read('service-list-row-step'), glyph_pixel_y_offset: -4,
    background_palette: background[3], glyph_colour_rows: glyphColors})));
  return result;
}

async function resolveSaveSlot(preview, slot, readCodeField) {
  const values = await fieldSubmenuCodeValues(['save-slot-record', 'save-slot-selector'], readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
      selector: read('save-slot-selector')},
    layers: preview.layers.filter(layer => layer.kind !== 'generic_metasprite').map(layer =>
      layer.save_slot_names ? {...layer, record: record(2, read('save-slot-record'))} : layer)};
}

async function resolveElevatorScreen(preview, source, fields, slot, readCodeField) {
  const [configuration, facilities, terrain, parameters] = await Promise.all([
    db.getResourceDocument('facility-config'), db.getResourceDocument('ui-facility'),
    db.getResourceDocument('field-terrain-behavior-service'),
    fieldSubmenuCodeValues(['elevator-list-origin', 'elevator-row-record', 'elevator-row-step'], readCodeField),
  ]);
  const scene = preview.facility_call_context?.sceneId ?? fields.object(`save.slot.${slot}.scene_id`).value;
  const instance = preview.runtime_context?.facility_instance
    ?? fieldElevatorSceneRanges(terrain).findIndex(([lower, upper]) => lower <= scene && scene < upper);
  if (instance < 0) throw new TypeError('当前场景没有电梯实例');
  const reference = configuration.families.find(row => row.id === 15)?.records.find(row => row.id === instance);
  if (!reference) throw new TypeError('电梯缺少当前楼层配置');
  const count = (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
  const selection = preview.runtime_context?.choice_index
    ?? (preview.runtime_context?.facility_instance !== undefined && preview.facility_call_context?.sceneId === undefined
      ? 0 : ((uiFacilityElevatorSceneBase(facilities, instance) - scene) & 255));
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(selection) || selection < 0 || selection >= count)
    throw new TypeError('电梯楼层或当前选择超出配置');
  const values = await Promise.all(Array.from({length: count}, async (_, index) =>
    (await db.getField('facility-config', reference.record_id, `slot:${index}`)).value));
  const frame = (await db.getField(source.resource_id, source.frame_handle, 'record_id')).value;
  const selector = (await db.getField(source.resource_id, source.selection_handle, 'selector')).value;
  const selectionCount = (await db.getField(source.resource_id, source.selection_handle, 'count')).value;
  if (count > selectionCount) throw new TypeError('电梯楼层超出当前选择域');
  const read = name => fieldSubmenuCodeValue(parameters, name);
  return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot,
    facility_instance: instance, choice_index: selection},
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector},
    layers: [...preview.layers.map(layer => layer.elevator_frame ? {...layer, record: record(3, frame)} : layer),
      ...values.reverse().map((value, index) => ({kind: 'script', record: record(2, read('elevator-row-record')),
        component_id: `elevator-floor:${index}`,
        cursor: read('elevator-list-origin') + index * read('elevator-row-step'),
        glyph_pixel_y_offset: -4, provider_constants: {10: value}}))]};
}

async function resolveControllerScreen(preview, source, slot, readCodeField) {
  const handler = (await db.getField(source.entry_resource, source.entry_handle, 'handler_selector')).value;
  if (![8, 9, 10].includes(handler)) throw new TypeError('控制室入口超出已确认的应用命令');
  if (source.expected_handler !== undefined && handler !== source.expected_handler)
    throw new TypeError('当前终端入口与预览命令不一致');
  const instance = (await db.getField(source.entry_resource, source.entry_handle, 'instance_id')).value;
  const statusIndex = instance + (handler === 10 ? 16 : 0);
  if (statusIndex < 0 || statusIndex > 22) throw new TypeError('控制室实例超出已确认的正文表');
  const values = await fieldSubmenuCodeValues(['controller-keyboard-record',
    `controller-status-record-${statusIndex}`, 'controller-status-fallback',
    ...(handler === 9 ? ['controller-password-length', 'controller-password-fill', 'controller-password-terminator',
      'controller-password-cursor-object', 'controller-password-cursor-x', 'controller-password-cursor-y',
      'controller-password-cursor-step', `controller-event-flag-${statusIndex}`,
      ...Array.from({length: 24}, (_, index) => `controller-password-byte-${index}`),
      ...Array.from({length: 4}, (_, index) => `controller-password-offset-${index}`)] : []),
    ...(source.password_feedback ? ['controller-password-success-record', 'controller-password-error-record', 'controller-password-clear-selector',
      'controller-password-clear-origin-low', 'controller-password-clear-origin-high',
      'controller-password-clear-width', 'controller-password-clear-rows'] : [])], readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const status = fieldSubmenuCodeValue(values, `controller-status-record-${statusIndex}`)
    || fieldSubmenuCodeValue(values, 'controller-status-fallback');
  const frame = (await db.getField(source.resource_id, source.frame_handle, 'record_id')).value;
  const selector = (await db.getField(source.resource_id, source.selection_handle, 'selector')).value;
  const count = (await db.getField(source.resource_id, source.selection_handle, 'count')).value;
  if (count !== 12) throw new TypeError('控制室选择域超出已确认的键盘布局');
  const terminal = handler === 9 ? servicePreviewTerminalState(preview, terminalPreviewState(preview)) : {};
  const input = terminal.passwordInput || '';
  const length = handler === 9 ? read('controller-password-length') : 0;
  const buffer = handler === 9 ? terminal.passwordBuffer || Array.from({length}, (_, index) => index < input.length
    ? Number(input[index]) : read('controller-password-fill')) : [];
  const password = handler === 9 ? buffer.concat(read('controller-password-terminator'))
    .map(value => value.toString(16).padStart(2, '0')).join(' ') : null;
  let success = source.password_feedback === 'success';
  if (source.password_feedback === 'compare') {
    const flag = read(`controller-event-flag-${statusIndex}`);
    if (flag < 0xA0 || flag > 0xA3) throw new TypeError('密码终端事件位超出已确认的密码表');
    const offset = read(`controller-password-offset-${flag - 0xA0}`);
    if (offset + length > 24) throw new TypeError('密码终端比较超出当前密码表');
    success = buffer.every((value, index) => value === read(`controller-password-byte-${offset + length - 1 - index}`));
  }
  const feedbackRecord = success ? 'controller-password-success-record' : 'controller-password-error-record';
  const feedbackLayers = [];
  if (source.password_feedback) {
    if (read('controller-password-clear-selector') !== 0x48)
      throw new TypeError('密码结果清窗超出已确认的矩形参数');
    const origin = (read('controller-password-clear-origin-low') | read('controller-password-clear-origin-high') << 8) - 0x6000;
    feedbackLayers.push({kind: 'tile_fill', x: origin % 32, y: (origin >> 5) - 1,
      width: read('controller-password-clear-width'), height: read('controller-password-clear-rows') + 1, tile: 255},
    {kind: 'script', record: record(3, read(feedbackRecord)), cursor: 0,
      glyph_pixel_y_offset: -4, literal_tile_pixel_y_offset: 0});
  }
  const caret = terminal.passwordCursor ?? Math.max(0, Math.min(length - 1, input.length) - (source.password_stage === '04' ? 1 : 0));
  return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot, facility_instance: instance},
    ...(source.password_feedback ? {terminal_password_result: success ? 'success' : 'failure'} : {}),
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector},
    layers: preview.layers.map(layer => layer.controller_frame ? {...layer, record: record(3, frame)}
      : layer.controller_keyboard ? {...layer, record: record(2, fieldSubmenuCodeValue(values, 'controller-keyboard-record'))}
      : layer.controller_status ? {...layer, record: record(2, status),
        ...(password ? {provider_script_hex: {7: password}, glyph_pixel_y_offset: -4} : {})}
      : layer).concat(feedbackLayers, password && !source.password_feedback ? [{kind: 'generic_metasprite',
        object_id: read('controller-password-cursor-object'),
        anchor_x: read('controller-password-cursor-x') + caret * read('controller-password-cursor-step'),
        anchor_y: read('controller-password-cursor-y'), oam_y_bias: 1,
        pattern_profiles: ['sprite-chr:27-40-7F']}] : [])};
}

async function resolveFrogWager(preview, source, slot, readCodeField) {
  const values = await fieldSubmenuCodeValues(['frog-initial-round', 'vending-gold-record',
    'vending-gold-origin-low', 'vending-gold-origin-high', 'vending-body-origin',
    'menu-text-origin-low', 'menu-text-origin-high', 'field-ui-palette-background'], readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const instance = preview.runtime_context?.facility_instance ?? 0;
  const resource = `ui-facility:frog-race:config:${instance.toString(16).toUpperCase().padStart(2, '0')}`;
  const price = (await db.getField(resource, resource, 'price')).value;
  const body = (await db.getField(source.resource_id, source.body_handle, 'record_id')).value;
  const region = (await db.getField(source.resource_id, source.body_handle, 'region_id')).value;
  const paletteDocument = await db.getResourceDocument('sprite-palette');
  const palettes = preview.background_palette_source.records.map(handle => {
    const colors = paletteDocument.records.find(row => row.handle === handle)?.fields.nontransparent_colors;
    if (colors?.length !== 3) throw new TypeError('赛跑下注调色板缺少所属记录');
    return [read('field-ui-palette-background'), ...colors];
  });
  const origin = read('vending-body-origin') + read('menu-text-origin-low')
    + (read('menu-text-origin-high') - 0x60) * 256;
  return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
    layers: [...preview.layers.map(layer => layer.kind === 'rom_nametable' ? {...layer, palette_sets: palettes} : layer),
      {kind: 'script', record: record(2, read('vending-gold-record')),
        cursor: read('vending-gold-origin-low') | read('vending-gold-origin-high') << 8,
        glyph_pixel_y_offset: -4, background_palette: palettes[3], provider_save_values: {6: `save.slot.${slot}.gold`}},
      {kind: 'script', record: 'record:0C:000', cursor: origin, glyph_pixel_y_offset: -4, background_palette: palettes[3]},
      {kind: 'script', record: record(region, body), cursor: origin + 2, line_origin: (origin + 2) & 31,
        glyph_pixel_y_offset: -4, background_palette: palettes[3], inline_confirm: true,
        provider_constants: {57: read('frog-initial-round') + 1, 223: price}}]};
}

async function resolveFrogRace(preview, source, slot, readCodeField) {
  const names = ['frog-row-origin', 'frog-row-record', 'frog-name-base', 'frog-initial-x',
    ...Array.from({length: 12}, (_, index) => `frog-type-${index}`),
    ...Array.from({length: 12}, (_, index) => `frog-odds-${index}`),
    ...Array.from({length: 3}, (_, index) => `frog-row-y-${index}`),
    ...Array.from({length: 4}, (_, index) => `frog-idle-frame-${index}`),
    'menu-text-origin-low', 'menu-text-origin-high'];
  const values = await fieldSubmenuCodeValues(names, readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const base = await resolveFrogWager(preview, source, slot, readCodeField);
  const phase = source.phase;
  const origin = read('menu-text-origin-low') + (read('menu-text-origin-high') - 0x60) * 256;
  const group = Number(preview.runtime_context?.random_group ?? 0);
  if (!Number.isInteger(group) || group < 0 || group > 3)
    throw new TypeError('赛跑名义阵容超出 ROM 的四组随机配置');
  const racers = Array.from({length: 3}, (_, index) => ({
    type: read(`frog-type-${group * 3 + 2 - index}`),
    odds: read(`frog-odds-${group * 3 + 2 - index}`),
  }));
  if (racers.some(row => row.type > 3)) throw new TypeError('赛跑身份超出已确认的四个动画提供器');
  const device = preview.device_frame?.kind === 'frog-race' ? preview.device_frame : null;
  const spriteBank = device ? (fieldSubmenuCodeValue(await fieldSubmenuCodeValues(
    ['frog-sprite-chr-bank'], readCodeField), 'frog-sprite-chr-bank') & 0xFE) + 1 : null;
  const spriteAvailable = !device || (await db.getDocument('shared-chr-bank', null))
    .banks.some(bank => bank.id === spriteBank);
  const winner = device?.completion?.confirmed ? device.completion.winner : phase === 'win' ? Number(preview.runtime_context?.choice_index ?? 0)
    : Number(preview.runtime_context?.winner_index ?? 2);
  if (!Number.isInteger(winner) || winner < 0 || winner >= racers.length)
    throw new TypeError('赛跑结果缺少名义胜者');
  const body = base.layers.at(-1);
  const price = body.provider_constants[223];
  const layers = base.layers.map(layer => layer !== body ? layer : {...layer,
    dialogue_runtime: true, inline_confirm: false,
    runtime_record_pair: record(13, read('frog-name-base') + racers[winner].type),
    provider_constants: {...layer.provider_constants, 223: price * racers[winner].odds}});
  if (['select', 'race'].includes(phase)) {
    layers.push(...racers.map((racer, index) => ({kind: 'script', record: record(2, read('frog-row-record')),
      cursor: origin + read('frog-row-origin') + index * 64, glyph_pixel_y_offset: -4,
      background_palette: body.background_palette,
      provider_constants: {56: index + 1, 15: racer.odds},
      provider_records: {10: record(13, read('frog-name-base') + racer.type)}})));
  }
  if (phase !== 'insufficient' && spriteAvailable) {
    for (const [index, racer] of racers.entries()) {
      const current = device?.racers[index];
      const frame = await directMetaspriteFrame(current?.object ?? read(`frog-idle-frame-${racer.type}`));
      layers.push({kind: 'rom_oam', sprites: frame.sprites.filter(sprite => !sprite.transparentTile),
        anchor_x: current?.x ?? read('frog-initial-x'), anchor_y: current?.y ?? read(`frog-row-y-${index}`), oam_y_bias: 1,
        ...(device ? {sprite_pattern_source: {...fieldSubmenuCodeSource('frog-sprite-chr-bank'),
          first_tile: 0x40, last_tile: 0x7F}} : {}),
        pattern_profiles: ['sprite-chr:26-00-3F', 'sprite-chr:27-40-7F',
          'sprite-chr:26-80-BF', 'sprite-chr:27-C0-FF']});
    }
  }
  return {...base, layers, ...(!spriteAvailable ? {facility_preview_gaps: [
    ...(base.facility_preview_gaps || []), {kind: 'device-sprite', reason: '赛跑动作图案未确认'}]} : {}),
    selection_cursor: ['select', 'race'].includes(phase) && !(device?.frame > 0)
    ? {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector: 0x16} : null};
}

async function resolveDonationAmount(preview, slot, readCodeField) {
  const values = await fieldSubmenuCodeValues(['quantity-number-record', 'quantity-selector',
    'quantity-origin', 'menu-text-origin-low', 'menu-text-origin-high'], readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const title = (await db.getField('application-command:2A',
    'application-command:2A:quantity-title:203404', 'record_id')).value;
  const amount = Number(preview.runtime_context?.quantity_value ?? 0);
  if (!Number.isInteger(amount) || amount < 0 || amount > 9999999)
    throw new TypeError('捐款输入超出 ROM 的七位十进制选择域');
  const digits = String(amount).padStart(7, '0').split('').map(Number);
  const cursor = read('quantity-origin') + read('menu-text-origin-low')
    + (read('menu-text-origin-high') - 0x60) * 256;
  return {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
      selector: read('quantity-selector'), object_id: 0x0D},
    layers: [...preview.layers, {kind: 'script', record: record(2, read('quantity-number-record')),
      cursor, line_origin: cursor & 31, glyph_pixel_y_offset: -4, dialogue_runtime: true,
      runtime_record_pair: record(2, title), glyph_cache_inline_state: true,
      provider_constants: Object.fromEntries([29, 30, 31, 60, 32, 33, 34].map((id, index) => [id, digits[index]])),
      provider_save_values: {6: `save.slot.${slot}.gold`}}]};
}

async function resolveTeleportScreen(preview, source, fields, slot, readCodeField) {
  const names = ['teleport-list-origin', 'teleport-list-first-flag',
    'teleport-list-record-region', 'teleport-list-end-flag', 'shop-text-region'];
  const values = await fieldSubmenuCodeValues(names, readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const first = read('teleport-list-first-flag'), end = read('teleport-list-end-flag');
  if (first !== 0x30 || end - first !== 12) throw new TypeError('传送列表超出已发布的开放字段');
  const frame = (await db.getField(source.resource_id, source.frame_handle, 'value')).value;
  const selector = (await db.getField(source.resource_id, source.selection_handle, 'value')).value;
  const body = (await db.getField(source.resource_id, source.body_handle, 'record_id')).value;
  const list = [{kind: 'layout', record: record(2, frame)}];
  const configuration = preview.live_configuration;
  let cursor = read('teleport-list-origin');
  for (let index = 0; index < end - first; index++) {
    const active = configuration?.active_destination_ids
      ? configuration.active_destination_ids.includes(index)
      : fields.object(`save.slot.${slot}.teleport_destination.${index}.unlocked`).value;
    const destination = configuration?.destinations?.find(row => Number(row.id) === index);
    if (configuration?.destinations && !destination?.text_record)
      throw new TypeError('传送终端缺少当前目的地文字');
    if (active)
      list.push({kind: 'script', record: destination?.text_record
        ?? record(read('teleport-list-record-region'), first + index),
        cursor, glyph_pixel_y_offset: -4});
    if (index < end - first - 1) cursor += (await db.getField('ui-facility:teleport-terminal',
      'ui-facility:teleport-terminal', `cursor_step_${index.toString(16).toUpperCase().padStart(2, '0')}`)).value;
  }
  return {...preview, selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector},
    runtime_context: {...preview.runtime_context, save_slot: slot},
    layers: [...preview.layers.map(layer => layer.teleport_body
      ? {...layer, record: configuration?.dialogue_record ?? record(read('shop-text-region'), body),
        ...(configuration ? {page_index: configuration.dialogue_page_index} : {})} : layer), ...list]};
}

async function resolveVendingScreen(preview, source, slot, count, readCodeField) {
  const instance = preview.runtime_context?.facility_instance ?? 0;
  const configuration = await db.getResourceDocument('facility-config');
  const family = source.configuration_family
    ?? Number.parseInt(source.resource_id?.split(':')[1], 16) - 0x10;
  const reference = configuration.families.find(row => row.id === family)?.records.find(row => row.id === instance);
  if (!reference || count !== 6) throw new TypeError('售货机缺少已确认的六件商品配置');
  const values = preview.live_configuration?.values ?? await Promise.all(Array.from({length: 12}, async (_, index) =>
    (await db.getField('facility-config', reference.record_id, `slot:${index}`)).value));
  if (values.length < 12 || values.slice(0, 12).some(value => !Number.isInteger(value) || value < 0 || value > 255))
    throw new TypeError('售货机缺少当前商品与数量字段');
  const lottery = preview.terminal_response?.lottery;
  const device = preview.device_frame?.kind === 'vending-lottery' ? preview.device_frame : null;
  const lotterySelection = lottery ? servicePreviewTerminalState(preview, terminalPreviewState(preview)) : null;
  const lotteryWon = lotterySelection?.lotteryResult === 'win';
  const party = lottery ? lotteryWon && lottery.stage === 1 ? 'characters' : null : preview.terminal_response?.party;
  const names = [...Array.from({length: 6}, (_, index) => `vending-row-origin-${index}`),
    ...Array.from({length: 0x45}, (_, index) => `vending-icon-threshold-${index}`),
    'vending-icon-x-bias', 'vending-row-record', 'vending-shell-overflow-price-code',
    'vending-text-region',
    'vending-gold-record', 'vending-gold-origin-low', 'vending-gold-origin-high',
    'vending-body-origin', 'menu-text-origin-low', 'menu-text-origin-high', 'field-ui-palette-background',
    ...(party ? ['vending-party-selector', 'vending-party-name-origin',
      'shop-actor-name-record', 'shop-vehicle-name-record'] : []),
    ...(preview.terminal_response?.inventory_check ? ['vending-role-inventory-capacity'] : []),
    ...(lottery || device ? ['vending-lottery-ball-object', 'vending-lottery-win-x', 'vending-role-inventory-capacity',
      ...Array.from({length: 16}, (_, index) => `vending-lottery-x-${index}`),
      ...Array.from({length: 16}, (_, index) => `vending-lottery-y-${index}`)] : [])];
  if (preview.terminal_response?.shell_check) names.push('vending-shell-type-capacity',
    'vending-loaded-weapon-item-limit', 'vending-loaded-weapon-count-mask');
  const parameters = await fieldSubmenuCodeValues(names, readCodeField);
  const read = name => fieldSubmenuCodeValue(parameters, name);
  const paletteDocument = await db.getResourceDocument('sprite-palette');
  const palettes = preview.background_palette_source.records.map(handle => {
    const colors = paletteDocument.records.find(row => row.handle === handle)?.fields.nontransparent_colors;
    if (colors?.length !== 3) throw new TypeError('售货机调色板复制缺少所属记录');
    return [read('field-ui-palette-background'), ...colors];
  });
  const layers = preview.layers.map(layer => layer.kind === 'rom_nametable' ? {...layer, palette_sets: palettes} : layer);
  const template = preview.layers.find(layer => layer.kind === 'rom_nametable');
  const numericCodes = values.slice(0, 6).some(value => value < 15)
    ? (await db.getResourceDocument('item-entry')).equipment_editor.numeric_codes : null;
  const costs = [];
  for (const index of [...Array(6).keys()].reverse()) {
    const id = values[index], amount = family === 13 ? values[index + 6] : values[index + 6] & 127;
    const handle = `${id < 14 ? 'shell' : 'item'}:${id.toString(16).toUpperCase().padStart(2, '0')}`;
    let price;
    if (id < 14) {
      const code = (await db.getField('shell-record', handle, 'price.raw_code')).value;
      price = numericCodes.find(row => row.raw_code === code);
    } else if (id === 14) {
      price = numericCodes.find(row => row.raw_code === read('vending-shell-overflow-price-code'));
    } else price = (await db.get(handle, null))?.price;
    if (!price?.available || !Number.isSafeInteger(price.value))
      throw new TypeError('售货机缺少当前商品价格码');
    costs[index] = (price.value & 255) * amount;
    layers.push({kind: 'script', record: record(2, read('vending-row-record')),
      cursor: read(`vending-row-origin-${index}`), glyph_pixel_y_offset: -4,
      pattern_profiles: template.pattern_profiles,
      background_palette: palettes[0],
      provider_records: {10: record(id < 15 ? 13 : 0, id)}, provider_script_hex: {15: '9F'},
      provider_constants: {56: amount, 11: (price.value & 255) * amount}});
  }
  layers.push({kind: 'script', record: record(2, read('vending-gold-record')),
    cursor: read('vending-gold-origin-low') | read('vending-gold-origin-high') << 8,
    glyph_pixel_y_offset: -4, background_palette: palettes[3], provider_save_values: {6: `save.slot.${slot}.gold`}});
  let bodyHandle = source.body_handle;
  let prize = null;
  if (lottery) {
    const payloadLength = (await db.getField('facility-config', reference.record_id, 'payload_length')).value;
    const configurationPrize = payloadLength > 12
      ? (await db.getField('facility-config', reference.record_id, 'slot:12')).value : null;
    prize = lotterySelection.lotteryPrize ?? configurationPrize;
    if (lotteryWon && !Number.isInteger(prize)) throw new TypeError('当前售货机配置没有抽奖奖品');
    bodyHandle = lottery.body_handles[!lotteryWon ? 'goods' : lottery.stage === 0 ? 'won'
      : lottery.stage === 1 ? 'recipient' : lottery.stage === 2 ? 'goods' : lottery.stage === 3 ? 'capacity' : 'cancel'];
    if (lotteryWon && lottery.stage === 2) {
      const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
      const role = ROLES[servicePreviewContext(preview, interfacePreviewContext()).role];
      const inventory = fields.object(`save.slot.${slot}.role.${role}.inventory`).value;
      const used = inventory.indexOf(0);
      if ((used < 0 ? inventory.length : used) >= read('vending-role-inventory-capacity'))
        bodyHandle = lottery.body_handles.capacity;
    }
    const position = device?.position ?? Array.from({length: 16}, (_, index) => index)
      .find(index => (read(`vending-lottery-x-${index}`) === read('vending-lottery-win-x')) === lotteryWon);
    if (position === undefined) throw new TypeError('当前抽奖位置表缺少所选结果');
    const ball = await directMetaspriteFrame(read('vending-lottery-ball-object') + Number(lotteryWon));
    layers.push({kind: 'rom_oam', sprites: ball.sprites.filter(sprite => !sprite.transparentTile),
      anchor_x: read(`vending-lottery-x-${position}`), anchor_y: read(`vending-lottery-y-${position}`), oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:26-00-3F', 'sprite-chr:27-40-7F',
        'sprite-chr:26-80-BF', 'sprite-chr:27-C0-FF']});
  }
  if (device && !lottery && Number.isInteger(device.object)) {
    const ball = await directMetaspriteFrame(device.object);
    layers.push({kind: 'rom_oam', sprites: ball.sprites.filter(sprite => !sprite.transparentTile),
      anchor_x: device.x, anchor_y: device.y, oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:26-00-3F', 'sprite-chr:27-40-7F',
        'sprite-chr:26-80-BF', 'sprite-chr:27-C0-FF']});
  }
  if (preview.terminal_response?.inventory_check) {
    const role = ['hunter', 'mechanic', 'soldier'][servicePreviewContext(preview, interfacePreviewContext()).role];
    const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
    if (!role || !fields.object(`save.slot.${slot}.role.${role}.present`).value)
      throw new TypeError('售货机容量判断缺少当前队伍人物');
    const inventory = fields.object(`save.slot.${slot}.role.${role}.inventory`).value;
    const capacity = read('vending-role-inventory-capacity');
    const used = inventory.indexOf(0);
    const quantity = values[6 + (preview.runtime_context?.choice_index ?? 0)] & 127;
    const command = await db.getResourceDocument(source.resource_id);
    bodyHandle = applicationFlowTextHandle(command, preview.terminal_response.source,
      branch => {
        if (branch?.opcode !== 0xEF) throw new TypeError('售货机容量分支未确认');
        return quantity > capacity - (used < 0 ? inventory.length : used) ? 1 : 0;
      });
  }
  if (preview.terminal_response?.shell_check)
    bodyHandle = await shellVendingResponseHandle(preview, slot, values, costs, read);
  const bodyField = async field => {
    const reference = {resource_id: source.resource_id, entity_handle: bodyHandle, field};
    return (await (readCodeField ? readCodeField(reference)
      : db.getField(reference.resource_id, reference.entity_handle, reference.field))).value;
  };
  const body = await bodyField('record_id');
  const bodyOrigin = read('vending-body-origin') + read('menu-text-origin-low')
    + (read('menu-text-origin-high') - 0x60) * 256;
  const bodyRegion = source.body_region_field
    ? await bodyField(source.body_region_field)
    : read('vending-text-region');
  layers.push({kind: 'script', record: 'record:0C:000', cursor: bodyOrigin,
    glyph_pixel_y_offset: -4, background_palette: palettes[3]});
  layers.push({kind: 'script', record: record(bodyRegion, body),
    cursor: bodyOrigin + 2, glyph_pixel_y_offset: -4, background_palette: palettes[3],
    ...(lotteryWon && prize !== null ? {provider_records: {10: record(0, prize)}} : {}),
    ...((lottery ? lotteryWon && bodyHandle !== lottery.body_handles.goods
      && bodyHandle !== lottery.body_handles.recipient : preview.terminal_response?.wait_marker)
      && device?.status !== 'running' ? {wait_marker: true, runtime_line_column: (bodyOrigin + 2) & 31} : {})});
  const layout = await db.getResourceDocument(preview.selection_cursor.resource_id);
  for (const index of [...Array(6).keys()].reverse()) {
    let frameId = 0x44;
    while (frameId >= 0 && values[index] < read(`vending-icon-threshold-${frameId}`)) frameId--;
    if (frameId < 0) throw new TypeError('售货机商品图形选择超出代码阈值表');
    const frame = await directMetaspriteFrame(frameId);
    const point = selectionCursorCoordinates(layout, preview.selection_cursor, index);
    layers.push({kind: 'rom_oam', sprites: frame.sprites.filter(sprite => !sprite.transparentTile),
      anchor_x: point.x + read('vending-icon-x-bias'),
      anchor_y: point.y, oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:26-00-3F', 'sprite-chr:27-40-7F',
        'sprite-chr:26-80-BF', 'sprite-chr:27-C0-FF']});
  }
  if (party) {
    layers.push({kind: 'window_clear', source: {preset: '02', resource_id: 'ui-tile-rectangle-service'}},
      {kind: 'script', record: record(2, read(party === 'characters' ? 'shop-actor-name-record' : 'shop-vehicle-name-record')),
        cursor: read('vending-party-name-origin') + read('menu-text-origin-low')
          + (read('menu-text-origin-high') - 0x60) * 256,
        glyph_pixel_y_offset: -4, save_party_names: party, background_palette: palettes[3]});
    const context = servicePreviewContext(preview, interfacePreviewContext());
    const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
    const row = party === 'characters' ? context.role
      : fields.object(`save.slot.${slot}.entity_scene_object_slots`).value.slice(0, 4).indexOf(context.vehicle);
    if (row < 0) throw new TypeError('售货机选择缺少当前队伍对象');
    return {...preview, layers, selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
      selector: read('vending-party-selector'), choice_index: row * 2}};
  }
  return {...preview, layers, ...(device?.status === 'running' || lotteryWon && [lottery.body_handles.capacity, lottery.body_handles.cancel]
    .includes(bodyHandle) ? {selection_cursor: null} : {})};
}

async function shellVendingResponseHandle(preview, slot, values, costs, read) {
  const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
  const vehicle = servicePreviewContext(preview, interfacePreviewContext()).vehicle;
  const prefix = `save.slot.${slot}.vehicle.${vehicle}`;
  const value = field => fields.object(`${prefix}.${field}`).value;
  const choice = preview.runtime_context?.choice_index ?? 0;
  if (!Number.isInteger(choice) || choice < 0 || choice >= costs.length)
    throw new TypeError('炮弹购买判断缺少当前商品选择');
  const quantity = values[choice + 6] & 127;
  const stage = preview.terminal_response.shell_check === '22'
    ? String((await db.getField('application-command:1C',
      'application-command:1C:choice-branches:204521', `target:${choice}`)).value).padStart(2, '0')
    : preview.terminal_response.shell_check;
  if (!['06', '07', '10', '11', '13'].includes(stage))
    throw new TypeError('炮弹商品分支超出已确认的购买判断');
  let available = true;
  if (stage === '06') {
    const used = Array.from({length: 6}, (_, index) => value(`shell_count.${index}`))
      .reduce((sum, count) => sum + count, 0) & 255;
    available = ((used + quantity) & 255) <= value('ammo_capacity');
  }
  if (available && ['06', '13'].includes(stage)) {
    const types = Array.from({length: 6}, (_, index) => value(`shell_type.${index}`));
    available = types.includes(values[choice]) || types.filter(type => type < 128).length < read('vending-shell-type-capacity');
  }
  if (stage === '10') {
    const weaponId = value('equipment.main_gun');
    available = value('equipped_mask_raw') >= 128 && weaponId < read('vending-loaded-weapon-item-limit');
    if (available) {
      const item = await db.get(`item:${weaponId.toString(16).toUpperCase().padStart(2, '0')}`, null);
      const codes = await db.getResourceDocument('shared-indexed-byte-overlays');
      if (!Number.isInteger(item?.equipment?.raw_flags)) throw new TypeError('售货机主炮缺少当前装备属性');
      const code = item.equipment.raw_flags & 7;
      const capacity = code === 7 ? codes.zero_prefixed_ascending_bit_masks[0] : codes.level_value_codebook[code];
      if (!Number.isInteger(capacity)) throw new TypeError('售货机主炮弹数缺少当前属性来源');
      available = (((value('equipment_state.main_gun') & read('vending-loaded-weapon-count-mask')) + quantity) & 255) <= capacity;
    }
  }
  const command = await db.getResourceDocument(preview.facility_screen.resource_id);
  const start = command.dialogue_flow?.segments?.find(row => row.index === Number(stage))?.id;
  return applicationFlowTextHandle(command, start, branch => {
    if (branch?.opcode === 0xD5) return available ? 1 : 0;
    if (branch?.opcode === 0xDC) return fields.object(`save.slot.${slot}.gold`).value < costs[choice] ? 1 : 0;
    throw new TypeError('炮弹售货机结果分支未确认');
  });
}
