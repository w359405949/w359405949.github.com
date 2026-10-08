// @editor-module 设备预览从字段对象取得入口、配置与选择布局。
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {sceneElevatorPoints, sceneElevatorDestinations} from '../core/scene-elevators.js';
import {deviceServiceExecution} from './device-service-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {FACILITY_DEVICE_CODE_NAMES} from '../core/facility-device-state.js';
import {prepareStorySceneActions, storySceneActions} from '../core/story-scene-actions.js';
import {prepareDeviceSceneExecution} from './device-scene-execution.js';

export async function startDeviceServiceExecution(model, context, dependencies) {
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

export function deviceServicePreview(model, selected, preview) {
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
