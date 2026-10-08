// @editor-module 机器领域快照只从当前字段取得输入并投影现有构造。
import {machineServiceExecution} from './machine-service-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {genericShopPreview} from './generic-shop-frames.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {startDeviceServiceExecution, deviceServicePreview} from './device-service-context.js';

export async function startMachineServiceExecution(model, context, dependencies) {
  if (model.graph.device) return startDeviceServiceExecution(model, context, dependencies);
  const cid = model.command.command_id;
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const codeNames = cid === 0x25 ? ['wanted-claim-scan-limit', 'wanted-claim-event-base',
    'wanted-intelligence-record-base', 'wanted-intelligence-text-region'] : [];
  const [raw, interfaces, layout, movement, growth, wanted, items, facility, story, hidden, codeFields] = await Promise.all([
    dependencies.readFields(), dependencies.readInterfaces(), dependencies.readDocument('selection-layout'),
    dependencies.readDocument('code-module'),
    cid === 0x35 ? dependencies.readDocument('character-growth') : null,
    cid === 0x25 ? dependencies.readDocument('wanted-record') : null,
    cid === 0x25 ? dependencies.readDocument('item-entry') : null,
    cid === 0x2D ? dependencies.readDocument('project.facilities') : null,
    cid === 0x2D ? dependencies.readDocument('project.story') : null,
    cid === 0x2D ? dependencies.readDocument('ui-facility:teleport-terminal:config:0C') : null,
    fieldSubmenuCodeValues(codeNames, read),
  ]);
  const codes = Object.fromEntries(codeNames.map(name => [name, fieldSubmenuCodeValue(codeFields, name)]));
  const destinations = facility?.facilities.find(row => row.id === 'teleport-terminal')?.configuration?.destinations || [];
  const routes = story?.browser_vm.opcode_semantics.find(row => row.operation === 'switch-scene-inside-story-state')?.routes;
  const selection = model.command.dialogue_flow.segments.flatMap(row => row.operations)
    .find(row => [0xD3, 0xD4].includes(row.opcode));
  const source = model.graph.nodes.find(row => row.pause.kind === 'menu')?.publishedPreview;
  const selectionHandle = source?.facility_screen?.selection_handle;
  const selector = selectionHandle
    ? (await dependencies.readField(source.facility_screen.resource_id, selectionHandle,
      cid === 0x2D ? 'value' : 'selector')).value
    : selection ? (await dependencies.readField(`application-command:${cid.toString(16).toUpperCase()}`,
      `application-command:${cid.toString(16).toUpperCase()}:selection-prompt:${selection.prg_offset}`, 'selector')).value : null;
  let goods = [];
  if (cid === 0x1A) {
    const configuration = await dependencies.readDocument('facility-config');
    const reference = configuration.families.find(row => row.id === 10)?.records
      .find(row => row.id === context.service?.argument);
    if (!reference) throw new TypeError('点唱机缺少所选配置');
    const count = (await dependencies.readField('facility-config', reference.record_id, 'payload_length')).value;
    goods = await Promise.all(Array.from({length: count}, async (_, index) =>
      (await dependencies.readField('facility-config', reference.record_id, `slot:${index}`)).value));
  }
  const adapter = machineServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    goods, destinations, routes, hidden, growth, wanted,
    numericCodes: items?.equipment_editor?.numeric_codes, codes,
    navigation: {catalog: interfaces.application_window_sources, selector,
      selectionLayout: layout, selectionMovement: movement}});
  const fields = Object.fromEntries(raw.all(`save.slot.${context.slot}.`).map(row => [row.fieldId, structuredClone(row.value)]));
  return {adapter, session: new InterfacePreviewSession(adapter.initial({fields, context})), goods, codes,
    destinations};
}

export function machineServicePreview(model, selected, fallback) {
  if (model.graph.device) return deviceServicePreview(model, selected, fallback);
  const execution = selected.path && selected.session?.state;
  if (execution?.execution?.status === 'returned')
    return execution.domainResults.windowRestore?.scene && model.command.command_id === 0x25
      ? {id: 'machine:return', layers: [], machine_return: true} : null;
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = node && genericShopPreview(node, model.command, model.previews)?.preview;
  if (node && !source && ['call', 'unreachable'].includes(node.pause.kind)) return null;
  let preview = structuredClone(source || fallback);
  if (!preview) return preview;
  if (model.command.command_id === 0x25 && preview.shop_menu?.wanted_information_actor)
    preview.runtime_context = {...preview.runtime_context,
      wanted_information_target: selected.context.service?.command === 0x25 ? selected.context.service.argument : 0};
  if (!execution) return preview;
  const e = execution.execution, context = execution.context, cid = model.command.command_id;
  const destination = cid === 0x2D && selected.destinations.filter(row =>
    execution.fields[`save.slot.${context.slot}.teleport_destination.${row.id}.unlocked`])[e.destination];
  preview.runtime_context = {...preview.runtime_context, save_slot: context.slot,
    facility_instance: context.service?.argument ?? 0, shop_instance: context.service?.argument ?? 0,
    choice_index: destination?.id ?? execution.selections.choice, wanted_id: context.wanted};
  preview.service_preview_state = {values: execution.fields, selection: context,
    terminal: {wantedId: context.wanted}, conditions: []};
  if (cid === 0x25 && preview.shop_menu) {
    delete preview.shop_menu.wanted_claim;
    if (execution.domainResults.intelligence) {
      preview.runtime_context.wanted_information_target = execution.domainResults.intelligence.target;
      preview.runtime_context.confirmed_waits = e.intelligencePause?.position || 0;
    }
    preview.layers = preview.layers.map(layer => layer.facility_parameter_bindings ? {...layer,
      facility_parameter_context: {...layer.facility_parameter_context, wantedId: context.wanted}} : layer);
  }
  return preview;
}
