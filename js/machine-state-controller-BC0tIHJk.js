import { state } from './emulator-Bpa8EsFw.js';
import { fieldSubmenuCodeValues, fieldSubmenuCodeValue, MACHINE_SERVICE_COMMANDS, db } from './prg-loaders-DnCSmXk9.js';
import { interfacePreviewState, InterfacePreviewSession, showEditorError, bindTextInputEvents, esc, currentTextReference, renderModuleComponent, prepareModuleComponent } from './interface-state-preview-Dlotqlmn.js';
import { uiRecordComponentLabel, createInterfaceStateControllerWorkbench } from './story-component-labels-CSjCRgXX.js';
import './components-D0Rv67Tu.js';
import { bindScreenWorkbenchBottomResize, interfacePreviewContext, screenWorkbenchCanvasStage } from './element-tree-C1bWRgTl.js';
import { serviceInvocation } from './service-preview-scene-CPwiqon9.js';
import { playerTileFromSaveCamera, ensureSaveCurrentFieldObjects } from './physical-field-object-windows-DnQmS3eb.js';
import { interfaceApplicationExecution, MACHINE_SERVICE_EVIDENCE, genericShopPreview, machineServiceGraph } from './machine-service-model-B-6y5baD.js';
import { executeFacilityWindowRoutine } from './battle-result-state-machine-BbK2hSud.js';
import { SERVICE_ROLES, characterGrowthRequiredExperience, interfacePreviewSceneImage } from './ui-construction-preview-BuoQ5mM6.js';
import { deviceServicePreview, startDeviceServiceExecution } from './device-service-context-B5xDhK9J.js';
import { hydrateScenePositionPicker, scenePositionPickerMarkup } from './components-DbJXuRMn.js';
import { selectedGameUiWorkbenchNode, gameUiStateComponents, selectGameUiWorkbenchNode } from './game-ui-workbench-Dsg65sF-.js';
import { bindBattleSimulation, battleSimulationMarkup } from './battle-simulation-player-CgsqKnB3.js';
import { battleScenePreviewForFormation } from './battle-actors-Ci6buYr0.js';
import { prepareViewData, ensureBattleSceneData } from './overview-BWR5QCHz.js';

// @editor-module 机器输入只推进临时字段与已确认的领域引用。

function machineServiceExecution({command, graph, text, goods = [], destinations = [], routes = [], hidden, growth,
  wanted, numericCodes = [], codes, navigation}) {
  const cid = command.command_id;
  const application = interfaceApplicationExecution({command, graph, text, evidence: MACHINE_SERVICE_EVIDENCE,
    domain: ({block, branch}) => {
      const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
      const get = (state, suffix) => {
        const id = key(state, suffix);
        if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
        return state.fields[id];
      };
      const flag = target => `global_event_flag.${(codes['wanted-claim-event-base'] + target).toString(16).toUpperCase().padStart(2, '0')}`;
      const open = state => destinations.filter(row => get(state, `teleport_destination.${row.id}.unlocked`));
      const claim = (state, after = 0) => {
        const limit = codes['wanted-claim-scan-limit'];
        if (!Number.isInteger(limit) || limit < 2 || limit > 12 || !Number.isInteger(codes['wanted-claim-event-base'])
          || codes['wanted-claim-event-base'] + limit > 256)
          return block(state, '领赏扫描范围未确认');
        let defeated = false;
        for (let target = after + 1; target < limit; target++) {
          if (!get(state, `wanted_defeat_level_at_victory.${target}`)) continue;
          defeated = true;
          if (get(state, flag(target))) continue;
          state.execution.wanted = target;
          state.execution.event = flag(target);
          state.context.wanted = target;
          state.execution.choice = 2;
          return;
        }
        state.execution.choice = after ? 0 : defeated ? 1 : 0;
      };
      const options = state => state.pause.kind === 'choice' ? ['是', '否'] : state.pause.kind !== 'menu' ? []
        : cid === 0x1A ? goods.map(id => `曲目 ${id}`)
        : cid === 0x2D ? open(state).map(row => row.text_record)
        : cid === 0x25 ? ['听情报', '领奖金', '退出'] : [];
      const operate = (state, operation) => {
        const e = state.execution, op = operation.opcode;
        if ([0xC9, 0xCC, 0xCD, 0xD3, 0xD4].includes(op)) return;
        if (op === 0xC8) {e.choice = 0; return;}
        if (op === 0xB0 && cid === 0x25) {
          const raw = wanted.bounty_codes.find(row => row.wanted_id === e.wanted)?.raw_code;
          const amount = numericCodes.find(row => row.raw_code === raw && row.available)?.value;
          if (!Number.isInteger(amount) || amount < 0) return block(state, '当前赏金代码未确认');
          e.quote = amount; return;
        }
        if (op === 0xF2 && cid === 0x25) {
          const sum = (get(state, 'gold') + e.quote) & 0xFFFFFF;
          return branch(state, command.dialogue_flow.segments[state.control], sum <= 9999999 ? 0 : 1);
        }
        if (op === 0xAE && cid === 0x25) {
          if (!e.event || get(state, e.event) || !get(state, `wanted_defeat_level_at_victory.${e.wanted}`))
            return block(state, '当前目标不满足领赏条件');
          const amount = Math.min((get(state, 'gold') + e.quote) & 0xFFFFFF, 9999999);
          state.fields[key(state, 'gold')] = amount;
          const settings = get(state, 'adventure_data_settings');
          if (settings & 128 && amount >= get(state, 'gold_bell_threshold')) {
            state.fields[key(state, 'adventure_data_settings')] = settings & 127;
            state.domainResults.goldBell = {handle: 'audio-command:66', confirmed: true};
          }
          e.transactions.push({type: 'bounty', wanted: e.wanted, amount: e.quote, gold: amount});
          return;
        }
        if (op === 0xAF && cid === 0x25) {
          if (e.transactions.at(-1)?.wanted !== e.wanted) return block(state, '领取位缺少本次赏金提交');
          state.fields[key(state, e.event)] = 1; return;
        }
        if (op !== 0xD2) return block(state, `此机器原生效果 ${op.toString(16).toUpperCase()} 未确认`);
        const callback = operation.operands[0] | operation.operands[1] << 8;
        if (cid === 0x1A && callback === 0xAE92) return;
        if (cid === 0x1A && callback === 0xAEBB) {
          const id = goods[e.goods];
          if (!Number.isInteger(id)) return block(state, '所选曲目不在当前配置');
          state.domainResults.audio = {kind: 'audio-command', commandId: id, handle: `audio-command:${id.toString(16).toUpperCase().padStart(2, '0')}`,
            feedback: 'audio-command:58', confirmed: true};
          e.transactions.push({type: 'audio', command: id}); return;
        }
        if (cid === 0x35 && callback === 0xAE4D) return;
        if (cid === 0x35 && callback === 0xEEAA) {
          state.domainResults.experience = [...SERVICE_ROLES.keys()].reverse().flatMap(index => {
            const role = SERVICE_ROLES[index];
            if (!get(state, `role.${role}.present`)) return [];
            const level = get(state, `role.${role}.level`), experience = get(state, `role.${role}.experience`);
            return [{role, index, level, experience, required: characterGrowthRequiredExperience(growth, level, experience)}];
          });
          if (state.domainResults.experience.some(row => row.required === null || row.required === 0 && row.level < 99))
            block(state, '队员等级与经验须先完成升级；随机成长字段尚未接入');
          return;
        }
        if (cid === 0x2D && callback === 0xADD7) return;
        if (cid === 0x2D && callback === 0xF46E) {
          const destination = open(state)[e.destination];
          if (!destination) return block(state, '所选目的地未开放');
          state.domainResults.teleport = {destination: destination.id, selection: destination.id + 1,
            phase: 'selected', confirmed: true};
          e.branch = 1;
          return;
        }
        if (cid === 0x25 && [0xB105, 0xB10C].includes(callback)) return claim(state, callback === 0xB10C ? e.wanted : 0);
        if (cid === 0x25 && callback === 0xA17B) {
          state.domainResults.windowRefresh = {window: 'gold', gold: get(state, 'gold'), confirmed: true};
          return;
        }
        if (cid === 0x25 && callback === 0xEECE) {
          const target = state.context.service?.argument;
          if (!Number.isInteger(target) || target < 0 || target >= codes['wanted-claim-scan-limit'])
            return block(state, '事务所目标参数未确认');
          const defeated = Boolean(target && get(state, `wanted_defeat_level_at_victory.${target}`));
          const region = codes['wanted-intelligence-text-region'];
          if (!Number.isInteger(region) || !Number.isInteger(codes['wanted-intelligence-record-base']))
            return block(state, '通缉情报的文字区与记录基数未确认');
          const record = (codes['wanted-intelligence-record-base'] + (defeated ? 255 : target)) & 255;
          const handle = `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`;
          const body = text.records[handle];
          if (!body) return block(state, '通缉情报缺少当前文字记录');
          const waits = body.protected_ranges.filter(token =>
            ['wait-for-confirm-marker', 'page-break-or-repeat-end'].includes(token.semantic));
          state.domainResults.intelligence = {target, defeated, record: handle, confirmed: true};
          state.context.wanted = target; state.node = 'machine:intelligence';
          e.intelligencePause = {position: 0, count: waits.length + 1};
          if (waits.length) state.returnStack.push({caller: 'application', control: state.control, position: e.position});
          else state.domainResults.intelligence.nativeReturned = true;
          state.pause = {kind: 'wait', evidence: MACHINE_SERVICE_EVIDENCE};
          state.windows = [{id: 'machine', node: state.node}];
          e.status = 'waiting';
          return;
        }
        block(state, '此机器回调的传递效果未确认');
      };
      return {operate, options, initial: {goods: 0, destination: 0},
        fallthrough: (state, segment) => segment.terminator?.reason === 'application-vm-indexed-segment-table-end'
          ? state.execution.choice : 0,
        acceptEmptyMenu: () => cid === 0x35,
        pauseNode: (state, event) => graph.nodes.find(node => node.segment?.index === state.control && node.pause.ordinal === event.ordinal),
        preparePause(state) {
          state.selections.choice = state.pause.kind === 'choice' ? 0 : cid === 0x1A ? state.execution.goods
            : cid === 0x2D ? state.execution.destination : 0;
          state.windows = [{id: 'machine', node: state.node, choice: state.selections.choice}];
        },
        select(state, index) {
          if (state.pause.kind !== 'menu') return;
          if (cid === 0x1A) state.execution.goods = index;
          if (cid === 0x2D) state.execution.destination = index;
        },
        directionChoice(state, direction, count) {
          if (state.pause.kind === 'choice') return direction < 3 ? state.selections.choice : direction - 3;
          const positions = cid === 0x2D ? open(state).map(row => row.id) : Array.from({length: count}, (_, index) => index);
          let old = positions[state.selections.choice], next = old;
          for (let step = 0; step < 12; step++) {
            const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
              selector: navigation.selector, selection_index: next,
              selection_count: cid === 0x2D ? destinations.length : count, direction_index: direction}, navigation);
            if (result.status !== 'available') {block(state, '此机器的方向输入未确认'); return state.selections.choice;}
            if (next === result.state.selection_index) return state.selections.choice;
            next = result.state.selection_index;
            if (positions.includes(next)) return positions.indexOf(next);
          }
          return state.selections.choice;
        },
      };
    }});
  const restore = state => {
    if (state.execution.status === 'returned') {
      if ([0x1A, 0x35, 0x25].includes(cid) || graph.poster)
        state.domainResults.windowRestore = {scene: state.context.scene || null, confirmed: true};
      if (cid === 0x2D && state.domainResults.teleport?.phase === 'selected') {
        state.domainResults.windowRestore = {caller: 'field-menu', confirmed: true};
        state.execution.reason = '目的地已选；关闭菜单后进入隧道';
      }
    }
    return state;
  };
  return {...application,
    initial(input) {
      if (!graph.poster) return application.initial(input);
      return interfacePreviewState({fields: input.fields, context: input.context,
        entry: 'wanted-information.poster', node: 'wanted-information.poster',
        pause: {kind: 'wait', evidence: MACHINE_SERVICE_EVIDENCE},
        windows: [{id: 'poster', node: 'wanted-information.poster'}], returnStack: [{caller: 'scene-interaction'}],
        execution: {status: 'waiting', position: 0, transactions: [], trace: []}});
    },
    advance(state, input) {
      if (cid === 0x2D && input.type === 'scene-entry') {
        const teleport = state.domainResults.teleport;
        if (state.execution.status !== 'returned' || teleport?.phase !== 'selected') return state;
        const field = id => `save.slot.${state.context.slot}.global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`;
        if (!hidden || hidden.trigger_flags.some(row => !Object.hasOwn(state.fields, field(row.id)))) {
          state.execution.status = 'unknown'; state.execution.reason = '隧道特殊路由条件未确认'; return state;
        }
        const special = hidden.trigger_flags.every(row => state.fields[field(row.id)] === row.value);
        const route = special ? hidden : routes.find(row => row.route_index === teleport.selection);
        if (!route) {state.execution.status = 'unknown'; state.execution.reason = '隧道场景路由未确认'; return state;}
        const x = special ? route.coordinate_x : route.camera_tile_origin_x_raw;
        const y = special ? route.coordinate_y : route.camera_tile_origin_y_raw;
        state.domainResults.scene = {kind: 'scene', sceneId: route.scene_id,
          ...playerTileFromSaveCamera(x, y), confirmed: true};
        if (special) state.fields[field(hidden.set_flag)] = 1;
        teleport.phase = 'arrived'; teleport.selection = 0; teleport.hidden = special;
        state.node = 'machine:teleport'; state.context.scene = {...state.domainResults.scene};
        state.domainResults.windowRestore = {scene: state.context.scene, confirmed: true};
        state.execution.reason = '传送完成';
        state.execution.trace.push({node: state.node, input: 'scene-entry', evidence: MACHINE_SERVICE_EVIDENCE});
        return state;
      }
      if (graph.poster) {
        if (state.execution.status !== 'waiting' || !['a', 'b'].includes(input.type)) return state;
        state.execution.trace.push({node: state.node, input: input.type, evidence: MACHINE_SERVICE_EVIDENCE});
        state.execution.status = 'returned'; state.execution.returnMarker = input.type;
        state.returnStack.pop(); state.pause = null; state.windows = [];
        return restore(state);
      }
      const pause = state.execution.intelligencePause;
      if (pause && state.execution.status === 'waiting') {
        if (!['a', 'b'].includes(input.type)) return state;
        state.execution.trace.push({node: state.node, input: input.type, evidence: MACHINE_SERVICE_EVIDENCE});
        if (++pause.position < pause.count) {
          if (pause.position === pause.count - 1) {
            state.returnStack.pop(); state.domainResults.intelligence.nativeReturned = true;
          }
          return state;
        }
        delete state.execution.intelligencePause;
        state.pause = null; state.execution.status = 'running';
        return restore(application.resume(state));
      }
      return restore(application.advance(state, input));
    },
  };
}

// @editor-module 机器领域快照只从当前字段取得输入并投影现有构造。

async function startMachineServiceExecution(model, context, dependencies) {
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

function invocationPreview(preview, selected) {
  return preview && !selected.path && selected.invocation ? {...preview,
    runtime_context: {...preview.runtime_context, facility_instance: selected.invocation.argument,
      shop_instance: selected.invocation.argument}} : preview;
}

function machineServicePreview(model, selected, fallback) {
  if (model.graph.device) return invocationPreview(deviceServicePreview(model, selected, fallback), selected);
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
  if (!execution) return invocationPreview(preview, selected);
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

// @editor-module 机器状态控制复用现有组件树、工作台与领域预览。

const sessions = new Map();
const boundRoots = new WeakSet();
const presentation = {namespace: 'machine-state', dataPrefix: 'machine-state', exitLabel: '返回调用者', notice: ''};
const commandId = definition => definition?.commandId ?? definition?.commandIds?.[0];
const current = cid => {
  const repository = state.projectRepository;
  if (!sessions.has(repository)) sessions.set(repository, new Map());
  const commands = sessions.get(repository);
  if (!commands.has(cid)) commands.set(cid, {path: '', node: null, edge: null, fullGraph: false});
  return commands.get(cid);
};

function machineStateControls(model, {namespace = `interface-page:${model.id}`, pageId = model.id, poster = false, targetId = null} = {}) {
  const cid = commandId(model.definition);
  if (!MACHINE_SERVICE_COMMANDS.includes(cid)) return null;
  const resource = `application-command:${cid.toString(16).toUpperCase().padStart(2, '0')}`;
  const command = db.peekResourceDocument(resource)
    || state.project.facilities?.applications?.commands.find(row => row.command_id === cid);
  const previews = state.project.ui.construction.menu_dispatch_data.previews;
  const catalog = state.project.ui.construction.interfaces || db.peekDocument('project.ui.interfaces');
  const selected = current(cid), context = interfacePreviewContext();
  const vending = [0x1B, 0x1C, 0x1D].includes(cid);
  if (vending && !context.deviceInput) context.deviceInput = {random: {high: 0, low: 0}, position: 0};
  const instance = context.service?.command === cid ? context.service.argument : 0;
  const inputKey = JSON.stringify([namespace, context.slot, instance, context.service?.entryHandle, context.scene, targetId, context.deviceInput]);
  if (selected.inputKey !== inputKey) {selected.path = ''; delete selected.session; selected.node = null;}
  selected.inputKey = inputKey;
  selected.context = structuredClone(context);
  if (!selected.path) selected.poster = poster;
  selected.posterTarget = targetId;
  selected.namespace = namespace;
  const invocation = serviceInvocation({command: cid, instance}, context.scene?.sceneId,
    context.service?.entryHandle || model.preview?.facility_screen?.entry_handle);
  selected.invocation = invocation;
  selected.model = {command, previews, graph: machineServiceGraph(command, state.project.text_record_edits, previews, catalog,
    {...invocation, poster: selected.poster})};
  selected.nodes = model.nodes;
  const graph = selected.model.graph;
  for (const node of graph.nodes) if (node.action?.record)
    node.label = uiRecordComponentLabel(node.action.record, {fallback: node.label});
  const component = selectedGameUiWorkbenchNode(namespace, model.nodes);
  const source = component?.servicePreview || model.preview;
  const entryRequest = namespace.startsWith('interface-page:') ? state.interfacePageEntry : null;
  const entryChanged = selected.entryRequest !== entryRequest;
  if (selected.path && selected.session) selected.node = selected.session.state.node;
  else if (!selected.node || entryRequest && entryChanged) {
    selected.node = entryRequest && graph.nodes.find(row => row.id === entryRequest
      || row.action?.id === entryRequest || row.segment?.id === entryRequest)?.id
      || component?.serviceFragment && graph.nodes.find(row => row.action?.id === component.serviceFragment)?.id
      || source?.id && graph.nodes.find(row => row.publishedPreview?.id === source.id)?.id || graph.entry;
  }
  selected.entryRequest = entryRequest;
  selected.component = component?.id;
  selected.workbench = createInterfaceStateControllerWorkbench({command, selection: () => selected,
    contextRequirements: ['preview-context', 'save-fields', 'service-invocation', 'device-inputs'],
    entry: {pageId, commandId: cid, instance, invocation, variant: selected.poster ? 'poster' : 'service', targetId},
    graph: () => selected.model.graph, presentation: {...presentation, count: `${graph.nodes.length} 个节点`},
    available: node => Boolean(node.publishedPreview), initialize: () => initialize(selected),
    inputs: () => {
      const snapshot = selected.path ? selected.session?.state : null;
      if (snapshot?.execution.status === 'waiting') return ['up', 'down', 'left', 'right', 'a', 'b',
        ...(selected.adapter.options(snapshot).length ? ['option'] : []), ...(cid === 0x37 ? ['password'] : [])];
      if (snapshot?.execution.status === 'animating') return ['frame'];
      if (snapshot?.execution.status === 'battle') return ['battle-result'];
      if (cid === 0x2D && snapshot?.execution.status === 'returned' && snapshot.domainResults.teleport?.phase === 'selected') return ['scene-entry'];
      if (cid === 0x37 && snapshot?.execution.status === 'returned'
          && !snapshot.domainResults.sceneReturn?.handoff) return ['a'];
      return [];
    },
    preview: fallback => selected.model ? machineServicePreview(selected.model, selected, fallback) : fallback,
    components: gameUiStateComponents(namespace, () => model.nodes)});
  const snapshot = selected.path ? selected.session?.state : null;
  const labels = snapshot ? selected.workbench.options(snapshot).map((label, index) => cid === 0x1A
    ? currentTextReference(`record:0D:${String(selected.goods[index]).padStart(3, '0')}`).label || `曲目 ${index + 1}`
    : label.startsWith('record:') ? currentTextReference(label).label : label) : [];
  const audio = snapshot?.domainResults.audio;
  const scene = snapshot?.domainResults.scene || snapshot?.domainResults.windowRestore?.scene;
  const tunnel = cid === 0x2D && snapshot?.execution.status === 'returned'
    && snapshot.domainResults.teleport?.phase === 'selected';
  const password = snapshot?.domainResults.password;
  const controller = snapshot?.domainResults.controller;
  const controlled = snapshot?.domainResults.controlledObjects;
  const retry = cid === 0x37 && snapshot?.execution.status === 'returned'
    && !snapshot.domainResults.sceneReturn?.handoff;
  const result = audio ? `已提交：${esc(currentTextReference(`record:0D:${String(audio.commandId).padStart(3, '0')}`).label)}
    ${renderModuleComponent('audio-command', selected.audioReference ? 'reference' : 'preview',
      selected.audioReference || {value: audio.commandId})}`
    : scene ? `${password ? password.matched ? '密码相符' : '密码不符'
      : controller ? `控制器预览：${controller.value ? '开启' : '关闭'}` : ''}${scenePositionPickerMarkup({entries: state.project.scenes?.editable_scenes || [],
      sceneId: scene.sceneId, x: scene.x, y: scene.y, readOnly: true,
      label: cid === 0x2D ? '传送落点' : cid === 0x1F ? '到达楼层' : '返回调查场景'})}`
    : password ? `${password.matched ? '密码相符' : '密码不符'}`
    : controller ? `控制器预览：${controller.value ? '开启' : '关闭'}`
    : snapshot?.execution.transactions.filter(row => row.type === 'bounty').map(row => `目标 ${row.wanted}：赏金 ${row.amount}G，余额 ${row.gold}G`).join('；') || '';
  return {toolbar: `<label class="screen-workbench-selection">路径 <select data-machine-state-path="${cid}">
      <option value="">自由查看</option><option value="input"${snapshot ? ' selected' : ''}>输入推进</option></select></label>
    ${vending ? [['high', '随机高字节', 255], ['low', '随机低字节', 255], ['position', '小球起点', 15]].map(([name, label, max]) =>
      `<label>${label}<input type="number" min="0" max="${max}" data-machine-state-device-input="${name}" value="${name === 'position' ? context.deviceInput.position : context.deviceInput.random?.[name] ?? 0}"${snapshot ? ' disabled' : ''}></label>`).join('') : ''}
    <button class="button" type="button" data-machine-state-previous${!snapshot || selected.session.position === 0 ? ' disabled' : ''}>上一步</button>
    <button class="button" type="button" data-machine-state-next${!snapshot || selected.session.position >= selected.session.snapshots.length - 1 ? ' disabled' : ''}>下一步</button>`,
    inputs: snapshot ? `${cid === 0x37 ? `<label>预览密码 <input data-machine-state-password inputmode="numeric" maxlength="6"
      value="${esc(snapshot.execution.password || '')}"${snapshot.execution.status === 'waiting' ? '' : ' disabled'}></label>` : ''}
      <select data-machine-state-option aria-label="输入选项"${labels.length ? '' : ' hidden'}>${labels.map((label, index) =>
      `<option value="${index}"${snapshot.selections.choice === index ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
      ${['up', 'down', 'left', 'right', 'a', 'b'].map((input, index) => `<button class="button" type="button" data-machine-state-input="${input}"${snapshot.execution.status === 'waiting' || retry && input === 'a' ? '' : ' disabled'}>${['↑', '↓', '←', '→', retry ? 'A · 再次调查' : 'A', 'B'][index]}</button>`).join('')}
      ${tunnel ? '<button class="button" type="button" data-machine-state-input="scene-entry">进入时空隧道</button>' : ''}
      <span data-machine-state-status>${esc(snapshot.execution.reason || (snapshot.execution.status === 'returned' ? '已返回调用者'
        : graph.nodes.find(row => row.id === snapshot.node)?.label || ''))}</span><span data-machine-state-result>${result}${controlled
          ? controlled.status === 'confirmed' ? `<span>${controlled.actors.map(actor =>
            `${esc(actor.handle)}：${actor.actorType === 255 ? '已移除' : actor.actorType === 0 ? '不绘制' : '显示'} (${actor.x}, ${actor.y})`).join('；')}${controlled.tiles.length ? `；门格变化 ${controlled.tiles.length} 格` : ''}</span>`
            : `<span>${esc(controlled.status === 'deferred' ? '受控对象待场景装载或自主动作续接' : controlled.reason || '受控对象效果未确认')}；未提交对象效果</span>` : ''}</span>` : '',
    domainMarkup: snapshot?.execution.status === 'returned' && ([0x1A, 0x35, 0x32].includes(cid) && snapshot.domainResults.windowRestore?.scene
        || snapshot.view.deviceScene?.sceneId === snapshot.context.scene?.sceneId)
      ? screenWorkbenchCanvasStage({namespace, sizing: 'fill', zoomMarkup: '',
        canvasMarkup: '<canvas width="256" height="240" data-machine-state-scene aria-label="返回调查场景预览"></canvas>'})
      : snapshot?.execution.status === 'battle' ? `<div data-machine-state-battle style="display:flex;flex:1;min-height:0">${battleSimulationMarkup({workbench: {
      bottomSize: 'compact', attributes: {style: 'grid-template-columns:minmax(0, 1fr);height:100%;width:100%'},
      treeAttributes: {hidden: true, style: 'display:none'}, inspectorAttributes: {hidden: true, style: 'display:none'},
    }})}</div>` : null,
    bottom: selected.workbench.graphMarkup(), graph};
}

function machineStatePreview(preview, definition) {
  const cid = commandId(definition);
  if (!MACHINE_SERVICE_COMMANDS.includes(cid)) return preview;
  const selected = current(cid);
  return selected.workbench ? selected.workbench.preview(preview)
    : selected.model ? machineServicePreview(selected.model, selected, preview) : preview;
}

function selectNode(selected, id) {
  selected.node = id;
  const node = selected.model.graph.nodes.find(row => row.id === id);
  const component = node?.action?.id && selected.nodes.find(row => row.serviceFragment === node.action.id)
    || node?.publishedPreview?.id && selected.nodes.find(row => row.servicePreview?.id === node.publishedPreview.id)
    || selected.nodes.find(row => row.id === ({'constructor:wanted-poster-screen': 'wanted:screen',
      'constructor:wanted-information-office-menu': 'wanted:office-menu',
      'constructor:wanted-information-intelligence': 'wanted:intelligence',
      'constructor:wanted-information-bounty-claim': 'wanted:bounty-claim'})[node?.publishedPreview?.id]);
  if (component) {
    selectGameUiWorkbenchNode(selected.namespace, component.id);
    selected.component = component.id;
    if (selected.namespace.startsWith('interface-page:')) {
      state.interfacePageEntry = component.serviceFragment || component.serviceStage || null;
      selected.entryRequest = state.interfacePageEntry;
    }
  }
}

async function initialize(selected) {
  const cid = selected.model.command.command_id;
  const context = structuredClone(interfacePreviewContext());
  if (selected.poster) context.wanted = selected.posterTarget;
  context.service = {...context.service, command: cid,
    argument: context.service?.command === cid ? context.service.argument : 0,
    entryHandle: selected.invocation.entryHandle || context.service?.entryHandle};
  Object.assign(selected, await startMachineServiceExecution(selected.model, context, {
    text: state.project.text_record_edits, readFields: () => ensureSaveCurrentFieldObjects(state),
    readDocument: resource => resource.startsWith('project.') ? db.getDocument(resource) : db.getResourceDocument(resource),
    readInterfaces: () => db.getDocument('project.ui.interfaces'),
    readField: (resource, handle, name) => db.getField(resource, handle, name),
    readPackageDocument: path => db.getPackageDocument(path),
  }));
  selected.path = 'input'; selectNode(selected, selected.session.state.node);
}

function bindMachineStateController(root, {rerender}) {
  const control = root?.querySelector('[data-machine-state-path]');
  if (!control || boundRoots.has(root)) return;
  boundRoots.add(root);
  const selected = current(Number(control.dataset.machineStatePath));
  root.querySelectorAll('[data-machine-state-result] [data-scene-position-picker]').forEach(picker =>
    hydrateScenePositionPicker(picker, {entries: state.project.scenes?.editable_scenes || []}));
  bindScreenWorkbenchBottomResize({root, namespace: selected.namespace});
  selected.workbench.bind(root, {cacheKey: `machine-state:${selected.model.command.command_id}`});
  const perform = task => async event => {
    try {
      await task(event);
      const audio = selected.path && selected.session?.state.domainResults.audio;
      selected.audioReference = audio ? await prepareModuleComponent('audio-command', 'reference', {
        value: audio.commandId, allowedValues: [audio.commandId], label: '提交声音',
      }) : null;
      await rerender();
    }
    catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '机器输入', error);}
  };
  control.addEventListener('change', perform(async event => {
    if (!event.target.value) {selected.path = ''; delete selected.session; return;}
    await selected.workbench.initialize();
  }));
  root.querySelector('[data-machine-state-previous]')?.addEventListener('click', perform(() => {
    selected.session.previous(); selectNode(selected, selected.session.state.node);
  }));
  root.querySelector('[data-machine-state-next]')?.addEventListener('click', perform(() => {
    selected.session.next(); selectNode(selected, selected.session.state.node);
  }));
  const advance = input => {selected.workbench.advance(input); selectNode(selected, selected.session.state.node);};
  const sceneCanvas = root.querySelector('[data-machine-state-scene]');
  if (sceneCanvas) {
    const snapshot = selected.session.state;
    void interfacePreviewSceneImage(snapshot).then(image => {
      if (image && root.isConnected && selected.session.state === snapshot)
        sceneCanvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    }).catch(error => showEditorError(root, '场景返回', error));
  }
  const battleHost = root.querySelector('[data-machine-state-battle]');
  if (battleHost) {
    const session = selected.session, running = session.state, call = running.domainResults.battleCall;
    const isCurrent = () => root.isConnected && selected.session === session && session.state.execution.status === 'battle';
    void (async () => {
      try {
        await prepareViewData('text');
        await prepareViewData('monster-formations');
        const failures = await ensureBattleSceneData({includeInventory: true});
        if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
        await prepareViewData('interfaceui');
        if (!isCurrent()) return;
        const player = battleHost.querySelector('[data-battle-simulation]');
        await bindBattleSimulation(player, {project: state.project,
          preview: battleScenePreviewForFormation(state.project, call.formationId),
          encounter: {kind: 'encounter', saveSlot: running.context.slot, fields: running.fields,
            ...call, scene: running.context.scene, fieldEncounter: false},
          onComplete: result => {
            if (!isCurrent()) return;
            advance({type: 'battle-result', result: result.completion});
            void rerender().catch(error => showEditorError(root, '战斗返回', error));
          }});
        if (isCurrent() && player.dataset.simulationReady !== 'true')
          throw new Error(player.querySelector('[data-simulation-error]').textContent || '战斗完成结果未确认');
      } catch (error) {
        if (!isCurrent()) return;
        advance({type: 'battle-result', result: {outcome: 'unknown', confirmed: false, missing: [error.message]}});
        await rerender();
      }
    })();
  }
  if (selected.path && selected.session?.state.execution.status === 'animating') {
    const session = selected.session;
    requestAnimationFrame(async () => {
      if (!root.isConnected || selected.session !== session || session.state.execution.status !== 'animating') return;
      try {advance({type: 'frame'}); await rerender();}
      catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '设备帧', error);}
    });
  }
  root.querySelector('[data-machine-state-option]')?.addEventListener('change', perform(event => advance({type: 'option', index: Number(event.target.value)})));
  bindTextInputEvents(root.querySelector('[data-machine-state-password]'), {onChange: perform(event =>
    advance({type: 'password', value: event.target.value}))});
  root.querySelectorAll('[data-machine-state-device-input]').forEach(element => element.addEventListener('change', perform(event => {
    const name = element.dataset.machineStateDeviceInput, value = Number(event.target.value);
    if (!Number.isInteger(value) || value < 0 || value > (name === 'position' ? 15 : 255))
      throw new RangeError('设备输入超出当前字节域');
    const input = interfacePreviewContext().deviceInput;
    if (name === 'position') input.position = value;
    else input.random[name] = value;
  })));
  root.querySelectorAll('[data-machine-state-input]').forEach(button => button.addEventListener('click', perform(() => advance({type: button.dataset.machineStateInput}))));
  root.querySelectorAll('[data-machine-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; selected.edge = null; selectNode(selected, button.dataset.machineStateNode);
  })));
  root.querySelector('[data-machine-state-full-graph]')?.addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-machine-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = selected.model.graph.edges.find(row => row.id === button.dataset.machineStateEdge);
    if (!edge) return;
    selected.edge = edge.id;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl class="screen-workbench-facts"><dt>输入</dt><dd>${esc(edge.input)}</dd>
      <dt>去向</dt><dd>${esc(selected.model.graph.nodes.find(row => row.id === edge.to)?.label || '返回调用者')}</dd></dl>`;
  }));
  root.addEventListener('field-object-saved', () => {selected.path = ''; delete selected.session;});
  root.querySelectorAll('select').forEach(element => {
    if (element.matches('[data-machine-state-path], [data-machine-state-option]')) return;
    element.addEventListener('change', () => {selected.path = ''; delete selected.session;}, {capture: true});
  });
}

export { bindMachineStateController, machineStateControls, machineStatePreview };
