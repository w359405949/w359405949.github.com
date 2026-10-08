// @editor-module 场景动作与剧情执行共用注入仓库，逐帧返回状态及外部效果。
import {globalRandom, createRuntimeRandomServices} from "./global-random.js";
import {encodeSceneActorRecordFields} from "./scene-compiler.js";
import {projectFieldDraftOrigin, projectFieldDraftRevision} from "./project-field-draft.js";
import {sceneInteractionTileChanges, sceneMapCell} from "./scene-runtime-map.js";
import {sceneMetatileAttributeRecords} from "./metatile-source.js";
import {metatileBehaviorCode} from "./metatile-behavior.js";
import {fieldTerrainMotion} from "./field-terrain-behavior.js";
import {assembleStoryScriptLayout, projectStoryScriptPrograms, storyScriptByteAt, storyScriptRuntimePointer} from "./story-script-layout.js";
import {fieldCameraOrigin, sceneCameraCoordinate, STORY_PREVIEW_ENTRY_CAMERAS} from "./story-camera.js";
import {sceneEntryMusicCommand} from "./scene-entry-interactions.js";
import {sceneDefaultMusicCommand, sceneFieldChrAnimation} from "./scene-config-owner.js";
import {fieldChrAnimationRecipe, fieldChrAnimationDuration, fieldChrAnimationMask, advanceFieldChrAnimation} from "./field-chr-animation.js";
import {storyWaitCondition, storyWaitKey} from "./story-wait-state.js";
import {STORY_DIALOGUE_OPERATIONS} from "./story-dialogue-operations.js";
import {STORY_BRANCH_OPERATIONS, storyPreviewRuntimeOverrides} from "./story-preview-conditions.js";
import {STORY_PARTY_ITEM_OPERATIONS, findStoryPartyItem, replaceStoryPartyItem,
  grantStoryPartyItem, grantStoryVehicleItem} from "./story-party-item-operations.js";
import {STORY_FIELD_OPERATIONS, storyFieldPartyOrder, beginStoryFieldStep,
  advanceStoryFieldStep} from "./story-field-operations.js";
import {decodeFixedTextRecord, textRecord, resolveTextRecordDialogue} from "./text-record-project.js";
import {
  partyAliveActorType,
  VISUAL_ACTORS_RESOURCE_ID,
} from "./visual-actors.js";
import {hex} from "./number-format.js";
import {recordUid} from "./record-handle.js";
import {applySceneActionLocalMutation, sceneActionMotionPhase,
  createSceneActionStateExecution} from "./scene-action-state-execution.js";
import {createSceneActionState, composeSceneActionState} from "./scene-action-state.js";
import {createSceneDisplayServices} from "./scene-display-state.js";
import {createControllerInputServices} from "./controller-input-semantics.js";
import {createTextExecutionServices} from "./text-runtime-execution.js";
import {createTextRecordExecutionSource} from "./text-record-execution-source.js";
import {createTextInteractionServices} from "./text-interaction-execution.js";
import {dialogueChoiceParameters, fieldSubmenuCodeValue} from "./field-submenu-code-sources.js";
import {createSceneDrawSlotServices, loadSceneDrawProjectionParameters} from "./scene-draw-slot-projection.js";
import {createSceneOamServices} from './scene-oam-composition.js';
import {loadSceneOamSources} from './scene-oam-sources.js';
import {createSceneRenderServices} from './scene-render-execution.js';
import {createSceneActorTileServices} from './field-map-query.js';
import {createSceneActionServiceExecution} from './scene-action-service-execution.js';
import {initializeSceneContext} from './scene-context-initialization.js';
import {rebuildSceneParty} from './scene-party-rebuild.js';

function captureCommandTimers(timers) {
  const value = {...timers};
  for (const key of Object.keys(value)) {
    if (value[key] !== null && typeof value[key] === 'object') value[key] = structuredClone(value[key]);
  }
  return value;
}

// 固定字段顺序省去键名；缺值位置保留，以区分 JSON 对象中的缺值与 null。
function signatureValues(values) {
  const missing = [];
  for (let index = 0; index < values.length; index += 1) {
    const type = typeof values[index];
    if (type === 'undefined' || type === 'function' || type === 'symbol') missing.push(index);
  }
  return [missing, values];
}

export function createSceneActionCore({readProject, database: db, repositoryIdentity = () => db,
  actorAppearance = () => null, sceneActionState = null, sceneActionContext = null, frameCommitCatalog = null}) {
  if (typeof readProject !== "function" || !db) throw new TypeError("场景动作缺少注入仓库");
  if (sceneActionState === null && sceneActionContext !== null) sceneActionState = createSceneActionState(sceneActionContext);
  if (Array.isArray(sceneActionState)) sceneActionState = composeSceneActionState(sceneActionState);
  if (sceneActionState !== null && ["field", "capture", "restore"].some(method =>
    typeof sceneActionState[method] !== "function")) throw new TypeError("场景动作缺少所属字段接口");
  const actionState = () => {
    if (!sceneActionState) throw new TypeError("场景动作未注入现场字段");
    return sceneActionState;
  };
  const stateMovementDeltas = () => ({x: storyBrowserVm().camera_model?.delta_x,
    y: storyBrowserVm().camera_model?.delta_y});
  const stateCommand = (kind, scriptId, cursor) => {
      prepareStoryVmCompilation();
      const program = storyVmProgramMap().get(`${kind}:${scriptId}`);
      const command = program?.commands.find(command => command.cursor === cursor);
      if (!command) return null;
      return {pointer: storyScriptRuntimePointer(program),
        commandBytes: command.raw_window,
        semantic: storyVmSemanticsMap().get(command.opcode), advance: command.normal_advance};
  };
  const createStateExecution = (renderSlot, options = {}) => createSceneActionStateExecution({state: actionState(), renderSlot, ...options,
    movementDeltas: stateMovementDeltas(),
    commandForActor: (scriptId, cursor) => stateCommand("autonomous", scriptId, cursor),
  });
  const createInteractionExecution = (scriptId = null) => createSceneActionStateExecution({
    state: actionState(), entry: "interaction", scriptId, movementDeltas: stateMovementDeltas(),
    commandForInteraction: (scriptId, cursor) => stateCommand("interaction", scriptId, cursor),
  });
  const createInlineExecution = commandBytes => createSceneActionStateExecution({
    state: actionState(), entry: "inline", movementDeltas: stateMovementDeltas(), commandForInline: () => ({commandBytes,
      semantic: storyVmSemanticsMap().get(commandBytes[0])}),
  });
  const createDrawSlotServices = async ({parameters = null, randomPolicy = 'advance'} = {}) => {
    await Promise.all(["actor-visual", "vehicle-visual-selector"].map(resourceId => db.getResourceDocument(resourceId, null)));
    return createSceneDrawSlotServices({state: actionState(),
      parameters: parameters || await loadSceneDrawProjectionParameters({
        readDocument: resourceId => db.getResourceDocument(resourceId, null),
        readField: source => db.getField(source.resource_id, source.entity_handle, source.field)}),
      readDocument: resourceId => db.peekResourceDocument(resourceId, null),
      createActionExecution: slot => createStateExecution(slot, {randomPolicy})});
  };
  const createOamServices = async () => createSceneOamServices({state: actionState(), sources: await loadSceneOamSources(db)});
  const createTileServices = async () => {
    const sceneId = actionState().field("field.sceneId").value;
    await Promise.all([recordUid("scene", sceneId), "metatile-page", "metatile-set"]
      .map(resourceId => db.getResourceDocument(resourceId, null)));
    return createSceneActorTileServices({state: actionState(),
      readScene: id => db.peekResourceDocument(recordUid("scene", id), null)?.scene,
      readDocument: id => db.peekResourceDocument(id, null)});
  };
  const createRenderServices = async options => {
    const [slotServices, oamServices, tileServices] = await Promise.all([
      createDrawSlotServices(options), createOamServices(), createTileServices()]);
    const resolveAction = request => {
      if (request.continuation?.kind === "actor-tile-fetch")
        return tileServices.fetch(request.effects.find(effect => effect.kind === "actor-tile-fetch"));
      if (request.continuation?.kind !== "autonomous-script-bank") return null;
      actionState().field("text.recordBank").value = 0x12;
      return {status: "available", state: actionState().capture(), effects: []};
    };
    return Object.freeze({...createSceneRenderServices({state: actionState(), slotServices, oamServices, resolveAction}),
      createHookExecution: commandBytes => createSceneActionServiceExecution({
        execution: createInlineExecution(commandBytes), resolveService: resolveAction})});
  };
  const storyVmCompilationCache = new Map();
  const storyVmSequenceCompilationCache = new Map();
  const STORY_VM_EXECUTION_LIMIT = 4096;

  let storyVmPublishedBytesSource = null;
  let storyVmPublishedBytes = new Map();
  let storyVmWorkingValues = null;
  let storyVmCompilationRevision = null;
  let storyVmCompilationDocument = null;
  let storyVmCompilationActorDocument = null;
  let storyVmCompilationProject = null;
  let storyVmCompilationRepository = null;
  let storyVmCompilationStructure = null;
  let storyVmMusicSignature = null;

  let currentStoryPrograms = null;
  function storyBrowserVm() {
    const source = readProject().story?.browser_vm || {};
    if (source.pagePrograms) return source;
    const assets = [readProject()?.story_autonomous_edits, readProject()?.story_interaction_edits];
    const values = assets.flatMap(asset => projectFieldDraftRevision(asset) !== null
      ? [asset, projectFieldDraftRevision(asset)]
      : [asset?.sequence, ...(asset?.scripts || []).map(script => script.bytecode)]);
    if (currentStoryPrograms?.source === source && values.length === currentStoryPrograms.values.length
        && values.every((value, index) => value === currentStoryPrograms.values[index])) return currentStoryPrograms.value;
    const programs = assets.flatMap((asset, index) => {
      const kind = index === 0 ? "autonomous" : "interaction";
      const published = (source.programs || []).filter(program => (program.kind || "autonomous") === kind);
      if (!asset?.layout || !published.length) return published;
      const origin = projectFieldDraftOrigin(asset) || asset;
      const entry = origin.layout.entries.find(entry => entry.script_id === published[0].id);
      const groups = new Map(origin.layout.groups.map(group => [group.id, group]));
      const base = published[0].pointer_prg - groups.get(entry.group_id).offset - entry.offset;
      const known = new Set(published.map(program => program.id));
      // 普通场景角色的自主入口同样由字段拥有的指令布局投影。
      const additional = origin.layout.entries.filter(entry => !known.has(entry.script_id)).map(entry => ({
        kind, id: entry.script_id, pointer_prg: base + groups.get(entry.group_id).offset + entry.offset,
        commands: [],
      }));
      return projectStoryScriptPrograms(asset, [...published, ...additional]);
    });
    const value = {...source, programs};
    currentStoryPrograms = {source, values, value};
    return value;
  }

  function storyActorIsVisible(actor) {
    // PRG $0341DE/$034261 在直接帧与通用精灵分派前跳过帧号 $00。
    return !actor.hidden && (actor.renderMode === "type-animation"
      || Number(actor.actorType) !== 0);
  }

  function storyVmEntryVariant(sequence, variant) {
    let entry = sequence?.preview_entry;
    if (!entry || !variant) return variant;
    const reference = entry.field_traversal?.entry_transition;
    if (reference) {
      const source = db.peekResourceDocument(recordUid("scene", reference.scene_id), null);
      const transition = source?.logic?.layers?.transitions?.point_transitions
        ?.find(row => Number(row.id) === Number(reference.id));
      if (!transition) throw new TypeError("剧情进场缺少场景入口");
      const [x, y] = fieldCameraOrigin(transition.destination_scene_id,
        transition.destination_x, transition.destination_y);
      entry = {...entry, initial_player_map_x: transition.destination_x,
        initial_player_map_y: transition.destination_y,
        camera_tile_origin_x: x, camera_tile_origin_y: y};
    }
    return {...variant, ...entry,
      scene_contexts: (variant.scene_contexts || []).map(context => ({...context,
        camera_tile_origin_x: entry.camera_tile_origin_x ?? context.camera_tile_origin_x,
        camera_tile_origin_y: entry.camera_tile_origin_y ?? context.camera_tile_origin_y,
      })),
    };
  }

  // 主角团队身份来自人物初值，形象来自当前角色视觉数据。
  function storyPartyMembers() {
    const roles = readProject()?.game_data?.characters?.rom_initial?.roles;
    const visuals = storyBrowserVm().party_member_death_rendering?.members || [];
    const visualActorDocument = db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null);
    const visualBySlot = new Map(visuals.map(member => [
      Number(member.party_slot), member,
    ]));
    const sources = Array.isArray(roles) && roles.length
      ? roles
      : visuals.map(member => ({
        id: Number(member.party_slot),
        name: `队伍槽 ${Number(member.party_slot)}`,
        present: Number(member.party_slot) === 0,
      }));
    return sources.map(role => {
      const slot = Number(role.id);
      const visual = visualBySlot.get(slot) || null;
      const currentActorType = partyAliveActorType(visualActorDocument, slot);
      return {
        slot,
        slug: String(role.slug || `slot-${slot}`),
        name: String(role.name || `队伍槽 ${slot}`),
        defaultRendered: role.present === undefined
          ? slot === 0 : Boolean(role.present),
        inventory: (role.inventory || []).map(item => Number(item.item_id ?? item)),
        equipment: (role.equipment || []).map(item => Number(item.item_id ?? item)),
        status: Number(role.status ?? 0),
        level: Number(role.level ?? 0),
        currentHp: Number(role.current_hp ?? 0),
        maxHp: Number(role.max_hp ?? 0),
        storyActorType: currentActorType ?? (
          Number.isInteger(Number(visual?.alive_actor_type))
            ? Number(visual.alive_actor_type) : null
        ),
        deadFrameId: Number.isInteger(Number(visual?.dead_frame_id))
          ? Number(visual.dead_frame_id) : null,
        palette: Math.max(0, Math.min(3, Number(visual?.palette) || 0)),
      };
    }).filter(member => Number.isInteger(member.slot) && member.slot >= 0)
      .sort((left, right) => left.slot - right.slot);
  }

  // 显式剧情角色接管同槽队员，关闭的队伍槽不进入舞台。
  function storySnapshotActors(snapshot) {
    const slots = Array.isArray(snapshot?.runtimePartySlots)
      ? new Set(snapshot.runtimePartySlots.map(Number)) : null;
    const scripted = (snapshot?.actors || []).filter(actor => (
      actor.partySlot === null || actor.partySlot === undefined
        || !slots || slots.has(Number(actor.partySlot))
    ));
    const representedPartySlots = new Set(scripted
      .filter(actor => !actor.hidden
        && actor.partySlot !== null && actor.partySlot !== undefined)
      .map(actor => Number(actor.partySlot)));
    const runtime = (snapshot?.partyActors || []).filter(actor => (
      (!slots || slots.has(Number(actor.partySlot)))
      && !representedPartySlots.has(Number(actor.partySlot))
    ));
    return [...scripted, ...runtime, ...(snapshot?.temporaryEntities || [])];
  }

  function runtimePartyConfiguration(runtimeOverrides) {
    const members = Array.isArray(runtimeOverrides?.partyMembers)
      ? runtimeOverrides.partyMembers.map(member => ({...member}))
      : storyPartyMembers();
    const explicitSlots = runtimeOverrides?.partySlots;
    const slots = explicitSlots instanceof Set || Array.isArray(explicitSlots)
      ? new Set([...explicitSlots].map(Number).filter(Number.isInteger))
      : new Set((members.length
        ? members.filter(member => member.defaultRendered).map(member => member.slot)
        : [0]).map(Number));
    const runtimeActorTypes = new Set(
      slots.has(0) ? [Number(runtimeOverrides?.runtimePlayerActorType ?? 0x1D)] : [],
    );
    return {members, slots, runtimeActorTypes};
  }

  function runtimePartySignature(configuration) {
    const value = source => source === null || source === undefined
      ? "-" : String(Number(source));
    const members = configuration.members.map(member => [
      value(member.slot),
      value(member.storyActorType),
      value(member.deadFrameId),
      value(member.palette),
      (member.inventory || []).join(","),
      (member.equipment || []).join(","),
      value(member.status), value(member.level), value(member.currentHp), value(member.maxHp),
      value(member.vehicleSlot), Boolean(member.ridingVehicle),
    ].join(":"));
    const slots = [...configuration.slots].sort((a, b) => a - b).join(",");
    const actorTypes = [...configuration.runtimeActorTypes]
      .sort((a, b) => a - b).join(",");
    return `${slots}@${actorTypes}@${members.join(";")}`;
  }

  let storyVmItemInputsSignature = null;
  let storyVmItemInputsCache = null;

  function runtimePartyItemInputs() {
    const revisions = ["item-entry", "vehicle-preset", "vehicle-visual-selector"].map(id => db.fieldRevision(id));
    if (revisions.every(revision => revision !== null)) return revisions.join("|");
    const items = readProject()?.game_data?.items;
    const vehicles = readProject()?.game_data?.vehicles;
    const selectors = db.peekDocument("vehicle-visual-selector", null);
    const itemMetadata = db.metadata("item");
    const vehicleMetadata = db.metadata("vehicle-preset");
    const selectorMetadata = db.metadata("vehicle-visual-selector");
    const fieldWeights = items?.records?.some(item => Object.getOwnPropertyDescriptor(item.tank_weight || {}, "raw")?.get);
    const canCache = fieldWeights && itemMetadata && vehicleMetadata && selectorMetadata;
    const cached = storyVmItemInputsCache;
    if (canCache && cached?.items === items && cached.vehicles === vehicles && cached.selectors === selectors
        && cached.itemMetadata === itemMetadata && cached.vehicleMetadata === vehicleMetadata
        && cached.selectorMetadata === selectorMetadata && cached.repository === repositoryIdentity()) return cached.value;
    const value = JSON.stringify([
      vehicles?.presets?.map(preset => [preset.vehicle_slot,
        preset.loadout?.map(item => item.item_id), preset.initial_weight?.remaining_internal_units]),
      items?.records?.map(item => [item.id, item.tank_weight?.internal_units]),
      selectors?.map_actor_types?.map(item => [item.id, item.actor_type]),
    ]);
    if (canCache) storyVmItemInputsCache = {
      items, vehicles, selectors, itemMetadata, vehicleMetadata, selectorMetadata,
      repository: repositoryIdentity(), value,
    };
    return value;
  }

  function runtimePartyItemSignature(runtimeOverrides) {
    const inputs = storyVmItemInputsSignature ?? runtimePartyItemInputs();
    if (storyVmCompilationDepth) storyVmItemInputsSignature = inputs;
    return JSON.stringify([
      runtimeOverrides?.partyInventories, runtimeOverrides?.partyEquipment,
      runtimeOverrides?.fieldPartyPositions, runtimeOverrides?.runtimeResultD5,
      runtimeOverrides?.vehicles, runtimeOverrides?.acceptVehicleOverload,
      runtimeOverrides?.partyMoney, runtimeOverrides?.fieldUiTarget,
      runtimeOverrides?.selectedVehicleSlot,
      runtimeOverrides?.investigationBits === undefined ? null : [...runtimeOverrides.investigationBits].sort((a, b) => a - b),
      runtimeOverrides?.partyDescriptors,
      runtimeOverrides?.objectScenes, runtimeOverrides?.choices, runtimeOverrides?.serviceResults,
      runtimeOverrides?.eventFlags !== undefined,
    ]) + "|" + inputs;
  }

  function runtimeEventFlags(runtimeOverrides) {
    const source = runtimeOverrides?.eventFlags;
    if (!(source instanceof Set) && !Array.isArray(source)) return [];
    return [...new Set([...source]
      .map(Number)
      .filter(flag => Number.isInteger(flag) && flag >= 0 && flag <= 0xFF))]
      .sort((left, right) => left - right);
  }

  function runtimePlayerSignature(runtimeOverrides) {
    const rawX = runtimeOverrides?.playerMapX;
    const rawY = runtimeOverrides?.playerMapY;
    const x = Number(rawX);
    const y = Number(rawY);
    if (rawX === null || rawX === undefined
        || rawY === null || rawY === undefined
        || !Number.isFinite(x) || !Number.isFinite(y)) {
      return "published";
    }
    return `${x}:${y}:${String(
      runtimeOverrides?.playerDirection || "published-direction",
    )}`;
  }

  /** Build the package-byte fallback without reparsing opcode or actor-list structure. */
  function storyVmPublishedByteMap() {
    const vm = readProject().story?.browser_vm || {};
    if (vm === storyVmPublishedBytesSource) return storyVmPublishedBytes;
    const bytes = new Map();
    const install = (prgOffset, values) => {
      const start = Number(prgOffset);
      if (!Number.isInteger(start) || !Array.isArray(values)) return;
      values.forEach((value, index) => {
        const byte = Number(value);
        if (Number.isInteger(byte)) bytes.set(start + index, byte & 0xFF);
      });
    };
    for (const actorList of [
      ...(vm.variants || []),
      ...(vm.continuation_actor_lists || []),
      ...(vm.extended_actor_lists || []),
    ]) {
      for (const actor of actorList.actors || []) {
        install(actor.record_prg, actor.raw);
      }
    }
    for (const program of vm.programs || []) {
      for (const command of program.commands || []) {
        install(command.prg_offset, command.raw_window);
      }
    }
    storyVmPublishedBytesSource = vm;
    storyVmPublishedBytes = bytes;
    return bytes;
  }

  /**
   * Snapshot the effective story byte layer and calculate its cheap revision marker.
   * This is the only place that knows how an absolute PRG address maps into a
   * working segment.  The rolling checks catch in-place byte edits without
   * serialising or deeply comparing the complete document.
   */
  const storyActorAddressCache = new WeakMap();
  const storyActorEncodingCache = new WeakMap();

  function storyVmWorkingActorRecords(actorDocument) {
    const structure = storyBrowserVm();
    const revision = projectFieldDraftRevision(actorDocument);
    const cached = actorDocument && storyActorEncodingCache.get(actorDocument);
    if (revision !== null && cached?.revision === revision && cached.structure === structure) return cached.records;
    let addresses = storyActorAddressCache.get(structure);
    if (!addresses) {
      addresses = new Set(storyVmAllActorLists().flatMap(actorList => actorList.actors || [])
        .map(actor => Number(actor.record_prg)).filter(Number.isInteger));
      storyActorAddressCache.set(structure, addresses);
    }
    const records = [];
    const actors = Array.isArray(actorDocument?.records) ? actorDocument.records : [];
    for (const record of actors) {
      const start = Number(record?.source?.offset);
      if (!Number.isInteger(start) || !addresses.has(start)) continue;
      records.push([start, encodeSceneActorRecordFields(record, String(record?.uid || "scene actor"))]);
    }
    if (revision !== null) storyActorEncodingCache.set(actorDocument, {structure, revision, records});
    return records;
  }

  const storyWorkingScripts = new WeakMap();
  const storyProgramAddresses = new WeakMap();

  function storyVmWorkingScriptBytes() {
    const structure = storyBrowserVm();
    const assets = [readProject()?.story_autonomous_edits, readProject()?.story_interaction_edits];
    const signature = JSON.stringify(assets.map(asset => [asset?.sequence, asset?.scripts?.map(script => [script.id, script.bytecode])]));
    const cached = storyWorkingScripts.get(structure);
    if (cached?.signature === signature) return cached;
    let addresses = storyProgramAddresses.get(structure);
    if (!addresses) {
      addresses = new Map();
      for (const program of structure.programs || []) {
        const key = `${program.kind || "autonomous"}:${program.id}`;
        if (!addresses.has(key)) addresses.set(key, program.pointer_prg);
      }
      storyProgramAddresses.set(structure, addresses);
    }
    const bytes = new Map();
    let hash = 0x811C9DC5;
    const mix = value => { hash = Math.imul(hash ^ (Number(value) >>> 0), 0x01000193) >>> 0; };
    assets.forEach((asset, index) => {
      if (asset?.layout) {
        assembleStoryScriptLayout(asset).bytes.forEach(mix);
        return;
      }
      for (const script of asset?.scripts || []) {
        mix(script.id);
        for (const byte of script.bytecode) mix(byte);
        const pointer = addresses.get(`${index === 0 ? "autonomous" : "interaction"}:${script.id}`);
        if (pointer !== undefined) script.bytecode.forEach((byte, offset) => bytes.set(pointer + offset, byte));
      }
    });
    const value = {signature, bytes, hash};
    storyWorkingScripts.set(structure, value);
    return value;
  }

  let storyVmWorkingLayerCache = null;

  function storyVmWorkingValueLayer() {
    const document_ = readProject()?.story_cutscene_edits || null;
    const actorDocument = readProject()?.story_scene_actor_edits || null;
    const segments = Array.isArray(document_?.segments)
      ? document_.segments : [];
    if (projectFieldDraftRevision(actorDocument) !== null
        && projectFieldDraftRevision(readProject()?.story_autonomous_edits) !== null)
      return storyVmLazyWorkingValueLayer(document_, actorDocument, segments);
    const scripts = storyVmWorkingScriptBytes();
    const actorRevision = projectFieldDraftRevision(actorDocument);
    const segmentSignature = JSON.stringify(segments.map(segment => [segment.prg, segment.bytes]));
    const structure = storyBrowserVm();
    const cached = storyVmWorkingLayerCache;
    if (actorRevision !== null && cached?.document === document_ && cached.actorDocument === actorDocument
        && cached.actorRevision === actorRevision && cached.segmentSignature === segmentSignature
        && cached.scripts === scripts && cached.structure === structure) return cached.value;
    const actorBytes = new Map();
    let hash = scripts.hash;
    let weighted = 0;
    let byteCount = 0;
    let actorByteCount = 0;
    let actorRecordCount = 0;
    const mix = value => {
      hash = Math.imul(hash ^ (Number(value) >>> 0), 0x01000193) >>> 0;
    };
    const scriptBytes = scripts.bytes;
    for (const segment of segments) {
      const values = Array.isArray(segment?.bytes) ? segment.bytes : [];
      mix(segment?.prg);
      mix(values.length);
      for (const source of values) {
        const byte = Number(source) & 0xFF;
        byteCount += 1;
        mix(byte);
        weighted = (
          weighted + Math.imul(byteCount >>> 0, (byte + 1) >>> 0)
        ) >>> 0;
      }
    }
    // 普通场景角色表仍由 scene-actor 基础资产唯一拥有。剧情链穿过这类表时，
    // 只把其当前 semantic record 经共用场景编码器投影成临时 byte layer；这里
    // 不保存第二份角色字节，也不在剧情 VM 里复刻 byte0–byte5 的位布局。
    mix(0x53434143);
    for (const [start, values] of storyVmWorkingActorRecords(actorDocument)) {
      mix(start);
      mix(values.length);
      actorRecordCount += 1;
      values.forEach((value, index) => {
        const byte = Number(value) & 0xff;
        actorBytes.set(start + index, byte);
        actorByteCount += 1;
        byteCount += 1;
        mix(byte);
        weighted = (
          weighted + Math.imul(byteCount >>> 0, (byte + 1) >>> 0)
        ) >>> 0;
      });
    }
    const value = {
      document: document_,
      actorDocument,
      revision: `${
        segments.length}:${actorRecordCount}:${actorByteCount}:${byteCount}:${hash}:${weighted}`,
      byteAt(prgOffset) {
        const address = Number(prgOffset);
        if (scriptBytes.has(address)) return scriptBytes.get(address);
        for (const segment of segments) {
          const offset = address - Number(segment?.prg);
          const values = Array.isArray(segment?.bytes) ? segment.bytes : [];
          if (offset < 0 || offset >= values.length) continue;
          const value = Number(values[offset]);
          return Number.isInteger(value) ? value & 0xFF : null;
        }
        return null;
      },
      actorByteAt(prgOffset) {
        const value = actorBytes.get(Number(prgOffset));
        return Number.isInteger(value) ? value & 0xff : null;
      },
    };
    if (actorRevision !== null) storyVmWorkingLayerCache = {
      document: document_, actorDocument, actorRevision, segmentSignature, scripts, structure, value,
    };
    return value;
  }

  function storyVmLazyWorkingValueLayer(document_, actorDocument, segments) {
    const assets = [readProject().story_autonomous_edits, readProject().story_interaction_edits];
    const revision = [projectFieldDraftRevision(actorDocument), ...assets.map(projectFieldDraftRevision)].join("|");
    const cached = storyVmWorkingLayerCache;
    if (cached?.document === document_ && cached.actorDocument === actorDocument && cached.revision === revision)
      return cached.value;
    const records = new Map((actorDocument.records || []).map(record => [Number(record.source?.offset), record]));
    const encoded = new Map();
    const published = readProject().story?.browser_vm?.programs || [];
    const pools = assets.flatMap((asset, index) => {
      if (!asset) return [];
      const kind = index ? "interaction" : "autonomous";
      if (!asset.layout) {
        const origin = projectFieldDraftOrigin(asset) || asset;
        return origin.scripts.flatMap(script => {
          const program = published.find(program => (program.kind || "autonomous") === kind && program.id === script.id);
          const current = asset.scripts.find(row => row.id === script.id);
          return program ? [{base: program.pointer_prg, length: script.bytecode.length, current}] : [];
        });
      }
      const program = published.find(program => (program.kind || "autonomous") === kind);
      const entry = asset.layout.entries.find(entry => entry.script_id === program?.id);
      if (!entry) return [];
      const group = asset.layout.groups.find(group => group.id === entry.group_id);
      return [{asset, base: program.pointer_prg - group.offset - entry.offset, length: asset.layout.capacity}];
    });
    const addresses = new Map();
    for (const pool of pools) for (let offset = 0; offset < pool.length; offset++)
      addresses.set(pool.base + offset, {pool, offset});
    const value = {
      document: document_, actorDocument, revision,
      byteAt(address) {
        const entry = addresses.get(address);
        if (entry) {
          if (entry.pool.current) {
            entry.pool.bytes ||= [...entry.pool.current.bytecode];
            return entry.pool.bytes[entry.offset];
          }
          return storyScriptByteAt(entry.pool.asset, entry.offset);
        }
        for (const segment of segments) {
          const offset = address - Number(segment.prg);
          if (offset >= 0 && offset < segment.bytes.length) return Number(segment.bytes[offset]) & 255;
        }
        return null;
      },
      actorByteAt(address) {
        for (let offset = 0; offset < 6; offset++) {
          const start = address - offset;
          const record = records.get(start);
          if (!record) continue;
          if (!encoded.has(start)) encoded.set(start, encodeSceneActorRecordFields(record, record.uid));
          return encoded.get(start)[offset];
        }
        return null;
      },
    };
    storyVmWorkingLayerCache = {document: document_, actorDocument, revision, value};
    return value;
  }

  let storyVmCompilationDepth = 0;
  let storyVmPrograms = null;
  let storyVmBlockingUiMetadataCache = new WeakMap();
  const storyVmSemantics = new WeakMap();

  function prepareStoryVmCompilation() {
    if (storyVmCompilationDepth) return;
    const working = storyVmWorkingValueLayer();
    const structure = storyBrowserVm();
    const musicSignature = JSON.stringify([(readProject().scenes?.catalog || []).map(scene => {
      const document = db.peekResourceDocument(recordUid("scene", Number(scene.id)), null);
      return [scene.id, db.fieldRevision(recordUid("scene", Number(scene.id))),
        scene.header_extension?.[7], sceneDefaultMusicCommand(document),
        sceneFieldChrAnimation(document?.scene)];
    }),
      db.peekDocument("field-scene-lifecycle-service", null)?.records,
      fieldChrAnimationRecipe(db.peekResourceDocument("palette-runtime-service", null)),
      db.fieldRevision("palette-runtime-service"),
      ["metatile-page", "metatile-set", "field-terrain-behavior-service"]
        .map(id => db.fieldRevision(id))]);
    const changed = working.revision !== storyVmCompilationRevision
      || working.document !== storyVmCompilationDocument
      || working.actorDocument !== storyVmCompilationActorDocument
      || readProject() !== storyVmCompilationProject
      || repositoryIdentity() !== storyVmCompilationRepository
      || structure !== storyVmCompilationStructure
      || musicSignature !== storyVmMusicSignature;
    storyVmWorkingValues = working;
    if (!changed) return;
    storyVmPrograms = null;
    storyVmBlockingUiMetadataCache = new WeakMap();
    storyVmCompilationCache.clear();
    storyVmSequenceCompilationCache.clear();
    storyVmCompilationRevision = working.revision;
    storyVmCompilationDocument = working.document;
    storyVmCompilationActorDocument = working.actorDocument;
    storyVmCompilationProject = readProject();
    storyVmCompilationRepository = repositoryIdentity();
    storyVmCompilationStructure = structure;
    storyVmMusicSignature = musicSignature;
  }

  function storyVmEffectiveByte(prgOffset) {
    if (!storyVmWorkingValues) prepareStoryVmCompilation();
    const address = Number(prgOffset);
    // 角色记录即使与旧 cutscene 段重叠，也只认 scene-actor；脚本与
    // story-state 等其余字节继续读取剧情 working 层。
    const actorWorking = storyVmWorkingValues.actorByteAt(address);
    if (actorWorking !== null) return actorWorking;
    const working = storyVmWorkingValues.byteAt(address);
    if (working !== null) return working;
    return storyVmPublishedByteMap().get(address);
  }

  function storyVmEffectiveBytes(prgOffset, length) {
    const start = Number(prgOffset);
    return Array.from(
      {length: Math.max(0, Number(length) || 0)},
      (_, index) => storyVmEffectiveByte(start + index),
    );
  }

  function storyVmCurrentPrograms(identities = null) {
    prepareStoryVmCompilation();
    return storyBrowserVm().programs.filter(program => !identities || identities.some(identity => identity.id === program.id
      && identity.kind === (program.kind || "autonomous"))).map(program => ({...program,
      commands: program.commands.map(command => ({...command,
        currentOperands: command.currentOperands || storyVmEffectiveBytes(
          Number(command.prg_offset) + 1, (command.operands || []).length),
      })),
    }));
  }

  /**
   * 文本身份按处理器的操作数声明与事件位解析；无声明的命令由发布投影确定操作数位置。
   * 正文由文本字段对象提供当前值，页面与 VM 共用本入口。
   */
  function storyVmBlockingUiResolver(
    programs = storyBrowserVm().programs || [],
    readCommandOperands = null,
  ) {
    if (typeof readCommandOperands !== "function") {
      prepareStoryVmCompilation();
      readCommandOperands = command => command.currentOperands || storyVmEffectiveBytes(
        Number(command.prg_offset) + 1,
        (command.operands || []).length,
      );
    }
    const sources = readProject().story?.browser_vm?.programs || [];
    const canCache = programs !== null && typeof programs === 'object';
    let metadata = canCache && storyVmBlockingUiMetadataCache.get(programs);
    if (!metadata || metadata.sources !== sources) {
      const projectedPrograms = programs instanceof Map
        ? [...programs.values()] : [...(programs || [])];
      const sourcePrograms = new Map();
      for (const source of sources) {
        const kind = source.kind || 'autonomous';
        if (!sourcePrograms.has(kind)) sourcePrograms.set(kind, new Map());
        const byId = sourcePrograms.get(kind);
        if (!byId.has(source.id)) byId.set(source.id, source);
      }
      const programList = projectedPrograms.map(program => sourcePrograms.get(program.kind || 'autonomous')?.get(program.id)
        || (program.instructionLayout ? null : program)).filter(Boolean);
      const blockingUiByIdentity = new Map();
      const blockingUiCommandsByOpcode = new Map();
      for (const program of programList) {
        for (const command of program.commands || []) {
          const ui = command.blocking_ui;
          if (!ui) continue;
          blockingUiByIdentity.set(
            `${Number(ui.region_id)}:${Number(ui.record_id)}`,
            ui,
          );
          for (const choice of command.blocking_ui_choices || []) {
            blockingUiByIdentity.set(
              `${Number(choice.region_id)}:${Number(choice.record_id)}`, choice,
            );
          }
          const opcode = Number(command.opcode);
          if (!blockingUiCommandsByOpcode.has(opcode)) {
            blockingUiCommandsByOpcode.set(opcode, []);
          }
          blockingUiCommandsByOpcode.get(opcode).push(command);
        }
      }
      const consistentOperandIndex = (commands, field) => {
        const width = Math.max(
          0,
          ...commands.map(command => Math.max(
            0, (command.raw_window || []).length - 1,
          )),
        );
        for (let index = 0; index < width; index += 1) {
          if (commands.every(command => (
            Number(command.raw_window?.[index + 1])
            === Number(command.blocking_ui?.[field])
          ))) return index;
        }
        return null;
      };
      const blockingUiModels = new Map();
      for (const [opcode, commands] of blockingUiCommandsByOpcode) {
        blockingUiModels.set(opcode, {
          regionOperandIndex: consistentOperandIndex(commands, "region_id"),
          recordOperandIndex: consistentOperandIndex(commands, "record_id"),
        });
      }
      metadata = {sources, blockingUiByIdentity, blockingUiModels};
      if (canCache) storyVmBlockingUiMetadataCache.set(programs, metadata);
    }
    const {blockingUiByIdentity, blockingUiModels} = metadata;
    const operand = (command, index, fallback) => {
      const value = Number(readCommandOperands(command)?.[Number(index)]);
      return Number.isFinite(value) ? value : fallback;
    };
    return (command, eventFlags = new Set()) => {
      if (Number(command.opcode) === 0x26 && operand(command, 0, -1) >= 0x10) return {
        blockingUi: {region_id: -1, record_id: -1, record_found: false, page_breaks: 0, pages: [], text: ""},
        regionOperandIndex: null, recordOperandIndex: null,
        interactionService: {selector: operand(command, 0, -1), parameter: operand(command, 1, 0)},
      };
      const published = command.blocking_ui || {};
      const model = blockingUiModels.get(Number(command.opcode)) || {};
      const dialogueOperation = STORY_DIALOGUE_OPERATIONS[Number(command.opcode)];
      const recordOperandIndex = dialogueOperation?.flag_operand_index !== undefined
        ? eventFlags.has(operand(command, dialogueOperation.flag_operand_index, -1))
          ? dialogueOperation.set_record_operand_index
          : dialogueOperation.clear_record_operand_index
        : dialogueOperation?.record_operand_index ?? model.recordOperandIndex;
      const regionId = dialogueOperation?.region_operand_index !== undefined
        ? operand(command, dialogueOperation.region_operand_index, -1)
        : dialogueOperation?.region_id ?? (model.regionOperandIndex === null
          || model.regionOperandIndex === undefined
        ? Number(published.region_id ?? -1)
        : operand(command, model.regionOperandIndex, published.region_id));
      const recordId = recordOperandIndex === null
          || recordOperandIndex === undefined
        ? Number(published.record_id ?? -1)
        : operand(command, recordOperandIndex, published.record_id);
      const currentRecord = dialogueOperation && readProject()?.text_record_edits
        && Number.isInteger(regionId) && regionId >= 0
        && Number.isInteger(recordId) && recordId >= 0
        ? textRecord(readProject().text_record_edits, regionId, recordId) : null;
      const currentText = currentRecord && readProject()?.text_record_encoding
        ? decodeFixedTextRecord(currentRecord, readProject().text_record_encoding)
        : null;
      const blockingUi = currentText ? {
        region_id: regionId,
        record_id: recordId,
        record_found: true,
        page_breaks: currentText.page_breaks,
        pages: currentText.pages,
        text: currentText.text,
      } : blockingUiByIdentity.get(`${regionId}:${recordId}`) || {
        region_id: regionId,
        record_id: recordId,
        record_found: false,
        page_breaks: 0,
        pages: [],
        text: "",
      };
      return {
        blockingUi,
        regionOperandIndex: Number.isInteger(model.regionOperandIndex)
          ? model.regionOperandIndex : null,
        recordOperandIndex: Number.isInteger(recordOperandIndex)
          ? recordOperandIndex : null,
      };
    };
  }

  function storyVmProgramMap() {
    if (storyVmPrograms) return storyVmPrograms;
    const programs = new Map();
    const published = storyBrowserVm().programs || [];
    const opcodeTemplates = new Map((readProject().story?.browser_vm?.programs || []).flatMap(program => program.commands || [])
      .map(command => [Number(command.opcode), command]));
    for (const source of published) {
      if (source.instructionLayout || source.commands.some(command => command.instructionId)) {
        const kind = String(source.kind || "autonomous");
        programs.set(`${kind}:${Number(source.id)}`, source);
        if (kind === "autonomous") programs.set(Number(source.id), source);
        continue;
      }
      const prepare = () => {
        const asset = (source.kind || "autonomous") === "autonomous"
          ? readProject()?.story_autonomous_edits : readProject()?.story_interaction_edits;
        const bytes = asset?.scripts?.find(script => script.id === source.id)?.bytecode;
        let program = {...source, commands: source.commands.map(command => {
          const opcode = bytes?.[command.cursor];
          const template = opcodeTemplates.get(opcode);
          if (opcode === undefined || opcode === command.opcode || !template
              || template.normal_advance !== command.normal_advance) return command;
          return {...command, opcode, opcode_hex: hex(opcode, 2),
            handler_cpu: template.handler_cpu, handler_cpu_hex: template.handler_cpu_hex,
            handler_prg: template.handler_prg, handler_prg_hex: template.handler_prg_hex};
        })};
        const legacyDirections = (source.commands || []).filter(command => (
          command.opcode === 0x6D && command.normal_advance === 1
        ));
        if (legacyDirections.length) {
          const commands = new Map(program.commands.map(command => [command.cursor, command]));
          // 旧发布的 $6D 步长为 1；缺失的后继只按已发布 opcode 描述恢复。
          for (const direction of legacyDirections) {
            commands.set(direction.cursor, {...direction, normal_advance: 2});
            let cursor = direction.cursor + 2;
            while (!commands.has(cursor) && cursor < source.encoded_range.length) {
              const prgOffset = source.pointer_prg + cursor;
              const opcode = storyVmEffectiveByte(prgOffset);
              const template = opcodeTemplates.get(opcode);
              if (!template) break;
              const raw = storyVmEffectiveBytes(prgOffset, 6);
              commands.set(cursor, {...template, cursor, cursor_hex: hex(cursor, 2),
                prg_offset: prgOffset, prg_offset_hex: hex(prgOffset, 6),
                operands: raw.slice(1), raw_window: raw,
                raw_window_hex: raw.map(byte => hex(byte, 2).slice(2)).join(" "),
                blocking_ui: undefined, audio_event: undefined, edges: []});
              const advance = Number(template.normal_advance);
              if (advance <= 0) break;
              cursor += advance;
            }
          }
          program = {...program, commands: [...commands.values()].sort((a, b) => a.cursor - b.cursor)};
        }
        return program.commands;
      };
      let commands;
      const program = Object.defineProperty({...source}, "commands", {
        enumerable: true, get: () => commands ||= prepare(),
      });
      const kind = String(source.kind || "autonomous");
      programs.set(`${kind}:${Number(source.id)}`, program);
      if (kind === "autonomous") programs.set(Number(source.id), program);
    }
    storyVmPrograms = programs;
    return programs;
  }

  function storyVmSemanticsMap() {
    const structure = storyBrowserVm();
    const cached = storyVmSemantics.get(structure);
    if (cached) return cached;
    const semantics = new Map(
      (storyBrowserVm().opcode_semantics || []).map(item => [Number(item.opcode), item])
    );
    for (const [opcode, operation] of Object.entries({
      ...STORY_DIALOGUE_OPERATIONS, ...STORY_PARTY_ITEM_OPERATIONS, ...STORY_FIELD_OPERATIONS,
      ...STORY_BRANCH_OPERATIONS,
    })) {
      const id = Number(opcode);
      semantics.set(id, {...semantics.get(id), ...operation, missing: operation.missing ?? null});
    }
    storyVmSemantics.set(structure, semantics);
    return semantics;
  }

  function storyAudioCommand(commandId) {
    return (readProject().audio?.commands || []).find(
      command => Number(command.id) === Number(commandId),
    ) || null;
  }

  function storyAudioControl(commandId) {
    return (readProject().audio?.controls || []).find(
      control => Number(control.id) === Number(commandId),
    ) || null;
  }

  function initialStoryAudioState() {
    return {
      currentMusicCommandId: null,
      musicStatus: "inherited-unknown",
      fadeControlId: null,
      fadeUpdatesRemaining: 0,
      fadeSourceMusicStatus: null,
      lastSfxCommandId: null,
      lastEvent: null,
      eventSerial: 0,
    };
  }

  function sceneEntryAudioEvent(sceneId, eventFlags) {
    const commandId = sceneEntryMusicCommand(sceneId, db.peekDocument("field-scene-lifecycle-service", null)
      || readProject().field_scene_lifecycle,
      readProject().scenes, eventFlags, db.peekResourceDocument(
        recordUid("scene", Number(sceneId)), null));
    return commandId === null ? null : {
      id: `scene-entry-music-${sceneId}`, command_id: commandId, role: "sound-command",
      dispatch: "scene-entry-music", resource_id: `audio-command:${commandId.toString(16).toUpperCase().padStart(2, "0")}`,
    };
  }

  function resolveStoryAudioEvent(event) {
    const commandId = Number(event?.command_id);
    const command = storyAudioCommand(commandId);
    const control = storyAudioControl(commandId);
    const kind = event?.role === "fade-control" || control
      ? "fade-control"
      : command?.kind || "unknown-command";
    return {
      ...(event || {}),
      command_id: commandId,
      command_id_hex: event?.command_id_hex || hex(commandId, 2),
      kind,
      label: control?.label || command?.label || (
        kind === "fade-control"
          ? `淡出控制 ${hex(commandId, 2)}`
          : `声音命令 ${hex(commandId, 2)}`
      ),
      channel_mask: command?.channel_mask ?? 0,
      channel_mask_hex: command?.channel_mask_hex || "0x0",
      stream_count: Number(command?.stream_count) || 0,
    };
  }

  function applyStoryAudioEvent(audioState, sourceEvent) {
    const event = resolveStoryAudioEvent(sourceEvent);
    audioState.lastEvent = event;
    audioState.eventSerial = Number(audioState.eventSerial || 0) + 1;
    if (storyAudioCommand(event.command_id)?.status === "audio-reset") {
      Object.assign(audioState, initialStoryAudioState(), {lastEvent: event, eventSerial: audioState.eventSerial});
    } else if (event.kind === "music") {
      if (audioState.currentMusicCommandId === event.command_id
          && ["scene-entry-music", "queue-sound-command-if-changed"].includes(event.dispatch)) return event;
      audioState.currentMusicCommandId = event.command_id;
      audioState.musicStatus = "playing";
      audioState.fadeControlId = null;
      audioState.fadeUpdatesRemaining = 0;
      audioState.fadeSourceMusicStatus = null;
    } else if (event.kind === "sound-effect") {
      audioState.lastSfxCommandId = event.command_id;
    } else if (event.kind === "fade-control") {
      audioState.fadeSourceMusicStatus = audioState.musicStatus;
      audioState.fadeControlId = event.command_id;
      audioState.musicStatus = "fading";
      const control = storyAudioControl(event.command_id);
      audioState.fadeUpdatesRemaining = Math.max(
        1,
        Number(control?.driver_updates_to_reset)
          || Number(control?.interval) * 16
          || 1,
      );
    }
    return event;
  }

  function advanceStoryAudioState(audioState) {
    if (audioState.musicStatus !== "fading") return;
    audioState.fadeUpdatesRemaining = Math.max(
      0,
      Number(audioState.fadeUpdatesRemaining || 0) - 1,
    );
    if (audioState.fadeUpdatesRemaining > 0) return;
    audioState.currentMusicCommandId = null;
    audioState.musicStatus = "stopped-after-fade-reset";
    audioState.fadeControlId = null;
    audioState.fadeSourceMusicStatus = null;
  }

  function storyVmAllActorLists() {
    const vm = storyBrowserVm();
    return [
      ...(vm.variants || []),
      ...(vm.continuation_actor_lists || []),
      ...(vm.extended_actor_lists || []),
      ...(vm.interaction_actor_lists || []),
    ];
  }

  function storyVmInteractionPreviewRoute(program) {
    const commands = new Map(
      (program?.commands || []).map(command => [Number(command.cursor), command]),
    );
    const dialogueOpcodes = new Set([1, 2, 3, 38, 72, 99, 100, 101, 104]);
    const visit = (cursor, seen) => {
      const command = commands.get(Number(cursor));
      if (!command || seen.has(Number(cursor))) {
        return {score: 0, path: []};
      }
      const nextSeen = new Set(seen).add(Number(cursor));
      const opcode = Number(command.opcode);
      const ownScore = dialogueOpcodes.has(opcode) ? 100 : 1;
      if (opcode === 55) return {score: 1000000 + ownScore, path: [cursor]};
      const targets = (command.edges || [])
        .map(edge => Number(edge.target_cursor))
        .filter(target => Number.isInteger(target) && commands.has(target));
      if (!targets.length) return {score: ownScore, path: [cursor]};
      let best = null;
      for (const target of targets) {
        const candidate = visit(target, nextSeen);
        const scored = {
          score: ownScore + candidate.score,
          path: [cursor, ...candidate.path],
        };
        if (!best || scored.score > best.score) best = scored;
      }
      return best || {score: ownScore, path: [cursor]};
    };
    const path = visit(0, new Set()).path;
    return new Map(path.slice(0, -1).map((cursor, index) => [
      Number(cursor),
      Number(path[index + 1]),
    ]));
  }

  function storyVmSequences() {
    const vm = storyBrowserVm();
    const source = (vm.sequences || []).length
      ? vm.sequences
      : (vm.variants || []).map(variant => ({
      id: `variant-${Number(variant.id).toString(16)}`,
      kind: variant.selection?.story_state
        ? "control-locked-story-sequence"
        : "controllable-scene-event-variant",
      entry_variant_id: Number(variant.id),
      entry_variant_id_hex: variant.id_hex,
      variant_ids: [Number(variant.id)],
      variant_ids_hex: [variant.id_hex],
      shots: [],
      shot_count: 1,
    }));
    if (vm.pagePrograms) return source;
    const signatures = new Set();
    return source.filter(sequence => {
      const signature = sequence.canonical_signature || [
        sequence.kind || "",
        ...(sequence.shots || []).map(shot => (
          `${shot.kind || "actor-list"}:${Number(shot.variant_id)}:${Number(shot.scene_id)}`
        )),
        ...(sequence.variant_ids || []).map(id => `variant:${Number(id)}`),
      ].join("|");
      if (signatures.has(signature)) return false;
      signatures.add(signature);
      return true;
    });
  }

  function storyVmAdvance(actor, command) {
    const advance = Number(command.normal_advance);
    if (!Number.isFinite(advance) || advance <= 0) {
      actor.ended = true;
      return false;
    }
    actor.cursor = (actor.cursor + advance) & 0xFF;
    return true;
  }

  function storyVmRelativeAdvance(actor, advance) {
    const value = Number(advance);
    if (!Number.isFinite(value) || value === 0) return false;
    actor.cursor = (actor.cursor + value) & 0xFF;
    return true;
  }

  function storyVmStage(context) {
    const tileSize = 16;
    return {
      tileSize,
      viewportWidth: 256,
      viewportHeight: 240,
      mapWidth: Math.max(tileSize, Number(context?.width || 16) * tileSize),
      mapHeight: Math.max(tileSize, Number(context?.height || 15) * tileSize),
    };
  }

  /**
   * Apply the ROM's $B5B8 actor-movement collision order to one target tile.
   * The terrain grids stay separate because $A93E checks the control lock only
   * after rejecting out-of-bounds attributes.
   */
  function storyVmTileBlockedFor({
    actor,
    tileX,
    tileY,
    controlLock,
    collisionModel,
    terrainRows,
    occupiedByPlayer = () => false,
    occupiedByActor = () => false,
    terrainPassable = () => false,
  }) {
    // $03CD,X & $10：穿透，完全不检查。
    if (Number(actor?.motionAttributes)
        & Number(collisionModel?.checks?.[0]?.mask ?? 0x10)) {
      return false;
    }
    const x = Math.round(tileX);
    const y = Math.round(tileY);
    // $0487 非 0（控制锁）时 $B5B8 跳过玩家与角色占位。
    if (!controlLock) {
      if (occupiedByPlayer(x, y)) return true;
      if (occupiedByActor(x, y)) return true;
    }
    const outOfBounds = terrainRows?.outOfBounds || null;
    if (!outOfBounds) return false;   // 该场景没有地形数据：不凭空造阻挡
    const row = outOfBounds[y];
    // $A93E：取格失败或属性 bit7 置位即越界阻挡；这一步不受控制锁影响。
    if (row === undefined || x < 0 || x >= row.length) return true;
    // 运行时场景交互已经替换过的格子必须覆盖静态包里的旧属性；帕鲁山洞的门
    // 原本正是 bit7 置位。坐标边界仍由上一行守住，不能把地图外部也变成通路。
    if (terrainPassable(x, y)) return false;
    if (row[x] === "1") return true;
    // $A93E 自己还有第二处 $0487 检查：成功取格后，控制锁非 0 直接通行。
    if (controlLock) return false;
    if (terrainRows?.attributeBlocked?.[y]?.[x] === "1") return true;
    // $0395,X ≥ $09 的角色不受 $B5B8 尾部那条额外地形闸门限制。
    const exempt = Number(collisionModel?.checks?.[4]?.at_least ?? 0x09);
    if (Number(actor?.actorType) >= exempt) return false;
    return terrainRows?.lowType?.[y]?.[x] === "1";
  }

  function buildStoryVmVariant(variant, runtimeOverrides = null, entryCheckpoint = null) {
    const execution = executeSceneActions(variant, runtimeOverrides, entryCheckpoint);
    let step = execution.next();
    while (!step.done) step = execution.next();
    return step.value;
  }

  function createSceneActionExecution(variant, runtimeOverrides = null, initialState = null) {
    const execution = executeSceneActions(variant, runtimeOverrides, null, {externalServices: true, initialState});
    let current = null;
    return {
      advance(response) {
        if (current?.status === "complete") return current;
        if (current?.status === "pending" && response?.status !== "available") return current;
        if (current?.continuation?.kind === "dialogue" && response.confirmed !== true) return current;
        const step = execution.next(response);
        current = step.done ? {status: "complete", result: step.value,
          state: step.value.frames.at(-1) || null, effects: []} : step.value;
        return current;
      },
      cancel() { execution.return(); },
    };
  }

  function* executeSceneActions(variant, runtimeOverrides = null, entryCheckpoint = null,
    {externalServices = false, initialState = null} = {}) {
    prepareStoryVmCompilation();
    const runtimeParty = runtimePartyConfiguration(runtimeOverrides);
    const overrideEventFlags = runtimeEventFlags(runtimeOverrides);
    const overrideCameraX = Number(runtimeOverrides?.cameraTileOriginX);
    const overrideCameraY = Number(runtimeOverrides?.cameraTileOriginY);
    const hasRuntimeCameraOverride = Number.isFinite(overrideCameraX)
      && Number.isFinite(overrideCameraY);
    const overridePlayerX = Number(runtimeOverrides?.playerMapX);
    const overridePlayerY = Number(runtimeOverrides?.playerMapY);
    const hasRuntimePlayerOverride = runtimeOverrides?.playerMapX !== null
      && runtimeOverrides?.playerMapX !== undefined
      && runtimeOverrides?.playerMapY !== null
      && runtimeOverrides?.playerMapY !== undefined
      && Number.isFinite(overridePlayerX)
      && Number.isFinite(overridePlayerY);
    const overridePlayerDirection = String(
      runtimeOverrides?.playerDirection || "",
    );
    const interactionTrigger = runtimeOverrides?.interactionTrigger || null;
    const interactionSignature = interactionTrigger
      ? `${Number(interactionTrigger.actor_record_id)}:${
        hex(Number(interactionTrigger.script_id), 2)}`
      : "none";
    const cacheKey = [
      `variant:${Number(variant.id)}`,
      hasRuntimeCameraOverride
        ? `camera:${overrideCameraX}:${overrideCameraY}` : "camera:published",
      hasRuntimePlayerOverride
        ? `player:${overridePlayerX}:${overridePlayerY}:${
          overridePlayerDirection || "published-direction"}`
        : "player:published",
      `party:${runtimePartySignature(runtimeParty)}`,
      `party-items:${runtimePartyItemSignature(runtimeOverrides)}`,
      `event-flags:${overrideEventFlags.join(",")}`,
      `interaction:${interactionSignature}`,
      `wait-assumptions:${JSON.stringify(runtimeOverrides?.waitAssumptions || [])}`,
      `preview-inputs:${JSON.stringify(runtimeOverrides?.previewFieldInputs ?? null)}`,
      `render-parity:${Number(runtimeOverrides?.renderFrameParityOffset ?? 0) & 1}`,
      `after-control:${Number(runtimeOverrides?.previewAfterControlFrames ?? 0)}`,
      `wander-random:${runtimeOverrides?.wanderRandomState ?? 0}:${runtimeOverrides?.randomSeed ?? 0}:${JSON.stringify(runtimeOverrides?.randomCallsPerFrame ?? [])}`,
      `preview-ui:${runtimeOverrides?.previewEntryWaitFrames ?? 0}:${JSON.stringify(runtimeOverrides?.previewUiInputs ?? [])}:${runtimeOverrides?.runtimeResultD5 ?? "default"}`,
      `independent-entry:${runtimeOverrides?.independentEntryActorListId ?? "none"}`,
      `entry-context:${JSON.stringify([variant.blocking_caller_entry?.preview_entry,
        variant.initial_event_flags,
        variant.initial_player_map_x, variant.initial_player_map_y,
        variant.initial_player_direction, variant.sequence_completion,
        variant.scene_reload_continuations,
        variant.camera_tile_origin_x, variant.camera_tile_origin_y,
        (variant.scene_contexts || []).map(context => [context.scene_id,
          context.camera_tile_origin_x, context.camera_tile_origin_y]),
        variant.preview_field_inputs])}`,
      `initialization:${Number(variant.initial_actor_ticks) || 0}`,
      `field-traversal:${JSON.stringify(variant.field_traversal)}:${["metatile-page", "metatile-set", "field-terrain-behavior-service"].map(id => db.fieldRevision(id)).join(":")}`,
    ].join("|");
    const cached = entryCheckpoint || externalServices ? null : storyVmCompilationCache.get(cacheKey);
    if (cached) return cached;
    const programs = storyVmProgramMap();
    const programForActor = actor => programs.get(
      `${String(actor.scriptKind || "autonomous")}:${Number(actor.scriptId)}`,
    ) || programs.get(Number(actor.scriptId));
    const semantics = storyVmSemanticsMap();
    const variants = new Map(
      storyVmAllActorLists().map(item => [Number(item.id), item]),
    );
    const control = storyBrowserVm().control_state_model || {};
    const modeContexts = new Map(
      (storyBrowserVm().story_mode_contexts?.entries || [])
        .map(item => [Number(item.story_state), item]),
    );
    const inputPolicy = storyBrowserVm().preview_input_policy || {};
    const inputInterval = Math.max(
      1,
      Number(inputPolicy.interval_frames) || 90,
    );
    const fieldMode = Number(control.field_mode ?? 1);
    const transitionProgramMode = Number(
      control.transition_program_mode ?? 2,
    );
    const sceneReloadMode = Number(control.scene_reload_mode ?? 3);
    const fieldRefreshMode = Number(control.field_refresh_mode ?? 4);
    const specialActorListBase = Number(control.special_actor_list_base ?? 0xEF);
    const sceneReloadClearedEventFlags = (
      control.scene_reload_cleared_event_flags || []
    ).map(Number);
    const directions = ["up", "down", "left", "right"];
    const vectors = {
      up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    };
    const expectsObservedControlSequence = candidate => Boolean(
      candidate?.expects_scripted_control_sequence
        || candidate?.bootstrap_control_lock,
    );
    const renderSlots = new Map();
    const initialPalettes = new Map();
    for (const source of variants.values()) {
      for (const record of source.actors || []) {
        const selector = Number(record.render_slot_selector);
        if (Number.isInteger(selector) && !renderSlots.has(selector)) {
          renderSlots.set(selector, {
            marker: Number(record.render_slot_marker),
            mode: record.initial_render_mode,
          });
        }
        const paletteKey = `${record.initial_render_mode}:${Number(
          record.actor_type,
        )}`;
        if (!initialPalettes.has(paletteKey)) {
          initialPalettes.set(paletteKey, Number(record.palette));
        }
      }
    }
    const decodeActorRecord = record => {
      if (record.currentRecord) return record;
      const original = Array.isArray(record.raw) ? record.raw.map(Number) : [];
      const raw = storyVmEffectiveBytes(record.record_prg, 6);
      const fromPublished = (published, decode) => {
        const value = Number(published);
        const decoded = Number(decode(raw));
        const originalDecoded = Number(decode(original));
        return Number.isFinite(value)
          ? value + decoded - originalDecoded
          : decoded;
      };
      const actorType = fromPublished(record.actor_type, bytes => bytes[0] >> 2);
      const directionIndex = fromPublished(
        record.direction_index,
        bytes => bytes[0] & 0x03,
      );
      const renderSlotSelector = fromPublished(
        record.render_slot_selector,
        bytes => bytes[3] & 0x03,
      );
      const renderSlot = renderSlots.get(renderSlotSelector);
      return {
        ...record,
        raw,
        actor_type: actorType,
        flags: fromPublished(record.flags, bytes => bytes[0] & 0x03),
        direction_index: directionIndex,
        direction: directionIndex === Number(record.direction_index)
          ? record.direction
          : directions[directionIndex] || record.direction || "down",
        x: fromPublished(record.x, bytes => bytes[1] & 0x3F),
        y: fromPublished(record.y, bytes => bytes[2] & 0x3F),
        direction_attributes: fromPublished(
          record.direction_attributes,
          bytes => (bytes[1] & 0xC0) | ((bytes[2] & 0xC0) >> 2),
        ),
        text_region: fromPublished(record.text_region, bytes => bytes[3] >> 2),
        render_slot_selector: renderSlotSelector,
        render_slot_marker: renderSlot?.marker ?? record.render_slot_marker,
        initial_render_mode: renderSlot?.mode ?? record.initial_render_mode,
        interaction_or_record_id: fromPublished(
          record.interaction_or_record_id,
          bytes => bytes[4],
        ),
        autonomous_script_id: fromPublished(
          record.autonomous_script_id,
          bytes => bytes[5],
        ),
      };
    };
    const instantiateActors = (source, fieldEntityCount = runtimeParty.slots.size) => (source.actors || []).map(sourceRecord => {
      const record = decodeActorRecord(sourceRecord);
      const renderMode = record.initial_render_mode || (
        Number(record.render_slot_marker) & 0x80
          ? "type-animation"
          : "direct-actor-frame"
      );
      const appearance = renderMode === "type-animation"
        ? actorAppearance(Number(record.actor_type), {
            entryPoint: "scene-object",
          })
        : null;
      const palette = appearance?.palette ?? initialPalettes.get(
        `${renderMode}:${Number(record.actor_type)}`,
      ) ?? record.palette;
      const partyMember = runtimeParty.members.find(member => (
        (member.storyActorType !== null && member.storyActorType !== undefined
          && Number(member.storyActorType) === Number(record.actor_type))
        || (renderMode === "direct-actor-frame"
          && member.deadFrameId !== null && member.deadFrameId !== undefined
          && Number(member.deadFrameId) === Number(record.actor_type))
      )) || null;
      const triggered = interactionTrigger
        && Number(record.record_id)
          === Number(interactionTrigger.actor_record_id);
      const scriptKind = triggered ? "interaction" : "autonomous";
      const pagePrograms = sourceRecord.pagePrograms || storyBrowserVm().pageBindings?.get(
        `scene-actor:${hex(source.id, 2).slice(2)}:${hex(record.record_id, 2).slice(2)}`,
      );
      const scriptId = triggered
        ? Number(pagePrograms?.interaction ?? record.interaction_or_record_id)
        : Number(pagePrograms?.autonomous ?? record.autonomous_script_id);
      const program = programs.get(`${scriptKind}:${scriptId}`)
        || programs.get(scriptId);
      return {
        actorSlot: Number(record.record_id),
        renderSlot: 16 - fieldEntityCount - source.actors.length + Number(record.record_id),
        partySlot: interactionTrigger ? null : partyMember?.slot ?? null,
        scriptKind,
        scriptId,
        interactionPreviewRoute: triggered
          ? storyVmInteractionPreviewRoute(program) : null,
        cursor: 0,
        x: Number(record.x),
        y: Number(record.y),
        actorType: Number(record.actor_type),
        palette: Math.max(0, Math.min(3, Number(palette) || 0)),
        direction: record.direction || directions[
          Math.max(0, Math.min(3, Number(record.direction_index) || 0))
        ] || "down",
        moveDirection: null,
        motionAttributes: Number(record.direction_attributes) || 0,
        screenOffsetX: 0,
        screenOffsetY: 0,
        renderMode,
        hidden: Number(record.x) >= 63 || Number(record.y) >= 63,
        ended: Boolean(interactionTrigger && (!triggered || scriptId === 0)),
        blocked: false,
        blockedReason: null,
        wait: 0,
        motion: null,
        commandTimers: {},
        screenEffect: {stepCounter: 0, roundCounter: 0},
        currentCommand: null,
      };
    });
    const applyActorType = (actor, actorType) => {
      actor.actorType = Math.max(0, Number(actorType) || 0);
      if (actor.renderMode !== "type-animation") return;
      const appearance = actorAppearance(actor.actorType, {
        entryPoint: "scene-object",
      });
      if (appearance) {
        actor.palette = Math.max(
          0,
          Math.min(3, Number(appearance.palette) || 0),
        );
      }
    };
    const applyDirectFrame = (actor, frameId) => {
      // Marker $44 bypasses the type->animation table and feeds a literal
      // id to bank $13:$9031's variable-grid packed-frame compositor.
      actor.actorType = Math.max(0, Number(frameId) || 0);
      actor.renderMode = "direct-actor-frame";
    };
    const applyGenericMetasprite = (actor, objectId) => {
      // Marker $04 selects the separate variable-size metasprite pointer table.
      // Opcode $32 uses this path for the doctor's $06/$07 electric frames.
      actor.actorType = Math.max(0, Number(objectId) || 0);
      actor.renderMode = "generic-metasprite";
    };
    let activeVariant = variant;
    let actors = instantiateActors(activeVariant);
    let interactionEntryFrame = null;
    let bootstrapEntryActor = null;
    let coordinateEntryFrame = null;
    if (!entryCheckpoint && !interactionTrigger
        && variant.entry_context?.trigger === "victory-and-coordinate-gated-autonomous-script") {
      const direction = overridePlayerDirection || variant.initial_player_direction;
      const vector = vectors[direction];
      if (vector) {
        const playerX = hasRuntimePlayerOverride ? overridePlayerX : variant.initial_player_map_x;
        const playerY = hasRuntimePlayerOverride ? overridePlayerY : variant.initial_player_map_y;
        const cameraX = hasRuntimeCameraOverride ? overrideCameraX : variant.camera_tile_origin_x;
        const cameraY = hasRuntimeCameraOverride ? overrideCameraY : variant.camera_tile_origin_y;
        const entryVariant = {...variant, initial_control_lock: 0, expects_scripted_control_sequence: false,
          bootstrap_control_lock: false, initial_actor_ticks: 6, sequence_completion: "ambient-preview"};
        const prelude = buildStoryVmVariant(entryVariant, {...runtimeOverrides,
          playerMapX: playerX - vector[0], playerMapY: playerY - vector[1],
          cameraTileOriginX: cameraX - vector[0], cameraTileOriginY: cameraY - vector[1],
          previewFieldInputs: [{direction, steps: 1}]}, snapshot => snapshot.controlLock !== 0);
        if (prelude.completion === "entry-checkpoint") {
          coordinateEntryFrame = prelude.frames.at(-1);
          for (const actor of actors) {
            const entry = coordinateEntryFrame.actors.find(item => item.actorSlot === actor.actorSlot);
            if (entry) Object.assign(actor, entry);
          }
        }
      }
    }
    if (!entryCheckpoint && !interactionTrigger && variant.initial_state_source?.kind === "rom-interaction-script") {
      const record = (variant.actors || []).map(decodeActorRecord).find(item =>
        item.interaction_or_record_id === Number(variant.initial_state_source.script_id));
      const program = programs.get(Number(record?.autonomous_script_id));
      if (program?.commands.some(command => semantics.get(Number(command.opcode))
          ?.operation === "step-toward-story-target")) {
        const entryVariant = {...variant, initial_control_lock: 0, expects_scripted_control_sequence: false, bootstrap_control_lock: false,
          initial_event_flags: [], sequence_completion: "ambient-preview"};
        const bootstrapFlags = storyInteractionBootstrapFlags(variant.id) || variant.initial_event_flags || [];
        const prelude = buildStoryVmVariant(entryVariant, {...runtimeOverrides,
          eventFlags: overrideEventFlags.filter(flag => !bootstrapFlags.includes(flag)),
          previewEntryWaitFrames: 0}, snapshot => {
          const target = snapshot.actors.find(actor => actor.actorSlot === Number(record.record_id));
          return target && !target.motion && !target.renderPose?.motion && target.currentCommand?.operation === "step-toward-story-target"
            && (target.x === snapshot.playerMapX || target.y === snapshot.playerMapY);
        });
        if (prelude.completion === "entry-checkpoint") {
          interactionEntryFrame = prelude.frames.at(-1);
          bootstrapEntryActor = interactionEntryFrame.actors.find(actor => actor.actorSlot === Number(record.record_id));
          for (const actor of actors) {
            const entry = interactionEntryFrame.actors.find(item => item.actorSlot === actor.actorSlot);
            if (entry) Object.assign(actor, entry);
          }
        }
      }
    }
    if (interactionTrigger) {
      const record = (variant.actors || []).map(decodeActorRecord).find(item => Number(item.record_id)
        === Number(interactionTrigger.actor_record_id));
      const autonomous = programs.get(Number(record?.autonomous_script_id));
      const contactPosition = actor => {
        if (!hasRuntimePlayerOverride) return false;
        const [dx, dy] = vectors[overridePlayerDirection || "up"] || [0, -1];
        const distance = dx ? (actor.x - overridePlayerX) / dx : (actor.y - overridePlayerY) / dy;
        return (distance === 1 || distance === 2)
          && actor.x === overridePlayerX + dx * distance
          && actor.y === overridePlayerY + dy * distance;
      };
      const lockedPrelude = autonomous?.commands.some(command => semantics.get(Number(command.opcode))
        ?.operation === "toggle-player-control-lock");
      const contactPrelude = record && !contactPosition(record) && hasRuntimePlayerOverride
        && autonomous?.commands.some(command => ["advance-wander-motion", "wander-inside-rectangle",
          "step-toward-story-target", "move-actor-to-position", "set-actor-position"].includes(semantics.get(Number(command.opcode))?.operation));
      if (lockedPrelude || contactPrelude) {
        const prelude = buildStoryVmVariant(variant, {...runtimeOverrides, interactionTrigger: null},
          snapshot => snapshot.variantId === variant.id && snapshot.controlLock === 0
            && snapshot.storyState === 0 && snapshot.actors.some(actor =>
              actor.actorSlot === Number(interactionTrigger.actor_record_id)
              && (lockedPrelude ? actor.ended && (actor.x !== record.x || actor.y !== record.y)
                : !actor.motion && contactPosition(actor))));
        // 交互镜头以同一角色表中自主移动后的目标位置为锚点。
        interactionEntryFrame = prelude.frames.find(snapshot => snapshot.variantId === variant.id
          && snapshot.controlLock === 0 && snapshot.storyState === 0
          && snapshot.actors.some(actor => actor.actorSlot === Number(interactionTrigger.actor_record_id)
            && (lockedPrelude ? actor.ended && (actor.x !== record.x || actor.y !== record.y)
              : !actor.motion && contactPosition(actor))));
        if (interactionEntryFrame) {
          for (const actor of actors) {
            const entry = interactionEntryFrame.actors.find(item => item.actorSlot === actor.actorSlot);
            if (!entry) continue;
            for (const key of ["x", "y", "actorType", "palette", "direction", "motionAttributes",
              "screenOffsetX", "screenOffsetY", "renderMode", "hidden"]) actor[key] = entry[key];
          }
        }
      }
    }
    const callerEntry = variant.blocking_caller_entry || null;
    const previewEntryCamera = STORY_PREVIEW_ENTRY_CAMERAS[Number(variant.id)];
    const callerPreview = callerEntry?.preview_entry || (callerEntry && previewEntryCamera
      ? {background_scene_id: previewEntryCamera.backgroundSceneId,
          scene_route_index: previewEntryCamera.sceneRouteIndex} : null);
    const initialStoryState = Number(
      callerEntry?.active_state ?? variant.selection?.story_state ?? 0,
    );
    const initialControlLock = Number(variant.initial_control_lock) || 0;
    const expectsScriptedControlSequence = expectsObservedControlSequence(variant);
    const startsControlLocked = initialStoryState !== 0
      || Boolean(callerEntry)
      || initialControlLock !== 0
      || expectsScriptedControlSequence;
    const requiresObservedControlSequence =
      expectsScriptedControlSequence && initialControlLock === 0;
    const controlReturnOwnsCompletion =
      !variant.sequence_completion
      || variant.sequence_completion
        === "balanced-control-lock-return-in-scene"
      || variant.sequence_completion === "scene-reload-chain-control-return";
    const encounterOwnsCompletion =
      variant.sequence_completion === "scripted-encounter-mode-owned";
    const sceneReloadOwnsCompletion =
      variant.sequence_completion === "scene-reload-transition-owned";
    // $0B is written only after the caller has loaded scene/list $F6.  It is
    // not one of the seven story-state scene-table indices.
    const initialModeContext = callerEntry
      ? null
      : modeContexts.get(initialStoryState) || null;
    let initialSceneContext = variant.scene_contexts?.find(
      context => Number(context.scene_id)
        === Number(callerEntry?.scene_id ?? variant.selection?.scene_id),
    ) || variant.scene_contexts?.[0] || null;
    let entryCamera = null;
    if (callerPreview?.background_scene_id != null) {
      initialSceneContext = variant.scene_contexts?.find(context => (
        Number(context.scene_id) === Number(callerPreview.background_scene_id)
      )) || initialSceneContext;
    }
    let interactionPlayer = null;
    const interactionActor = interactionTrigger && actors.find(
      actor => Number(actor.actorSlot) === Number(interactionTrigger.actor_record_id),
    );
    if (initialSceneContext && interactionActor
        && Number(interactionActor.x) < 63 && Number(interactionActor.y) < 63) {
      const playerX = hasRuntimePlayerOverride ? overridePlayerX : Number(interactionActor.x);
      const playerY = hasRuntimePlayerOverride ? overridePlayerY : Number(interactionActor.y) + 1;
      interactionPlayer = [playerX, playerY];
      entryCamera = fieldCameraOrigin(initialSceneContext.scene_id, playerX, playerY);
    } else if (initialSceneContext && hasRuntimePlayerOverride) {
      entryCamera = fieldCameraOrigin(initialSceneContext.scene_id, overridePlayerX, overridePlayerY);
    } else if (initialSceneContext && String(initialSceneContext.evidence).includes("coordinate-gate")
        && variant.initial_player_map_x != null && variant.initial_player_map_y != null) {
      entryCamera = fieldCameraOrigin(initialSceneContext.scene_id, variant.initial_player_map_x, variant.initial_player_map_y);
    } else {
      const observed = STORY_PREVIEW_ENTRY_CAMERAS[Number(variant.id)];
      if (observed) entryCamera = [observed.x, observed.y];
    }
    if (entryCamera) initialSceneContext = {
      ...initialSceneContext,
      camera_tile_origin_x: entryCamera[0],
      camera_tile_origin_y: entryCamera[1],
    };
    const hasInitialSceneCamera = (
      initialSceneContext?.camera_tile_origin_x !== null
      && initialSceneContext?.camera_tile_origin_x !== undefined
      && initialSceneContext?.camera_tile_origin_y !== null
      && initialSceneContext?.camera_tile_origin_y !== undefined
      && Number.isFinite(Number(initialSceneContext.camera_tile_origin_x))
      && Number.isFinite(Number(initialSceneContext.camera_tile_origin_y))
    );
    const initialPlayerX = hasRuntimePlayerOverride
      ? overridePlayerX : interactionPlayer?.[0] ?? variant.initial_player_map_x
        ?? (callerPreview && hasInitialSceneCamera ? initialSceneContext.camera_tile_origin_x + 8 : undefined);
    const initialPlayerY = hasRuntimePlayerOverride
      ? overridePlayerY : interactionPlayer?.[1] ?? variant.initial_player_map_y
        ?? (callerPreview && hasInitialSceneCamera ? initialSceneContext.camera_tile_origin_y + 7 : undefined);
    const playerPositionKnown = initialPlayerX !== null
      && initialPlayerX !== undefined
      && initialPlayerY !== null
      && initialPlayerY !== undefined
      && Number.isFinite(Number(initialPlayerX))
      && Number.isFinite(Number(initialPlayerY));
    // 已知场景入口是执行起点，剧情状态表不一定是第一帧：F5 会从场景入口
    // (4,5) 通过脚本输入走到状态表的 (-1,3)。运行时显式覆盖仍拥有最高优先级。
    const shared = {
      eventFlagWrites: [],
      eventFlags: new Set(runtimeOverrides?.eventFlags !== undefined ? overrideEventFlags : [
        ...(variant.selection?.kind === "scene-event-flag-variant"
          ? [Number(variant.selection.event_flag)]
          : []),
        ...(variant.initial_event_flags || []).map(Number),
        ...(interactionEntryFrame?.eventFlags || []),
        ...overrideEventFlags,
      ]),
      globalWait: Math.max(0, Number(runtimeOverrides?.previewEntryWaitFrames) || 0),
      resumeActorSlot: null,
      screenScrollOffsetY: 0,
      storyState: initialStoryState,
      mode: Number(callerEntry?.entry_paths?.find(path => (
        path.kind === "field-mode-dispatch"
      ))?.mode ?? fieldMode),
      actorListId: Number(variant.id),
      sceneId: Number(
        initialModeContext?.scene_id
          ?? callerEntry?.scene_id
          ?? variant.selection?.scene_id
          ?? variant.scene_contexts?.[0]?.scene_id
          ?? 0,
      ),
      cameraTileOriginX: Number(
        (hasRuntimeCameraOverride
          ? overrideCameraX
          : hasInitialSceneCamera
            ? initialSceneContext.camera_tile_origin_x
            : initialModeContext?.camera_tile_origin_x)
          ?? 0,
      ),
      cameraTileOriginY: Number(
        (hasRuntimeCameraOverride
          ? overrideCameraY
          : hasInitialSceneCamera
            ? initialSceneContext.camera_tile_origin_y
            : initialModeContext?.camera_tile_origin_y)
          ?? 0,
      ),
      cameraKnown: Boolean(
        hasRuntimeCameraOverride
        || initialModeContext
        || hasInitialSceneCamera,
      ),
      // 进场相机允许负原点，脚本移动不得按地图尺寸钳制。
      cameraUsesStoryCoordinates: Boolean(initialModeContext || hasInitialSceneCamera || hasRuntimeCameraOverride),
      transition: null,
      parameters: callerPreview?.scene_route_index != null
        ? {sceneRouteIndex: Number(callerPreview.scene_route_index)} : {},
      controlLock: initialControlLock,
      controlSequenceStarted: !requiresObservedControlSequence,
      scriptedInput: 0,
      controlReturnGuard: 0,
      playerMapX: Number(initialPlayerX ?? 0),
      playerMapY: Number(initialPlayerY ?? 0),
      playerPositionKnown,
      playerDirection: (
        hasRuntimePlayerOverride && overridePlayerDirection
          ? overridePlayerDirection
          : variant.initial_player_direction
      ) || (interactionPlayer ? "up" : "down"),
      runtimeResultD5: Number(runtimeOverrides?.runtimeResultD5
        ?? variant.initial_runtime_result_d5 ?? 0),
      // Standalone previews have no save-file party snapshot.  The workbench
      // supplies an explicit preview composition; absent UI overrides use the
      // role asset's `present` values (normally protagonist only).
      runtimePartySlots: new Set(runtimeParty.slots),
      runtimePartyActorTypes: new Set(runtimeParty.runtimeActorTypes),
      runtimePlayerActorType: Number(
        runtimeOverrides?.runtimePlayerActorType ?? 0x1D,
      ),
      partyMembers: runtimeParty.members.map(member => ({...member})),
      partyInventories: Array.from({length: 3}, (_, slot) => Array.from(
        {length: 8}, (_, index) => Number(runtimeOverrides?.partyInventories?.[slot]?.[index]
          ?? runtimeParty.members.find(member => member.slot === slot)?.inventory?.[index] ?? 0) & 0xFF)),
      partyEquipment: Array.from({length: 3}, (_, slot) => Array.from(
        {length: 8}, (_, index) => Number(runtimeOverrides?.partyEquipment?.[slot]?.[index]
          ?? runtimeParty.members.find(member => member.slot === slot)?.equipment?.[index] ?? 0) & 0xFF)),
      partyMoney: Number(runtimeOverrides?.partyMoney
        ?? readProject()?.game_data?.characters?.rom_initial?.gold?.value ?? 0),
      fieldUiTarget: Number(runtimeOverrides?.fieldUiTarget ?? 0xFF),
      selectedVehicleSlot: Number(runtimeOverrides?.selectedVehicleSlot ?? 0) & 7,
      vehicles: Array.from({length: 8}, (_, slot) => {
        const preset = readProject()?.game_data?.vehicles?.presets?.find(item => item.vehicle_slot === slot);
        const override = runtimeOverrides?.vehicles?.[slot];
        const row = source => Array.from({length: 8}, (_, index) => Number(source?.[index] ?? 0));
        return {slot, inventory: row(override?.inventory),
          equipmentCargo: row(override?.equipmentCargo),
          equipment: row(override?.equipment ?? preset?.loadout?.map(item => item.item_id)),
          remainingWeight: Number(override?.remainingWeight ?? preset?.initial_weight?.remaining_internal_units ?? 0),
          parked: override?.parked ? {...override.parked} : null};
      }),
      fieldEntities: [],
      temporaryEntities: [],
      fieldEntityCount: runtimeParty.slots.size,
      temporaryEntityValue: 0xFF,
      partyItemEvents: [],
      fieldTiles: new Map(),
      fieldPassableTiles: new Set(),
      activeDialogue: null,
      audioState: initialStoryAudioState(),
      pendingAudioEvents: [],
      battleEntry: null,
    };
    if (bootstrapEntryActor && !overridePlayerDirection) {
      shared.playerDirection = bootstrapEntryActor.x === shared.playerMapX
        ? bootstrapEntryActor.y < shared.playerMapY ? "up" : "down"
        : bootstrapEntryActor.x < shared.playerMapX ? "left" : "right";
    }
    const rebuildFieldEntities = () => {
      const previous = shared.fieldEntities;
      const order = storyFieldPartyOrder(shared.partyMembers, shared.runtimePartySlots);
      shared.fieldEntities = Array.from({length: 4}, (_, index) => {
        const slot = order[index] ?? null;
        const member = shared.partyMembers.find(item => item.slot === slot);
        const vehicleType = member?.ridingVehicle
          ? db.peekDocument("vehicle-visual-selector", null)?.map_actor_types
            ?.find(row => Number(row.id) === Number(member.vehicleSlot))?.actor_type : null;
        const actorType = vehicleType ?? (member?.status === 0xFF
          ? member.deadFrameId : member?.storyActorType ?? 0);
        const appearance = vehicleType == null ? null : actorAppearance(actorType,
          {entryPoint: "scene-object"});
        const position = runtimeOverrides?.fieldPartyPositions?.[index];
        const existing = previous[index];
        return {...existing, actorSlot: `party:${slot}`, partySlot: slot, fieldEntityIndex: index,
          x: existing?.x ?? Number(position?.x ?? shared.playerMapX),
          y: existing?.y ?? Number(position?.y ?? shared.playerMapY),
          direction: existing?.direction ?? position?.direction ?? shared.playerDirection,
          moveDirectionCode: existing?.moveDirectionCode ?? position?.moveDirectionCode ?? 0,
          actorType,
          palette: appearance?.palette ?? member?.palette ?? 0,
          renderMode: member?.status === 0xFF ? "direct-actor-frame" : "type-animation",
          hidden: slot === null, runtimePartyEntity: true, positionEvidence: "rom-field-entity-state"};
      });
      shared.fieldEntityCount = order.length + shared.temporaryEntities.length;
    };
    rebuildFieldEntities();
    const fieldEntryFrame = coordinateEntryFrame || interactionEntryFrame;
    if (coordinateEntryFrame) shared.controlLock = coordinateEntryFrame.controlLock;
    if (fieldEntryFrame && !runtimeOverrides?.fieldPartyPositions && fieldEntryFrame.cameraKnown
        && fieldEntryFrame.playerMapX === shared.playerMapX && fieldEntryFrame.playerMapY === shared.playerMapY) {
      for (let index = 0; index < shared.fieldEntities.length; index += 1) {
        const position = fieldEntryFrame.fieldPartyPositions[index];
        if (position) Object.assign(shared.fieldEntities[index], position);
      }
      if (interactionEntryFrame && !coordinateEntryFrame && !shared.fieldEntities[0].motion)
        shared.fieldEntities[0].direction = shared.playerDirection;
    }
    const fieldMotionEntities = () => shared.fieldEntities.map(entity => (
      shared.temporaryEntities.find(temporary => temporary.fieldEntityIndex === entity.fieldEntityIndex) || entity
    ));
    const fieldInputs = (runtimeOverrides?.previewFieldInputs ?? variant.preview_field_inputs ?? [])
      .map(input => ({...input}));
    const fieldTraversal = variant.field_traversal || null;
    // PRG $034038–$034042 在场景就绪前推进六次角色更新。
    const freshAutonomousEntry = variant.initial_state_source?.kind
      === "rom-autonomous-control-flow-constraints" && !interactionTrigger;
    let initialActorTicks = Number(fieldTraversal?.initial_actor_ticks || variant.initial_actor_ticks
      || (callerEntry || freshAutonomousEntry ? 6 : 0));
    const paletteRuntime = db.peekResourceDocument("palette-runtime-service", null);
    const brightness = paletteRuntime?.records?.find(record =>
      record.id === "palette-runtime-service.brightness-step-tables")?.values;
    const fadeInDecrements = brightness
      ? [brightness[0], brightness[0], brightness[7], brightness[7],
        brightness[6], brightness[6], brightness[5], brightness[5], 0] : null;
    let fieldPresentation = null;
    let encounterPresentation = null;
    let presentationCompletion = null;
    let terrainStep = null;
    let fieldDriver = null;
    const advanceTerrainTraversal = () => {
      if (!fieldTraversal || shared.transition || !shared.controlLock) return;
      const document = db.peekResourceDocument(recordUid("scene", shared.sceneId), null);
      const scene = document?.scene || document;
      if (!scene) throw new TypeError("剧情地形移动缺少场景正文");
      if (!terrainStep) {
        const tile = sceneMapCell(scene, shared.playerMapX, shared.playerMapY)?.metatileId;
        const attributes = sceneMetatileAttributeRecords(scene, {
          pages: db.peekResourceDocument("metatile-page", null),
          sets: db.peekResourceDocument("metatile-set", null),
        }).flatMap(record => record.metatile_attributes || record.metatile_attribute_page || []);
        const behaviorCode = metatileBehaviorCode(attributes[tile]);
        const motion = fieldTerrainMotion(db.peekResourceDocument("field-terrain-behavior-service", null),
          behaviorCode, sceneFieldChrAnimation(scene)?.initialStep ?? 0);
        if (!motion) {
          completion = "blocked-on-field-terrain";
          return;
        }
        const direction = directions[motion.directionCode - 1];
        const vector = vectors[direction];
        const duration = Number(storyBrowserVm().collision_model?.motion_timer_value || 32)
          / (1 << motion.speedIndex);
        terrainStep = {elapsed: 0, duration, x: shared.playerMapX, y: shared.playerMapY,
          cameraX: shared.cameraTileOriginX, cameraY: shared.cameraTileOriginY, vector};
        beginStoryFieldStep(fieldMotionEntities(), shared.playerMapX + vector[0],
          shared.playerMapY + vector[1], direction, duration);
        for (const entity of fieldMotionEntities()) if (entity.motion) entity.motion.animate = false;
        // $0487 跳过朝向更新；$7F bit7 使队伍与战车保持静止步态。
        for (const entity of fieldMotionEntities()) entity.direction = shared.playerDirection;
        fieldDriver = {kind: "terrain-motion", owner: "field-terrain-behavior-service",
          behaviorCode, direction, duration, transported: motion.transported,
          x: terrainStep.x, y: terrainStep.y};
      }
      advanceStoryFieldStep(fieldMotionEntities());
      const progress = ++terrainStep.elapsed / terrainStep.duration;
      shared.playerMapX = terrainStep.x + terrainStep.vector[0] * progress;
      shared.playerMapY = terrainStep.y + terrainStep.vector[1] * progress;
      shared.cameraTileOriginX = terrainStep.cameraX + terrainStep.vector[0] * progress;
      shared.cameraTileOriginY = terrainStep.cameraY + terrainStep.vector[1] * progress;
      if (progress < 1) return;
      terrainStep = null;
      const transition = document?.logic?.layers?.transitions?.point_transitions?.find(row =>
        Number(row.x) === shared.playerMapX && Number(row.y) === shared.playerMapY);
      if (!transition) return;
      const [x, y] = fieldCameraOrigin(transition.destination_scene_id,
        transition.destination_x, transition.destination_y);
      fieldDriver = {kind: "scene-transition", owner: "scene-transition-runtime",
        sourceSceneId: shared.sceneId, transitionId: transition.id,
        sourceX: transition.x, sourceY: transition.y,
        coordinateSource: transition.coordinate_source, targetSource: transition.source,
        destinationSceneId: transition.destination_scene_id,
        destinationX: transition.destination_x, destinationY: transition.destination_y};
      requestTransition(sceneReloadMode, 0, "field-terrain-scene-transition",
        {sceneId: transition.destination_scene_id, cameraTileOriginX: x, cameraTileOriginY: y});
    };
    let fieldInputIndex = 0;
    let fieldInputStep = coordinateEntryFrame?.fieldInputStep
      ? structuredClone(coordinateEntryFrame.fieldInputStep) : null;
    let previewCameraPosition = coordinateEntryFrame ? {
      x: coordinateEntryFrame.fieldCameraTileOriginX,
      y: coordinateEntryFrame.fieldCameraTileOriginY,
    } : null;
    let previewControlReleased = false;
    const advancePreviewFieldInput = () => {
      const input = fieldInputs[fieldInputIndex];
      if (shared.activeDialogue || shared.transition) return;
      if (!fieldInputStep) {
        if (!input || Number(input.steps) <= 0 || shared.controlLock) return;
        if (input.wait_for_release && !previewControlReleased) return;
        if ((input.wait_event_flags || []).some(flag => !shared.eventFlags.has(Number(flag)))) return;
        const vector = vectors[input.direction];
        if (!vector) throw new TypeError("剧情预览按键方向无效");
        shared.playerDirection = input.direction;
        if (tileBlockedFor({actorType: shared.runtimePlayerActorType, motionAttributes: 0},
          shared.playerMapX + vector[0], shared.playerMapY + vector[1])) return;
        const duration = Number(storyBrowserVm().camera_model?.preview_pan_interval_frames || 32);
        fieldInputStep = {elapsed: 0, duration, x: shared.playerMapX, y: shared.playerMapY,
          cameraX: shared.cameraTileOriginX, cameraY: shared.cameraTileOriginY, vector,
          direction: input.direction};
        beginStoryFieldStep(fieldMotionEntities(), shared.playerMapX + vector[0],
          shared.playerMapY + vector[1], input.direction, duration);
        // PRG $07D8EC 在格步开始时提交坐标，控制锁不截断已开始的格步。
        shared.playerMapX += vector[0];
        shared.playerMapY += vector[1];
        shared.cameraTileOriginX += vector[0];
        shared.cameraTileOriginY += vector[1];
      }
      advanceStoryFieldStep(fieldMotionEntities());
      const progress = ++fieldInputStep.elapsed / fieldInputStep.duration;
      previewCameraPosition = {
        x: fieldInputStep.cameraX + fieldInputStep.vector[0] * progress,
        y: fieldInputStep.cameraY + fieldInputStep.vector[1] * progress,
      };
      shared.playerDirection = fieldInputStep.direction;
      if (progress === 1) {
        if (input) {
          input.steps -= 1;
          if (!input.steps) fieldInputIndex += 1;
        }
        fieldInputStep = null;
      }
    };
    let retainedSceneContext = null;
    const activeSceneContext = () => {
      if (retainedSceneContext) return retainedSceneContext;
      if (callerEntry && activeVariant === variant
          && shared.sceneId === Number(callerEntry.scene_id)) {
        return initialSceneContext;
      }
      if (activeVariant === variant
          && Number(initialSceneContext?.scene_id) === shared.sceneId) {
        return initialSceneContext;
      }
      return (activeVariant.scene_contexts || []).find(
        context => Number(context.scene_id) === shared.sceneId,
      ) || activeVariant.scene_contexts?.[0] || null;
    };
    const isControlReturned = () => {
      const storyStateActive = shared.storyState > 0
        && shared.storyState < 0x80;
      const encounterReturned = (encounterOwnsCompletion || sceneReloadOwnsCompletion)
        && shared.parameters.completedEncounterEventFlag !== undefined
        && !storyStateActive;
      const pendingVictoryCleanup = shared.parameters.victoryCallback === "reload"
        && actors.some(actor => !actor.ended && !actor.blocked
          && semantics.get(programForActor(actor)?.commands?.find(
            command => Number(command.cursor) === actor.cursor)?.opcode)?.operation === "remove-actor");
      return startsControlLocked
        && shared.controlSequenceStarted
        && (
          (controlReturnOwnsCompletion && shared.storyState === 0)
          || encounterReturned
        )
        && shared.controlLock === 0
        && shared.mode === fieldMode
        && shared.controlReturnGuard <= 0
        && shared.globalWait <= 0
        && !pendingVictoryCleanup;
    };
    const isDedicatedModeReached = () => actors.some(actor =>
      String(actor.blockedReason || "").startsWith(
        "dedicated-field-mode-",
      )
    );
    const requestTransition = (
      mode,
      storyState,
      operation,
      targetSceneContext = null,
      targetVariantId = null,
      options = {},
    ) => {
      // PRG $0357DF 设置 $9C=$28，$07D15E–$07D16E 逐 NMI 交替背景灰阶。
      if (operation === "start-scripted-encounter") encounterPresentation = {tick: 0, duration: 0x28};
      shared.mode = mode;
      shared.storyState = storyState;
      shared.transition = {
        mode,
        storyState,
        operation,
        targetSceneContext,
        targetVariantId,
        ticks: 1,
        ...options,
      };
    };
    const settleTransition = () => {
      if (!shared.transition) return null;
      shared.transition.ticks -= 1;
      if (shared.transition.ticks > 0) return null;
      const settledOperation = shared.transition.operation;
      const victoryCallback = shared.transition.victoryCallback;
      const targetStoryState = victoryCallback === "reload"
        ? 0 : Number(shared.transition.storyState);
      const targetSceneContext = shared.transition.targetSceneContext;
      const targetVariantId = shared.transition.targetVariantId;
      const preserveActorScripts = Boolean(
        shared.transition.preserveActorScripts,
      );
      const completedEventFlag = shared.transition.completedEventFlag;
      if (settledOperation !== "clear-story-state-and-mode") {
        if (!fadeInDecrements) throw new TypeError("场景渐显缺少亮度减量字段");
        // $D073 关显示；场景装载与六次角色初始化后，$E06B 逐两帧渐显。
        fieldPresentation = {tick: 0, operation: settledOperation};
        initialActorTicks = preserveActorScripts ? 0 : 6;
        fieldMovementBusy = true;
        if ((fieldTraversal && settledOperation === "field-terrain-scene-transition")
            || (sceneReloadOwnsCompletion && settledOperation === "end-story-state-with-scene-context"
              && shared.parameters.completedEncounterEventFlag === undefined)) {
          presentationCompletion = "control-returned";
        }
      }
      // The common scene initialiser at $A006 clears $0441.  Opcodes $04/$05
      // address that byte as flags 0..7, so those actor-synchronisation flags do
      // not survive a story scene reload.  Keeping them made scene F1 skip its
      // opening movement because flag 0 was still set by F0.
      if (victoryCallback !== "resume") for (const flag of sceneReloadClearedEventFlags)
        shared.eventFlags.delete(flag);
      // Opcode $37 stores its second operand in $0482.  The omitted encounter
      // subsystem sets that completion flag before either resuming the current
      // script at its rendezvous or reloading the scene's actor list.
      if (completedEventFlag !== null
          && completedEventFlag !== undefined) {
        shared.eventFlags.add(Number(completedEventFlag));
        shared.eventFlagWrites.push({flagId: Number(completedEventFlag),
          operation: "set-after-victory", frame: frames.length});
        if (settledOperation === "start-scripted-encounter") {
          shared.parameters.completedEncounterEventFlag = Number(
            completedEventFlag,
          );
          if (victoryCallback) shared.parameters.victoryCallback = victoryCallback;
        }
      }
      shared.mode = fieldMode;
      if (victoryCallback === "reload") shared.storyState = 0;
      shared.transition = null;
      // 原地续演保留场景交互，场景重载清除临时地图改动。
      if (settledOperation !== "start-scripted-encounter" || victoryCallback === "reload") {
        retainedSceneContext = null;
        shared.fieldTiles.clear();
        shared.fieldPassableTiles.clear();
      }
      shared.battleEntry = null;
      if (victoryCallback !== "resume") {
        shared.controlLock = 0;
        shared.scriptedInput = 0;
      }
      // PRG $035F17 恢复场景 CHR，专用调用方的 $1B 覆盖随操控归还失效。
      if (callerEntry && settledOperation === "clear-story-state-and-mode") {
        delete shared.parameters.spritePair;
      }
      if (targetSceneContext) {
        scriptedFieldStep = null;
        scriptedCameraPosition = null;
        previewCameraPosition = null;
        fieldInputStep = null;
        delete shared.parameters.spritePair;
        shared.sceneId = Number(targetSceneContext.sceneId);
        shared.cameraTileOriginX = Number(
          targetSceneContext.cameraTileOriginX,
        );
        shared.cameraTileOriginY = Number(
          targetSceneContext.cameraTileOriginY,
        );
        shared.cameraKnown = true;
        shared.cameraUsesStoryCoordinates = true;
        if (["end-story-state-with-scene-context", "field-terrain-scene-transition", "scripted-input-scene-transition"].includes(settledOperation)) {
          // 场景加载按相机锚点 (8,7) 放置队伍。
          shared.playerMapX = shared.cameraTileOriginX + 8;
          shared.playerMapY = shared.cameraTileOriginY + 7;
          shared.playerPositionKnown = true;
        }
      }
      if (victoryCallback === "reload" || (targetSceneContext && !preserveActorScripts)) {
        // PRG $034053–$034074 在场景加载时把队伍叠放到镜头锚点并复制领队朝向。
        for (const entity of shared.fieldEntities) {
          entity.x = shared.cameraTileOriginX + 8;
          entity.y = shared.cameraTileOriginY + 7;
          entity.motion = null;
          entity.direction = shared.fieldEntities[0]?.direction ?? shared.playerDirection;
          entity.moveDirectionCode = 0;
          entity.moveDirection = null;
        }
        rebuildFieldEntities();
      }
      if (preserveActorScripts) {
        return settledOperation;
      }
      if (targetStoryState > 0 && targetStoryState < 0x80) {
        const targetId = specialActorListBase + targetStoryState;
        const target = variants.get(targetId);
        if (target) {
          const modeContext = modeContexts.get(targetStoryState) || null;
          activeVariant = target;
          actors = instantiateActors(activeVariant, shared.fieldEntityCount);
          shared.actorListId = targetId;
          if (modeContext) {
            shared.sceneId = Number(modeContext.scene_id);
            shared.cameraTileOriginX = Number(
              modeContext.camera_tile_origin_x,
            );
            shared.cameraTileOriginY = Number(
              modeContext.camera_tile_origin_y,
            );
            shared.cameraKnown = true;
            shared.cameraUsesStoryCoordinates = true;
          }
          return settledOperation;
        }
      }
      if (targetVariantId !== null) {
        const target = variants.get(Number(targetVariantId));
        if (target) {
          activeVariant = target;
          actors = instantiateActors(activeVariant, shared.fieldEntityCount);
          shared.actorListId = Number(target.id);
          if (expectsObservedControlSequence(target)) {
            shared.controlSequenceStarted = false;
          }
          const context = target.scene_contexts?.[0] || null;
          if (context && !targetSceneContext) {
            shared.sceneId = Number(context.scene_id);
            shared.cameraTileOriginX = Number(
              context.camera_tile_origin_x ?? 0,
            );
            shared.cameraTileOriginY = Number(
              context.camera_tile_origin_y ?? 0,
            );
            shared.cameraKnown = Number.isFinite(
              Number(context.camera_tile_origin_x),
            );
          }
          shared.controlReturnGuard = expectsObservedControlSequence(target)
            ? 2
            : 1;
          return settledOperation;
        }
      }
      // PRG $0346DB 从高表项向低表项检查场景与事件位。
      const eventTarget = [...variants.values()].reverse().find(candidate =>
        candidate.selection?.kind === "scene-event-flag-variant"
        && Number(candidate.selection.scene_id) === shared.sceneId
        && shared.eventFlags.has(Number(candidate.selection.event_flag)));
      if (eventTarget) {
        activeVariant = eventTarget;
        actors = instantiateActors(activeVariant, shared.fieldEntityCount);
        shared.actorListId = Number(eventTarget.id);
        shared.controlReturnGuard = 2;
        return settledOperation;
      }
      let ordinaryTarget = variants.get(shared.sceneId);
      if (!ordinaryTarget && settledOperation !== "clear-story-state-and-mode") {
        const records = readProject()?.story_scene_actor_edits?.records
          ?.filter(record => Number(record.entry_id) === shared.sceneId) || [];
        if (records.length) ordinaryTarget = {
          id: shared.sceneId,
          selection: {kind: "ordinary-control-locked-continuation", scene_id: shared.sceneId},
          scene_contexts: [{scene_id: shared.sceneId,
            camera_tile_origin_x: shared.cameraTileOriginX,
            camera_tile_origin_y: shared.cameraTileOriginY}],
          actors: records.map(record => ({...record, currentRecord: true,
            record_id: record.id, record_prg: record.source.offset,
            direction_index: record.direction,
            direction: directions[record.direction],
            render_slot_selector: record.render_slot_marker,
            render_slot_marker: renderSlots.get(record.render_slot_marker)?.marker,
            initial_render_mode: renderSlots.get(record.render_slot_marker)?.mode})),
        };
      }
      if (ordinaryTarget && ordinaryTarget.id === runtimeOverrides?.independentEntryActorListId) {
        actors.forEach(actor => {actor.ended = true;});
        shared.controlReturnGuard = 0;
        return settledOperation;
      }
      if (ordinaryTarget && [
        "ordinary-control-locked-continuation",
        "extended-logical-story-index",
      ].includes(ordinaryTarget.selection?.kind)) {
        activeVariant = ordinaryTarget;
        actors = instantiateActors(activeVariant, shared.fieldEntityCount);
        shared.actorListId = Number(ordinaryTarget.id);
        const reloadEntry = variant.scene_reload_continuations?.find(
          entry => Number(entry.scene_id) === shared.sceneId,
        );
        // 场景加载清锁后，入口声明决定是否等待新角色脚本的锁定周期。
        const waitForControl = reloadEntry?.wait_for_control_lock
          ?? expectsObservedControlSequence(ordinaryTarget);
        if (waitForControl || victoryCallback === "reload") {
          shared.controlSequenceStarted = false;
        }
        shared.controlReturnGuard =
          victoryCallback === "reload" ? 1 : waitForControl ? 2
            : Math.max(1, Number(reloadEntry?.initialization_frames) || 1);
        return settledOperation;
      }
      shared.actorListId = callerEntry && settledOperation === "clear-story-state-and-mode"
        ? shared.sceneId : 0;
      shared.controlReturnGuard = 1;
      return settledOperation;
    };
    const effectiveCommandOperands = new WeakMap();
    const commandOperands = command => {
      let values = effectiveCommandOperands.get(command);
      if (!values) {
        values = command.currentOperands || storyVmEffectiveBytes(
          Number(command.prg_offset) + 1,
          (command.operands || []).length,
        );
        effectiveCommandOperands.set(command, values);
      }
      return values;
    };
    const followInteractionPreviewRoute = (actor, command) => {
      const target = actor.interactionPreviewRoute?.get(Number(command.cursor));
      if (!Number.isInteger(target)) return false;
      actor.cursor = target;
      return true;
    };
    const operand = (command, index, fallback = 0) => {
      const value = Number(commandOperands(command)[Number(index)]);
      return Number.isFinite(value) ? value : fallback;
    };
    const effectiveBlockingUi = storyVmBlockingUiResolver(
      programs,
      commandOperands,
    );
    const investigationBits = new Set(runtimeOverrides?.investigationBits || []);
    let choiceIndex = 0;
    let serviceIndex = 0;
    let resolvedRuntimeResult = runtimeOverrides?.runtimeResultD5 !== undefined;
    let dialogueQueue = [];
    const previewUiInput = (regionId, recordId) => {
      const occurrence = uiAutoInputs.filter(input => input.regionId === regionId
        && input.recordId === recordId).length;
      return runtimeOverrides?.previewUiInputs?.find(input => Number(input.regionId) === regionId
        && Number(input.recordId) === recordId && Number(input.occurrence ?? 0) === occurrence);
    };
    const nextChoice = ({regionId, recordId}) => {
      const value = runtimeOverrides?.choices?.[choiceIndex++]
        ?? previewUiInput(regionId, recordId)?.resultD5 ?? (shared.runtimeResultD5 === 1 ? 1 : 0);
      return Number(value);
    };
    const startDialogue = (blockingUi, source, frame) => {
      const pageBreaks = Math.max(0, Number(blockingUi.page_breaks) || 0);
      const autoPresses = Math.max(1,
        Number(inputPolicy.initial_text_accelerate_presses ?? 1)
        + (pageBreaks + 1) * Number(inputPolicy.confirmation_presses_per_page_or_end ?? 1));
      shared.globalWait = Math.max(1, autoPresses * inputInterval);
      const uiInput = previewUiInput(Number(blockingUi.region_id), Number(blockingUi.record_id));
      if (Number.isFinite(uiInput?.waitFrames)) shared.globalWait = Math.max(1, Number(uiInput.waitFrames));
      if (pendingUiCommand) pendingUiCommand.resultD5 = uiInput?.resultD5;
      shared.activeDialogue = {
        operation: source.operation,
        prefixRecordId: source.prefixRecordId,
        interactionWindow: source.interactionWindow,
        regionId: Number(blockingUi.region_id ?? -1),
        recordId: Number(blockingUi.record_id ?? -1),
        recordFound: blockingUi.record_found !== false,
        sourceVariantId: source.sourceVariantId,
        actorSlot: source.actorSlot,
        scriptId: source.scriptId,
        commandCursor: source.commandCursor,
        opcode: source.opcode,
        pages: blockingUi.pages || [],
        text: blockingUi.text || "",
        pageBreaks,
        totalWaitFrames: shared.globalWait,
        inputInterval,
        initialAcceleratePresses: Number(inputPolicy.initial_text_accelerate_presses ?? 1),
        ...(blockingUi.choices?.length ? {choices: blockingUi.choices} : {}),
      };
      uiAutoInputs.push({frame, regionId: shared.activeDialogue.regionId,
        recordId: shared.activeDialogue.recordId, pageBreaks, presses: autoPresses,
        waitFrames: shared.globalWait, sourceVariantId: source.sourceVariantId,
        actorSlot: source.actorSlot, scriptId: source.scriptId,
        commandCursor: source.commandCursor, opcode: source.opcode});
    };
    const effectiveAudioEvent = (command, commandId, actor) => ({
      ...(command.audio_event || {}),
      id: command.audio_event?.id || `story-script-${Number(actor.scriptId)
        .toString(16).padStart(2, "0")}-cursor-${Number(actor.cursor)
        .toString(16).padStart(2, "0")}-audio`,
      role: commandId >= 0xF0 ? "fade-control" : "sound-command",
      command_id: commandId,
      command_id_hex: hex(commandId, 2),
      resource_id: `${commandId >= 0xF0
        ? "audio-control" : "audio-command"}:${Number(commandId)
        .toString(16).toUpperCase().padStart(2, "0")}`,
      dispatch: command.audio_event?.dispatch
        || "story-opcode-1d-direct-audio-command",
      instruction_prg_offset: Number(command.prg_offset),
      instruction_prg_offset_hex: command.prg_offset_hex,
      raw: [Number(command.opcode), commandId],
      raw_hex: [Number(command.opcode), commandId]
        .map(value => (Number(value) & 0xFF)
          .toString(16).toUpperCase().padStart(2, "0"))
        .join(" "),
    });
    // ROM 里所有角色移动都走 $B5B8，碰撞判定就在那里，因此这里做一次即可覆盖
    // 全部调用点。判定顺序照抄 $B5B8：穿透标志 → 玩家/角色占位 → 地形取格 →
    // 角色类型豁免 → 地形属性。顺序不能重排，先豁免和先判地形结果不同。
    const collision = storyBrowserVm().collision_model || {};
    const terrainRows = () => {
      const context = activeSceneContext();
      return {
        outOfBounds: context?.terrain_out_of_bounds_rows || null,
        attributeBlocked: context?.terrain_attribute_blocked_rows || null,
        lowType: context?.low_type_blocked_rows || null,
      };
    };
    // $A90F：自 $0D 向下扫全部角色槽，$0395,X 置了 bit7 的槽跳过；有活动角色
    // 占住目标格就带进位返回。当前角色站在自己格上、不在目标格，因此 ROM 没有
    // 排除自身，这里也不排除。
    const occupiedByActor = (tileX, tileY) => actors.some(other => {
      if (other.ended || other.hidden) return false;
      if (Number(other.actorType) & 0x80) return false;
      return Math.round(other.x) === tileX && Math.round(other.y) === tileY;
    });
    // $A929：扫 $0357,X/$035B,X 的剧情队列，X 自 $64 递减到 1（BNE 排除了 0）。
    // VM 把这条队列并进同一份角色列表，另外单独模型化了玩家格坐标。
    const occupiedByPlayer = (tileX, tileY) => (
      Math.round(shared.playerMapX) === tileX
      && Math.round(shared.playerMapY) === tileY
    );
    const tileBlockedFor = (actor, tileX, tileY) => {
      return storyVmTileBlockedFor({
        actor,
        tileX,
        tileY,
        controlLock: shared.controlLock,
        collisionModel: collision,
        terrainRows: terrainRows(),
        occupiedByPlayer,
        occupiedByActor,
        terrainPassable: (x, y) => shared.fieldPassableTiles.has(
          `${shared.sceneId}:${x}:${y}`,
        ),
      });
    };
    // $D8EC：$62 += deltaX[$6B]、$63 += deltaY[$6B]。增量表由构建期从 ROM 的
    // 共用表读出（索引即 $6B：0 不动，1..4 四个方向），这里不另写一份。
    const camera = storyBrowserVm().camera_model || {};
    const scriptedCameraTarget = (nextX, nextY) => {
      // 剧情状态表的显式相机目标优先于普通场景边界；F5 的目标本身就是负原点。
      // 没有这层状态目标的普通/事件角色表仍沿用数据声明的场景边界策略。
      if (shared.cameraUsesStoryCoordinates
          || camera.clamp !== "scene-bounds") {
        return [nextX, nextY];
      }
      const context = activeSceneContext();
      const width = Number(context?.width) || 0;
      const height = Number(context?.height) || 0;
      const spanX = Math.max(0, width - Number(camera.viewport_tiles_x ?? 16));
      const spanY = Math.max(0, height - Number(camera.viewport_tiles_y ?? 15));
      return [
        width ? Math.max(0, Math.min(spanX, nextX)) : nextX,
        height ? Math.max(0, Math.min(spanY, nextY)) : nextY,
      ];
    };
    let scriptedFieldStep = null;
    let fieldMovementBusy = initialActorTicks > 0 || Boolean(fieldInputStep);
    let scriptedCameraPosition = null;
    const advanceScriptedFieldInput = () => {
      if (fieldInputStep) {
        fieldMovementBusy = true;
        return;
      }
      if (scriptedFieldStep) {
        fieldMovementBusy = true;
        advanceStoryFieldStep(fieldMotionEntities());
        scriptedFieldStep.elapsed += 1;
        const progress = Math.min(1, scriptedFieldStep.elapsed / scriptedFieldStep.duration);
        scriptedCameraPosition = {
          x: scriptedFieldStep.fromX + (scriptedFieldStep.toX - scriptedFieldStep.fromX) * progress,
          y: scriptedFieldStep.fromY + (scriptedFieldStep.toY - scriptedFieldStep.fromY) * progress,
        };
        if (progress < 1) return;
        scriptedFieldStep = null;
        const sceneDocument = db.peekResourceDocument(recordUid("scene", shared.sceneId), null);
        const pointTransition = sceneDocument?.logic?.layers?.transitions?.point_transitions?.find(row =>
          Number(row.x) === shared.playerMapX && Number(row.y) === shared.playerMapY);
        if (pointTransition) {
          const [x, y] = fieldCameraOrigin(pointTransition.destination_scene_id,
            pointTransition.destination_x, pointTransition.destination_y);
          requestTransition(sceneReloadMode, 0, "scripted-input-scene-transition", {
            sceneId: pointTransition.destination_scene_id,
            cameraTileOriginX: x, cameraTileOriginY: y,
          });
          scriptedCameraPosition = null;
          return;
        }
        return;
      }
      // PRG $07D8CC 在完成格步后的下一次场景驱动把 $6D 置为负数。
      fieldMovementBusy = false;
      const direction = shared.scriptedInput;
      if (!direction || shared.transition || !camera.delta_x || !camera.delta_y) return;
      const fromX = shared.cameraTileOriginX, fromY = shared.cameraTileOriginY;
      const [toX, toY] = scriptedCameraTarget(
        fromX + Number(camera.delta_x[direction] || 0),
        fromY + Number(camera.delta_y[direction] || 0));
      const duration = Math.max(1, Number(camera.preview_pan_interval_frames) || 32);
      // PRG $07D8EC 提交格原点；$07D909 清输入槽，像素滚屏由格步计数推进。
      shared.cameraTileOriginX = toX;
      shared.cameraTileOriginY = toY;
      shared.playerMapX = toX + 8;
      shared.playerMapY = toY + 7;
      shared.playerDirection = directions[direction - 1];
      shared.scriptedInput = 0;
      previewCameraPosition = null;
      const entities = fieldMotionEntities();
      const leader = entities[0];
      if (leader) { leader.x = fromX + 8; leader.y = fromY + 7; }
      beginStoryFieldStep(entities, shared.playerMapX, shared.playerMapY,
        shared.playerDirection, duration);
      advanceStoryFieldStep(entities);
      scriptedFieldStep = {fromX, fromY, toX, toY, elapsed: 1, duration};
      fieldMovementBusy = true;
      scriptedCameraPosition = {x: fromX + (toX - fromX) / duration,
        y: fromY + (toY - fromY) / duration};
    };
    const enqueueScriptedInput = (actor, command, direction, stepCount) => {
      // PRG $035406 在空槽入队后立即递减次数，末步移动与后续命令可重叠。
      if (shared.scriptedInput) return false;
      const timerKey = `scripted-input:${actor.cursor}`;
      const remaining = Number(actor.commandTimers[timerKey] ?? Math.max(1, stepCount)) - 1;
      shared.scriptedInput = direction;
      if (remaining > 0) actor.commandTimers[timerKey] = remaining;
      else {
        delete actor.commandTimers[timerKey];
        storyVmAdvance(actor, command);
      }
      return true;
    };
    const beginTileMotion = (
      actor,
      direction,
      advanceOnComplete,
      operation,
    ) => {
      const [dx, dy] = vectors[direction] || [0, 0];
      actor.moveDirection = direction;
      const lockDisplayedDirection = Boolean(actor.motionAttributes & 0x80);
      if (!lockDisplayedDirection) actor.direction = direction;
      if (tileBlockedFor(actor, actor.x + dx, actor.y + dy)) {
        // $B5B8 带进位返回，$12-$15 据此返回 0 重复本命令：朝向已经转过去了，
        // 但坐标不动，也不推进游标。
        actor.motion = null;
        return false;
      }
      actor.motion = {
        fromX: actor.x,
        fromY: actor.y,
        toX: actor.x + dx,
        toY: actor.y + dy,
        elapsed: 1,
        // $A7F2–$A805 按属性低两位递减 $03A3；格步时长随速度变化。
        duration: Number(collision.motion_timer_value || 32)
          / (1 << (actor.motionAttributes & 3)),
        advanceOnComplete,
        animate: !(actor.motionAttributes & 0x40),
        operation,
      };
      actor.x += dx / actor.motion.duration;
      actor.y += dy / actor.motion.duration;
      return true;
    };
    const random = globalRandom(Number(runtimeOverrides?.randomSeed ?? 0));
    let wanderRandom = Number(runtimeOverrides?.wanderRandomState ?? 0) & 0xffff;
    const refreshWanderRandom = frame => {
      // 预览每帧递推一次；现场等待循环的调用次数由显式输入上下文覆盖。
      const calls = Number(runtimeOverrides?.randomCallsPerFrame?.[frame] ?? 1);
      for (let call = 0; call < calls; call += 1) random.next();
      const {high, low} = random.snapshot();
      wanderRandom = (low << 8) | high;
    };
    const advanceWanderMotion = (actor, rectangle) => {
      // PRG $034B4F 保持朝向的权重为二，另两项为垂直方向。
      const directionTable = [0, 0, 2, 3, 1, 1, 2, 3, 2, 2, 0, 1, 3, 3, 0, 1];
      let direction = actor.wanderDirection;
      if (actor.wanderWait > 0) {
        actor.wanderWait -= 1;
        if (actor.wanderWait > 0) { wanderRandom >>>= 1; return; }
      } else {
        direction = directionTable[directions.indexOf(actor.direction) * 4 + (wanderRandom & 3)];
        actor.wanderDirection = direction;
        if (direction !== directions.indexOf(actor.direction)) {
          actor.wanderWait = 0x40;
          wanderRandom >>>= 1;
          return;
        }
      }
      const {x, y} = actor;
      const moved = beginTileMotion(actor, directions[direction], false, "advance-wander-motion");
      if (moved && rectangle) {
        const [left, right, top, bottom] = rectangle;
        if (actor.motion.toX < left || actor.motion.toX >= right
            || actor.motion.toY < top || actor.motion.toY >= bottom) {
          actor.x = x; actor.y = y; actor.motion = null;
        }
      }
      wanderRandom >>>= 1;
    };
    const capturePartyActors = () => {
      if (!shared.playerPositionKnown) return [];
      return shared.fieldEntities.filter(entity => entity.partySlot !== null && entity.actorType != null).map(({fieldEntityIndex, ...entity}) => ({
        ...entity,
        scriptId: null,
        motionAttributes: 0,
        screenOffsetX: 0,
        screenOffsetY: 0,
        ended: false,
        blocked: false,
        blockedReason: null,
        motion: entity.motion ? {...entity.motion} : null,
        currentCommand: null,
      }));
    };
    const runtimeTarget = target => ({partySlot: target.partySlot, fieldEntityIndex: target.fieldEntityIndex});
    const chrAnimationRecipe = fieldChrAnimationRecipe(db.peekResourceDocument("palette-runtime-service", null));
    const animationScene = () => {
      const document = db.peekResourceDocument(recordUid("scene", shared.sceneId), null);
      return document?.scene || document || {id: shared.sceneId};
    };
    const chrAnimation = {timer: fieldChrAnimationDuration(chrAnimationRecipe, animationScene())
      ? 0 : 0xfe, phase: 0};
    let chrAnimationSceneId = shared.sceneId;
    let chrAnimationStep = shared.sceneId === 0 ? 1
      : sceneFieldChrAnimation(animationScene())?.initialStep ?? 0;
    if (fieldTraversal) {
      chrAnimation.timer = 0xfe;
      advanceFieldChrAnimation(chrAnimation, chrAnimationRecipe, animationScene(), chrAnimationStep);
    }
    const animationStep = () => {
      if (chrAnimationSceneId !== shared.sceneId) {
        chrAnimationSceneId = shared.sceneId;
        chrAnimationStep = shared.sceneId === 0 ? 1
          : sceneFieldChrAnimation(animationScene())?.initialStep ?? 0;
        const scene = animationScene();
        // 世界图案装载先调用 $AF42；$028A41..$028A45 再置 $7C=$FE 并调用 $E304。
        if (shared.sceneId === 0)
          advanceFieldChrAnimation(chrAnimation, chrAnimationRecipe, scene, chrAnimationStep);
        chrAnimation.timer = 0xfe;
        advanceFieldChrAnimation(chrAnimation, chrAnimationRecipe, scene, chrAnimationStep);
      }
      return chrAnimationStep;
    };
    const captureAnimation = () => {
      const step = animationStep();
      const duration = fieldChrAnimationDuration(chrAnimationRecipe, animationScene());
      return duration ? {backgroundAnimationPhase: chrAnimation.phase,
        backgroundAnimationClock: {...chrAnimation, duration, step,
          mask: fieldChrAnimationMask(chrAnimationRecipe, animationScene())},
      } : null;
    };
    const captureFrame = () => ({
      variantId: Number(activeVariant.id),
      context: activeSceneContext(),
      storyState: shared.storyState,
      mode: shared.mode,
      actorListId: shared.actorListId,
      sceneId: shared.sceneId,
      fieldPresentation: encounterPresentation ? {enabled: true, phase: "encounter-flash",
        tick: encounterPresentation.tick, backgroundFlash: (encounterPresentation.tick & 1) !== 0}
        : fieldPresentation ? {enabled: fieldPresentation.tick !== 0,
          phase: fieldPresentation.tick === 0 ? "scene-loading" : "fade-in",
          operation: fieldPresentation.operation, tick: fieldPresentation.tick,
          paletteDecrement: fadeInDecrements?.[fieldPresentation.tick] ?? 0} : null,
      ...captureAnimation(),
      ...(scriptedCameraPosition || previewCameraPosition ? {
        fieldCameraTileOriginX: (scriptedCameraPosition || previewCameraPosition).x,
        fieldCameraTileOriginY: (scriptedCameraPosition || previewCameraPosition).y,
      } : {}),
      cameraTileOriginX: shared.cameraTileOriginX,
      cameraTileOriginY: shared.cameraTileOriginY,
      cameraKnown: shared.cameraKnown,
      screenScrollOffsetY: shared.screenScrollOffsetY,
      scrollY: (Math.round(shared.cameraTileOriginY * 16)
        + shared.screenScrollOffsetY) & 0xff,
      controlLock: shared.controlLock,
      scriptedInput: shared.scriptedInput,
      playerMapX: shared.playerMapX,
      playerMapY: shared.playerMapY,
      fieldDriver: fieldDriver ? {...fieldDriver} : null,
      previewFieldInputs: runtimeOverrides?.previewFieldInputs ?? variant.preview_field_inputs ?? [],
      previewFieldInputIndex: fieldInputIndex,
      fieldInputStep: fieldInputStep ? {...fieldInputStep, vector: [...fieldInputStep.vector]} : null,
      eventFlags: [...shared.eventFlags].sort((left, right) => left - right),
      runtimePartySlots: [...shared.runtimePartySlots]
        .sort((left, right) => left - right),
      partyInventories: shared.partyInventories.map(row => [...row]),
      partyEquipment: shared.partyEquipment.map(row => [...row]),
      partyMembers: shared.partyMembers.map(member => ({...member})),
      partyMoney: shared.partyMoney,
      vehicles: shared.vehicles.map(vehicle => ({...vehicle, inventory: [...vehicle.inventory],
        equipment: [...vehicle.equipment], equipmentCargo: [...vehicle.equipmentCargo],
        parked: vehicle.parked ? {...vehicle.parked} : null})),
      fieldServiceEntry: shared.fieldServiceEntry ? {...shared.fieldServiceEntry} : null,
      runtimeResultD5: shared.runtimeResultD5,
      fieldEntityCount: shared.fieldEntityCount,
      fieldPartyPositions: shared.fieldEntities.map(entity => ({
        x: entity.x, y: entity.y, direction: entity.direction,
        moveDirectionCode: entity.moveDirectionCode,
        motion: entity.motion ? {...entity.motion} : null,
      })),
      temporaryEntityValue: shared.temporaryEntityValue,
      parameters: {...shared.parameters},
      temporaryEntities: shared.temporaryEntities.map(entity => ({...entity,
        motion: entity.motion ? {...entity.motion} : null})),
      partyItemEvents: shared.partyItemEvents.map(event => ({...event})),
      partyActors: capturePartyActors(),
      renderFrameParity: (frames.length + Number(runtimeOverrides?.renderFrameParityOffset ?? 0)) & 1,
      actors: actors.map(actor => ({
        actorSlot: actor.actorSlot,
        renderSlot: actor.renderSlot,
        partySlot: actor.partySlot,
        scriptKind: actor.scriptKind,
        scriptId: actor.scriptId,
        cursor: actor.cursor,
        x: actor.x,
        y: actor.y,
        actorType: actor.actorType,
        palette: actor.palette,
        direction: actor.direction,
        moveDirection: actor.moveDirection,
        motionAttributes: actor.motionAttributes,
        screenOffsetX: actor.screenOffsetX,
        screenOffsetY: actor.screenOffsetY,
        renderMode: actor.renderMode,
        hidden: actor.hidden,
        ended: actor.ended,
        blocked: actor.blocked,
        blockedReason: actor.blockedReason,
        wait: actor.wait,
        commandTimers: captureCommandTimers(actor.commandTimers),
        motion: actor.motion ? {...actor.motion} : null,
        renderPose: actor.renderPose ? {...actor.renderPose,
          motion: actor.renderPose.motion ? {...actor.renderPose.motion} : null} : null,
        screenEffect: {...actor.screenEffect},
        ...(actor.wanderWait !== undefined ? {wanderWait: actor.wanderWait,
          wanderDirection: actor.wanderDirection} : {}),
        currentCommand: actor.currentCommand ? {...actor.currentCommand, nextCursor: actor.cursor} : null,
      })),
      fieldTiles: [...shared.fieldTiles.values()]
        .filter(tile => Number(tile.sceneId) === Number(shared.sceneId))
        .map(tile => ({...tile})),
      dialogue: shared.activeDialogue ? (() => {
        const pages = shared.activeDialogue.pages || [];
        const pageIndex = Math.min(
          Number(shared.activeDialogue.pageBreaks || 0),
          Math.max(
            0,
            Math.floor((
              Number(shared.activeDialogue.totalWaitFrames || 0)
              - Number(shared.globalWait || 0)
            ) / Math.max(1, Number(shared.activeDialogue.inputInterval || 1)))
            - Number(shared.activeDialogue.initialAcceleratePresses || 0),
          ),
        );
        return {
          ...shared.activeDialogue,
          pageIndex,
          // 当前该显示的那一页文字，供窗口直接绘制。
          lines: pages[Math.min(pageIndex, pages.length - 1)] || [],
          pageCount: pages.length,
        };
      })() : null,
      audioState: {...shared.audioState},
      audioEvents: shared.pendingAudioEvents.map(event => ({...event})),
      battleEntry: shared.battleEntry ? {...shared.battleEntry} : null,
    });
    // 全局等待的循环检测复用不变字段，UI 续演与场景切换清空缓存。
    let waitingStateSignature = null;
    const stateSignature = () => {
      if (shared.globalWait <= 0 || externalServices) waitingStateSignature = null;
      const value = waitingStateSignature ?? JSON.stringify(signatureValues([
        Number(activeVariant.id), shared.storyState, shared.mode, shared.actorListId, shared.sceneId,
        shared.cameraTileOriginX, shared.cameraTileOriginY, shared.cameraKnown, shared.screenScrollOffsetY,
        shared.controlLock, shared.scriptedInput, shared.transition,
        scriptedFieldStep, fieldMovementBusy, shared.resumeActorSlot,
        [...shared.eventFlags].sort((a, b) => a - b), shared.parameters,
        [...shared.runtimePartySlots].sort((a, b) => a - b),
        [...shared.runtimePartyActorTypes].sort((a, b) => a - b),
        shared.runtimePlayerActorType, shared.runtimeResultD5, shared.partyInventories,
        shared.partyEquipment, shared.partyMembers, shared.partyMoney, shared.vehicles, shared.fieldEntities,
        fieldInputIndex, fieldInputStep, terrainStep, previewControlReleased, shared.fieldEntityCount,
        shared.temporaryEntities,
        [...shared.fieldTiles.entries()].sort(([left], [right]) => left.localeCompare(right)),
        [...shared.fieldPassableTiles].sort((left, right) => left.localeCompare(right)),
        shared.activeDialogue,
        ...(runtimeOverrides?.choices !== undefined ? [choiceIndex] : []),
        ...(Array.isArray(runtimeOverrides?.serviceResults) ? [serviceIndex] : []),
        actors.some(actor => !actor.ended && actor.wanderDirection !== undefined) ? wanderRandom : null,
        actors.map(actor => signatureValues([
          actor.scriptKind, actor.scriptId, actor.cursor, Number(actor.x.toFixed(4)), Number(actor.y.toFixed(4)),
          actor.actorType, actor.direction, actor.motionAttributes, actor.screenOffsetX, actor.screenOffsetY,
          actor.renderMode, actor.hidden, actor.ended, actor.blocked, actor.wait, actor.motion,
          actor.wanderWait, actor.wanderDirection, actor.commandTimers, actor.screenEffect,
        ])),
      ]));
      if (shared.globalWait > 0 && !externalServices) waitingStateSignature = value;
      return `${shared.globalWait}:${shared.controlReturnGuard}:${value}`;
    };
    const applySceneActionState = (source, requireActors = false) => {
      if ((source.variantId !== undefined && source.variantId !== Number(activeVariant.id))
          || (requireActors && !Array.isArray(source.actors)))
        throw new TypeError("场景动作现场与角色列表不符");
      const current = structuredClone(source);
      if (current.actors) {
        const bySlot = new Map(current.actors.map(actor => [actor.actorSlot, actor]));
        if (bySlot.size !== actors.length || actors.some(actor => !bySlot.has(actor.actorSlot)))
          throw new TypeError("场景动作现场缺少角色槽");
        for (const actor of actors) Object.assign(actor, bySlot.get(actor.actorSlot));
      }
      for (const key of ["storyState", "mode", "actorListId", "sceneId", "controlLock",
        "cameraTileOriginX", "cameraTileOriginY", "scriptedInput", "playerMapX", "playerMapY",
        "playerDirection", "runtimeResultD5", "partyMoney", "temporaryEntityValue", "fieldEntityCount"])
        if (current[key] !== undefined) shared[key] = current[key];
      for (const key of ["eventFlags", "runtimePartySlots"])
        if (current[key] !== undefined) shared[key] = new Set(current[key]);
      for (const key of ["parameters", "partyInventories", "partyEquipment", "partyMembers", "vehicles", "temporaryEntities"])
        if (current[key] !== undefined) shared[key] = current[key];
      if (current.partyMembers || current.runtimePartySlots) rebuildFieldEntities();
      if (current.fieldPartyPositions) for (const [index, position] of current.fieldPartyPositions.entries())
        if (shared.fieldEntities[index]) Object.assign(shared.fieldEntities[index], position);
      if (current.fieldTiles) shared.fieldTiles = new Map(current.fieldTiles.map(tile =>
        [`${tile.sceneId}:${tile.x}:${tile.y}`, tile]));
    };
    if (initialState) applySceneActionState(initialState, true);
    const frames = [];
    const initializationFrames = [];
    const unsupported = new Set();
    const seenStates = new Map();
    const executionStartedAt = performance.now();
    let executionSteps = 0;
    let executionStop = null;
    const uiAutoInputs = [];
    const audioEvents = [];
    const emitRuntimeAudioEvent = (sourceEvent, actor, frame) => {
      if (!sourceEvent) return null;
      const event = applyStoryAudioEvent(shared.audioState, sourceEvent);
      const runtimeEvent = {
        ...event,
        frame,
        variant_id: Number(activeVariant.id),
        actor_slot: Number(actor.actorSlot),
        script_id: Number(actor.scriptId),
        cursor: Number(actor.cursor),
      };
      shared.audioState.lastEvent = runtimeEvent;
      shared.pendingAudioEvents.push(runtimeEvent);
      audioEvents.push(runtimeEvent);
      return runtimeEvent;
    };
    emitRuntimeAudioEvent(sceneEntryAudioEvent(shared.sceneId, shared.eventFlags),
      {actorSlot: -1, scriptId: -1, cursor: -1}, 0);
    let audioSceneId = shared.sceneId;
    let submittedOam = null;
    const appendFrame = () => {
      if (audioSceneId !== shared.sceneId) {
        audioSceneId = shared.sceneId;
        emitRuntimeAudioEvent(sceneEntryAudioEvent(shared.sceneId, shared.eventFlags),
          {actorSlot: -1, scriptId: -1, cursor: -1}, frames.length);
      }
      const snapshot = captureFrame();
      const visiblePatterns = frames[Math.max(0, frames.length - 2)];
      if (visiblePatterns?.sceneId === snapshot.sceneId && visiblePatterns.backgroundAnimationClock) {
        snapshot.backgroundAnimationVisibleClock = {...visiblePatterns.backgroundAnimationClock};
        snapshot.backgroundAnimationPhase = visiblePatterns.backgroundAnimationClock.phase;
      }
      if (scriptedCameraPosition || fieldInputStep || (fieldTraversal && terrainStep)) {
        // $028573 更新格步，$07D597 提交滚屏；自然现场的可见背景取前两帧位置。
        const position = frames[Math.max(0, frames.length - 2)];
        const patterns = position;
        if (position?.sceneId === snapshot.sceneId) {
          snapshot.backgroundCameraTileOriginX = Math.ceil((position.fieldCameraTileOriginX ?? position.cameraTileOriginX) * 16) / 16;
          snapshot.backgroundCameraTileOriginY = Math.ceil((position.fieldCameraTileOriginY ?? position.cameraTileOriginY) * 16) / 16;
        }
        if (patterns?.sceneId === snapshot.sceneId) {
          // PRG $034472 将剩余格步计数右移，NMI 显示前次提交的 OAM。
          snapshot.actorCameraTileOriginX = Math.ceil((patterns.fieldCameraTileOriginX ?? patterns.cameraTileOriginX) * 16) / 16;
          snapshot.actorCameraTileOriginY = Math.ceil((patterns.fieldCameraTileOriginY ?? patterns.cameraTileOriginY) * 16) / 16;
        }
      }
      const oam = {sceneId: snapshot.sceneId, poses: new Map()};
      for (const group of ["actors", "partyActors", "temporaryEntities"]) {
        for (const actor of snapshot[group]) {
          const key = `${group}:${actor.actorSlot}`;
          const pose = shared.activeDialogue && submittedOam?.sceneId === snapshot.sceneId
            ? submittedOam.poses.get(key) || actor.renderPose || actor : actor.renderPose || actor;
          oam.poses.set(key, {
            x: pose.x, y: pose.y, actorType: pose.actorType, palette: pose.palette,
            direction: pose.direction, renderMode: pose.renderMode, hidden: pose.hidden,
            motion: pose.motion ? {...pose.motion} : null,
          });
          if (submittedOam?.sceneId === snapshot.sceneId && submittedOam.poses.has(key)) {
            actor.renderPose = submittedOam.poses.get(key);
          }
        }
      }
      submittedOam = snapshot.fieldPresentation?.enabled === false ? null : oam;
      frames.push(snapshot);
      const scene = animationScene();
      // PRG $07E06B 的渐显等待只调用 $D01D，不推进 $E304 的场景图案时钟。
      if (!fieldPresentation && !encounterPresentation)
        advanceFieldChrAnimation(chrAnimation, chrAnimationRecipe, scene, animationStep());
      if (encounterPresentation && ++encounterPresentation.tick >= encounterPresentation.duration)
        encounterPresentation = null;
      shared.pendingAudioEvents = [];
      advanceStoryAudioState(shared.audioState);
      if (shared.controlReturnGuard > 0) shared.controlReturnGuard -= 1;
    };
    let loopStart = null;
    let completion = null;
    let controlReturnedFrame = null;
    let returnedCompletion = "control-returned";
    let afterControlRemaining = Math.max(0,
      Math.floor(Number(runtimeOverrides?.previewAfterControlFrames) || 0));
    let pendingUiCommand = null;
    const finishBlockingUi = () => {
      waitingStateSignature = null;
      const source = shared.activeDialogue;
      for (const choice of source?.choices || []) {
        shared.runtimeResultD5 = choice.value;
        resolvedRuntimeResult = true;
      }
      if (!source?.choices?.length && pendingUiCommand?.resultD5 !== undefined) {
        shared.runtimeResultD5 = Number(pendingUiCommand.resultD5) & 0xff;
        resolvedRuntimeResult = true;
      }
      const next = dialogueQueue.shift();
      if (next) {
        startDialogue(next, source, frames.length);
        return;
      }
      shared.activeDialogue = null;
      if (!pendingUiCommand) return;
      const {actor, command, terminates} = pendingUiCommand;
      if (terminates) actor.ended = true;
      else storyVmAdvance(actor, command);
      pendingUiCommand = null;
    };
    const stopAtCurrentInstruction = kind => {
      const actor = actors.find(item => (
        !item.ended && !item.blocked && item.scriptKind === "interaction"
      )) || actors.find(item => !item.ended && !item.blocked) || actors[0];
      const program = actor ? programForActor(actor) : null;
      const command = actor ? (program?.commands || []).find(
        item => Number(item.cursor) === Number(actor.cursor),
      ) : null;
      return {
        kind,
        frame: frames.length,
        step: executionSteps,
        actorSlot: actor ? Number(actor.actorSlot) : null,
        scriptKind: actor?.scriptKind || null,
        scriptId: actor ? Number(actor.scriptId) : null,
        cursor: actor ? Number(actor.cursor) : null,
        cursorHex: command?.cursor_hex || (
          actor ? hex(Number(actor.cursor), 2) : null
        ),
        opcode: command ? Number(command.opcode) : null,
        opcodeHex: command?.opcode_hex || null,
        operation: actor?.currentCommand?.operation || null,
      };
    };
    let emittedFrames = 0;
    const frameEffect = snapshot => ({status: "available", state: snapshot,
      effects: [{kind: "scene-frame", frame: snapshot}]});
    while (!completion) {
      while (emittedFrames < frames.length) yield frameEffect(frames[emittedFrames++]);
      if (shared.globalWait <= 0 && shared.resumeActorSlot === null) {
        // OAM 使用本次角色更新前的形象、位置与步态。
        for (const actor of actors) actor.renderPose = {x: actor.x, y: actor.y,
          actorType: actor.actorType, palette: actor.palette, direction: actor.direction,
          renderMode: actor.renderMode, hidden: actor.hidden,
          motion: actor.motion ? {...actor.motion} : null};
        for (const entity of fieldMotionEntities()) entity.renderPose = {x: entity.x, y: entity.y,
          actorType: entity.actorType, palette: entity.palette, direction: entity.direction,
          renderMode: entity.renderMode, hidden: entity.hidden,
          motion: entity.motion ? {...entity.motion} : null};
      }
      if (frames.length >= STORY_VM_EXECUTION_LIMIT
          || executionSteps >= STORY_VM_EXECUTION_LIMIT) {
        executionStop = stopAtCurrentInstruction("limit");
        completion = "execution-limit";
        break;
      }
      if (encounterPresentation) {
        appendFrame();
        continue;
      }
      if (shared.transition) waitingStateSignature = null;
      settleTransition();
      if (fieldPresentation && !initialActorTicks) {
        appendFrame();
        fieldPresentation.tick += 1;
        if (fieldPresentation.tick >= fadeInDecrements.length) fieldPresentation = null;
        continue;
      }
      if (!initialActorTicks && presentationCompletion) {
        if (presentationCompletion !== "control-returned" || !afterControlRemaining) {
          completion = presentationCompletion;
          break;
        }
        controlReturnedFrame ??= Math.max(0, frames.length - 1);
        presentationCompletion = null;
      }
      if (!initialActorTicks && (isControlReturned() || controlReturnedFrame !== null)) {
        controlReturnedFrame ??= Math.max(0, frames.length - 1);
        if (!afterControlRemaining) {
          appendFrame();
          completion = returnedCompletion;
          break;
        }
        afterControlRemaining -= 1;
      }
      if (shared.activeDialogue && shared.globalWait <= 0) {
        finishBlockingUi();
      }
      const frame = frames.length;
      const signature = !initialActorTicks && controlReturnedFrame === null ? stateSignature() : null;
      if (!initialActorTicks && controlReturnedFrame === null && seenStates.has(signature)) {
        loopStart = Number(seenStates.get(signature));
        executionStop = stopAtCurrentInstruction("loop");
        completion = (sceneReloadOwnsCompletion
            && (shared.controlSequenceStarted
              || shared.parameters.completedEncounterEventFlag !== undefined))
            && shared.storyState === 0 && shared.controlLock === 0
            && shared.mode === fieldMode
          ? "control-returned"
          : isDedicatedModeReached()
          ? "dedicated-field-mode"
          : startsControlLocked
          ? actors.some(actor => actor.blocked)
            ? "blocked-on-unknown-handler"
            : "waiting-for-external-state"
          : "ambient-loop";
        break;
      }
      if (!initialActorTicks && controlReturnedFrame === null) seenStates.set(signature, frame);
      if (shared.globalWait > 0) {
        shared.globalWait -= 1;
        if (shared.globalWait > 0 || !pendingUiCommand) {
          for (let call = 0; call < Number(runtimeOverrides?.randomCallsPerFrame?.[frame] ?? 1); call += 1) random.next();
          appendFrame();
          continue;
        }
        finishBlockingUi();
        if (shared.globalWait > 0) {
          for (let call = 0; call < Number(runtimeOverrides?.randomCallsPerFrame?.[frame] ?? 1); call += 1) random.next();
          appendFrame();
          continue;
        }
      }
      const resumeActorSlot = shared.resumeActorSlot;
      shared.resumeActorSlot = null;
      if (!initialActorTicks && resumeActorSlot === null) {
        advanceScriptedFieldInput();
        advancePreviewFieldInput();
        advanceTerrainTraversal();
      }
      // PRG $034185–$0341A3 按槽倒序更新；阻塞 UI 返回后续跑本次遍历。
      for (const actor of [...actors].reverse()) {
        if (resumeActorSlot !== null && actor.actorSlot >= resumeActorSlot) continue;
        if (shared.battleEntry) break;
        if (actor.ended || actor.blocked || shared.transition) continue;
        if (actor.motion) {
          const nonblocking = actor.motion.nonblocking;
          const speed = 1 << (actor.motionAttributes & 3);
          const remaining = Math.round((actor.motion.duration - actor.motion.elapsed) * speed);
          actor.motion.elapsed = actor.motion.duration - sceneActionMotionPhase(remaining, actor.motionAttributes) / speed;
          const progress = Math.min(1, actor.motion.elapsed / actor.motion.duration);
          actor.x = actor.motion.fromX
            + (actor.motion.toX - actor.motion.fromX) * progress;
          actor.y = actor.motion.fromY
            + (actor.motion.toY - actor.motion.fromY) * progress;
          if (progress >= 1) {
            actor.x = actor.motion.toX;
            actor.y = actor.motion.toY;
            const completedMotion = actor.motion;
            actor.motion = null;
            if (completedMotion.advanceOnComplete) {
              const program = programForActor(actor);
              const command = (program?.commands || [])
                .find(item => Number(item.cursor) === actor.cursor);
              if (command) storyVmAdvance(actor, command);
            }
          }
          if (!nonblocking) continue;
        }
        if (actor.wait > 0) {
          actor.wait -= 1;
          continue;
        }
        const program = programForActor(actor);
        let command = (program?.commands || [])
          .find(item => Number(item.cursor) === actor.cursor);
        // The map-actor runner dispatches one autonomous command for each actor
        // update.  Mesen's opening trace shows adjacent non-blocking opcodes
        // progressing on adjacent frames (for example 3F -> 04 -> 0F -> 27).
        // Running a whole bytecode burst here compressed the later cutscene into
        // a single frame and made the preview appear truncated.
        let dispatchBudget = 1;
        while (command && dispatchBudget > 0
            && !actor.ended && !shared.transition) {
          dispatchBudget -= 1;
          executionSteps += 1;
          const opcode = Number(command.opcode);
          const semantic = semantics.get(opcode);
          actor.currentCommand = {
            instructionId: command.instructionId,
            instructionSource: command.instructionSource,
            structureScriptId: command.structureScriptId,
            opcode,
            opcodeHex: command.opcode_hex,
            cursor: Number(command.cursor),
            cursorHex: command.cursor_hex,
            raw: [opcode, ...commandOperands(command)]
              .map(value => (Number(value) & 0xFF)
                .toString(16).toUpperCase().padStart(2, "0"))
              .join(" "),
            operation: semantic?.operation || "unimplemented-handler",
            operands: commandOperands(command),
            instructionPrgOffset: Number(command.prg_offset),
            instructionPrgOffsetHex: command.prg_offset_hex,
            handlerCpu: Number(command.handler_cpu ?? semantic?.handler_cpu),
            handlerCpuHex: command.handler_cpu_hex ?? (semantic?.handler_cpu == null ? null : hex(semantic.handler_cpu, 4)),
            handlerPrg: Number(command.handler_prg ?? semantic?.handler_prg),
            handlerPrgHex: command.handler_prg_hex ?? (semantic?.handler_prg == null ? null : hex(semantic.handler_prg, 6)),
          };
          if (!semantic) {
            unsupported.add(opcode);
            actor.blocked = true;
            actor.blockedReason = "unimplemented-handler";
            break;
          }
          const operation = semantic.operation === "dispatch-interaction-service" && operand(command, 0) < 0x10
            ? "start-blocking-ui-action" : semantic.operation;
          actor.currentCommand.operation = operation;
          const localMutation = () => applySceneActionLocalMutation(operation, {
            read: id => id === "actor.type" ? actor.actorType : undefined,
            write(id, value) {
              if (id === "actor.direction") actor.direction = actor.moveDirection = ["up", "down", "left", "right"][value];
              else if (id === "actor.motionAttributes") actor.motionAttributes = value;
              else if (id === "actor.x") actor.x = value;
              else if (id === "actor.y") actor.y = value;
              else if (id === "actor.type") applyActorType(actor, value);
            },
          }, commandOperands(command), ["up", "down", "left", "right"].indexOf(semantic.direction));
          const condition = storyWaitCondition(command, semantic);
          if (condition && (runtimeOverrides?.waitAssumptions || [])
            .includes(storyWaitKey(shared.actorListId, actor, command))) {
            if (condition.kind === "event-flag") shared.eventFlags.add(condition.flagId);
            else {
              shared.playerMapX = condition.x ?? condition.left;
              shared.playerMapY = condition.y ?? condition.top;
            }
          }
          if (operation === "end-actor-script"
              || operation === "terminate-or-change-mode") {
            actor.ended = true;
            break;
          }
          if (operation === "set-direction") {
            localMutation();
            storyVmAdvance(actor, command);
          } else if (operation === "face-opposite-runtime-direction") {
            actor.direction = {
              up: "down",
              down: "up",
              left: "right",
              right: "left",
            }[shared.playerDirection] || actor.direction;
            actor.moveDirection = actor.direction;
            storyVmAdvance(actor, command);
          } else if (operation === "dispatch-interaction-service" && operand(command, 0) >= 0x10) {
            const selector = operand(command, 0);
            const parameter = operand(command, 1);
            let providedResult = Array.isArray(runtimeOverrides?.serviceResults)
              ? runtimeOverrides.serviceResults[serviceIndex++]
              : runtimeOverrides?.serviceResults?.[selector];
            if (externalServices) {
              const response = yield {status: "pending", state: captureFrame(),
                effects: [{kind: "interaction-service", selector, parameter}],
                continuation: {kind: "interaction-service", actorSlot: actor.actorSlot,
                  scriptId: actor.scriptId, cursor: actor.cursor}};
              const result = response.runtimeResultD5 ?? response.state?.runtimeResultD5;
              if (!Number.isInteger(result) || result < 0 || result > 255)
                throw new TypeError("交互续行缺少结果字节");
              if (response.state) applySceneActionState(response.state);
              providedResult = result;
            }
            const result = providedResult ?? shared.runtimeResultD5;
            actor.currentCommand.service = {selector, parameter, resultD5: Number(result),
              previewReturnAssumed: providedResult === undefined};
            shared.runtimeResultD5 = Number(result);
            resolvedRuntimeResult = true;
            storyVmAdvance(actor, command);
          } else if (operation === "start-blocking-ui-action"
              || operation === "start-blocking-dialogue"
              || operation === "start-event-selected-dialogue"
              || operation === "dispatch-interaction-service") {
            // PRG $034A8B 在场景格步未结束时保留 $03/$68 的对白游标。
            if ([0x03, 0x68].includes(opcode)
                && (fieldMovementBusy || fieldInputStep || terrainStep)) break;
            const {blockingUi} = effectiveBlockingUi(command, shared.eventFlags);
            const stages = readProject().text_record_edits && readProject().text_record_encoding
              && blockingUi.record_found !== false
              && Number.isInteger(blockingUi.region_id) && blockingUi.region_id >= 0
              && Number.isInteger(blockingUi.record_id) && blockingUi.record_id >= 0
              ? resolveTextRecordDialogue(readProject().text_record_edits, readProject().text_record_encoding,
                Number(blockingUi.region_id), Number(blockingUi.record_id), nextChoice)
              : [blockingUi];
            dialogueQueue = stages.slice(1);
            pendingUiCommand = {actor, command, terminates: semantic.terminates_script};
            shared.resumeActorSlot = actor.actorSlot;
            startDialogue(stages[0], {
              operation,
              prefixRecordId: Number(shared.parameters.dialogueActor ?? (interactionTrigger ? 6 : 0)),
              interactionWindow: Boolean(interactionTrigger && shared.controlLock === 0),
              sourceVariantId: Number(activeVariant.id),
              actorSlot: Number(actor.actorSlot),
              scriptId: Number(actor.scriptId),
              commandCursor: Number(command.cursor),
              opcode: Number(command.opcode),
            }, frame);
            if (externalServices) {
              while (shared.activeDialogue) {
                const response = yield {status: "pending", state: captureFrame(),
                  effects: [{kind: "dialogue", dialogue: structuredClone(shared.activeDialogue)}],
                  continuation: {kind: "dialogue", actorSlot: actor.actorSlot,
                    scriptId: actor.scriptId, cursor: actor.cursor}};
                const result = response.runtimeResultD5 ?? response.state?.runtimeResultD5;
                if (result !== undefined && (!Number.isInteger(result) || result < 0 || result > 255))
                  throw new TypeError("台词续行结果不是字节");
                if (response.state) applySceneActionState(response.state);
                if (result !== undefined) {
                  pendingUiCommand.resultD5 = result;
                  shared.activeDialogue.choices = [];
                }
                shared.globalWait = 0;
                finishBlockingUi();
              }
              shared.resumeActorSlot = null;
            }
            break;
          } else if (operation === "set-event-flag") {
            shared.eventFlags.add(operand(command, 0));
            shared.eventFlagWrites.push({flagId: operand(command, 0), operation, frame});
            storyVmAdvance(actor, command);
          } else if (operation === "sound-command") {
            const commandId = operand(command, 0);
            emitRuntimeAudioEvent(
              effectiveAudioEvent(command, commandId, actor),
              actor,
              frame,
            );
            storyVmAdvance(actor, command);
          } else if (operation === "clear-event-flag") {
            shared.eventFlags.delete(operand(command, 0));
            shared.eventFlagWrites.push({flagId: operand(command, 0), operation, frame});
            storyVmAdvance(actor, command);
          } else if (operation === "branch-if-event-flag-clear") {
            if (runtimeOverrides?.eventFlags === undefined
                && followInteractionPreviewRoute(actor, command)) break;
            const flag = operand(command, 0);
            if (shared.eventFlags.has(flag)) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            }
            break;
          } else if (operation === "branch-on-player-position-exact") {
            const matches = shared.playerMapX === operand(command, 0)
              && shared.playerMapY === operand(command, 1);
            actor.currentCommand.playerCondition = {...condition, satisfied: matches};
            if (matches) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(
                  command,
                  semantic.mismatch_advance_operand_index,
                ),
              );
            }
            break;
          } else if (operation === "branch-if-runtime-result-nonzero") {
            if (!resolvedRuntimeResult && runtimeOverrides?.choices === undefined
                && followInteractionPreviewRoute(actor, command)) break;
            const runtimeResult = Number.isFinite(shared.runtimeResultD5)
              ? shared.runtimeResultD5
              : Number(semantic.preview_runtime_result) || 0;
            if (runtimeResult === 0) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            }
            break;
          } else if (operation === "branch-if-party-not-riding") {
            // $ED13 只取三个人物参与字节的 bit7。
            storyVmRelativeAdvance(actor, shared.partyMembers.some(member => member.ridingVehicle)
              ? 2 : operand(command, 0));
            break;
          } else if (operation === "branch-if-investigation-acquired") {
            storyVmRelativeAdvance(actor, investigationBits.has(operand(command, 0))
              ? operand(command, 1) : 3);
            break;
          } else if (operation === "branch-on-published-preview-route") {
            if (!followInteractionPreviewRoute(actor, command)) {
              storyVmAdvance(actor, command);
            }
            break;
          } else if (operation === "branch-on-player-direction") {
            const requiredDirection = directions[
              operand(command, 0) & 0x03
            ];
            if (shared.playerDirection === requiredDirection) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(
                  command,
                  semantic.mismatch_advance_operand_index,
                ),
              );
            }
            break;
          } else if (operation === "branch-if-party-level-insufficient"
              || operation === "branch-if-party-health-insufficient") {
            const order = storyFieldPartyOrder(shared.partyMembers, shared.runtimePartySlots);
            const eligible = order.some((slot, index) => {
              const member = shared.partyMembers.find(item => item.slot === slot);
              const status = shared.partyMembers.find(item => item.slot === index)?.status ?? 0;
              return operation === "branch-if-party-level-insufficient"
                ? status !== 0xFF && Number(shared.partyMembers.find(item => item.slot === index)?.level ?? 0) >= operand(command, 0)
                : status < 0x80 && member.currentHp >= operand(command, 0);
            });
            storyVmRelativeAdvance(actor, eligible ? 3 : operand(command, 1));
            break;
          } else if (operation === "branch-if-party-money-insufficient") {
            storyVmRelativeAdvance(actor, shared.partyMoney >= operand(command, 0)
              ? 3 : operand(command, 1));
            break;
          } else if (operation === "subtract-party-money") {
            shared.partyMoney = (shared.partyMoney - operand(command, 0) + 0x1000000) % 0x1000000;
            storyVmAdvance(actor, command);
          } else if (operation === "branch-on-field-ui-target") {
            storyVmRelativeAdvance(actor, shared.fieldUiTarget === 0xFF ? 1 : operand(command, 0));
            break;
          } else if (operation === "set-runtime-party-slot-index") {
            shared.parameters.partySlot = operand(command, 0);
            storyVmAdvance(actor, command);
          } else if (operation === "restore-party-member-health") {
            const member = shared.partyMembers.find(item => item.slot === operand(command, 0));
            if (member) {
              actor.currentCommand.targetActor = {partySlot: member.slot};
              member.status = 0; member.currentHp = member.maxHp;
            }
            storyVmAdvance(actor, command);
          } else if (operation === "park-selected-vehicle") {
            const vehicle = shared.vehicles[shared.selectedVehicleSlot];
            if (vehicle) vehicle.parked = {sceneId: shared.sceneId,
              x: actor.x, y: actor.y, direction: actor.direction};
            applyActorType(actor, operand(command, 0));
            shared.eventFlags.delete(0xFB);
            shared.eventFlagWrites.push({flagId: 0xFB, operation, frame});
            storyVmAdvance(actor, command);
          } else if (operation === "release-selected-vehicle") {
            const vehicle = shared.vehicles[shared.selectedVehicleSlot];
            if (vehicle) vehicle.parked = null;
            const selectors = db.peekDocument("vehicle-visual-selector", null);
            const actorType = selectors?.map_actor_types?.find(item => item.id === shared.selectedVehicleSlot)?.actor_type;
            if (actorType === undefined) {
              actor.blocked = true;
              actor.blockedReason = "selected-vehicle-appearance";
              break;
            }
            applyActorType(actor, actorType);
            shared.eventFlags.add(0xFB);
            shared.eventFlagWrites.push({flagId: 0xFB, operation, frame});
            storyVmAdvance(actor, command);
          } else if (operation === "enter-field-travel-service") {
            shared.parameters.travelDestination = operand(command, 0);
            shared.parameters.fieldResult = 0x26;
            shared.mode = 5;
            storyVmAdvance(actor, command);
            shared.fieldServiceEntry = {mode: 5, result: 0x26,
              destination: operand(command, 0), nextCursor: actor.cursor};
            actor.ended = true;
            completion = "field-service-entry";
            break;
          } else if (operation === "branch-if-party-member-alive") {
            const member = shared.partyMembers.find(item => item.slot === operand(command, 0));
            storyVmRelativeAdvance(actor, (member?.status ?? 0) !== 0xFF
              ? operand(command, 1) : 3);
            break;
          } else if (operation === "branch-if-runtime-slot-empty"
              || operation === "branch-if-runtime-slot-present") {
            const present = shared.runtimePartySlots.has(operand(command, 0));
            const takeBranch = operation === "branch-if-runtime-slot-empty"
              ? !present
              : present;
            if (takeBranch) {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            } else {
              storyVmAdvance(actor, command);
            }
            break;
          } else if (
            operation === "branch-if-party-descriptor-absent"
          ) {
            const descriptors = runtimeOverrides?.partyDescriptors ?? [0, 1, 2, 3].map(slot => {
              const member = shared.partyMembers.find(item => item.slot === slot);
              return member?.ridingVehicle ? member.vehicleSlot : 0xFF;
            });
            const present = descriptors.includes(operand(command, 0));
            if (present) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            }
            break;
          } else if (
            operation === "branch-if-object-outside-scene"
          ) {
            const slot = operand(command, 0);
            const sceneId = runtimeOverrides?.objectScenes?.[slot]
              ?? shared.vehicles[slot]?.parked?.sceneId ?? 0xFF;
            if (sceneId === shared.sceneId) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            }
            break;
          } else if (operation === "countdown-relative-branch") {
            const timerKey = String(actor.cursor);
            if (!Number.isFinite(actor.commandTimers[timerKey])) {
              actor.commandTimers[timerKey] = Math.max(
                1,
                operand(command, semantic.count_operand_index, 1),
              );
            }
            actor.commandTimers[timerKey] -= 1;
            if (actor.commandTimers[timerKey] <= 0) {
              delete actor.commandTimers[timerKey];
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(command, semantic.branch_operand_index),
              );
            }
            break;
          } else if (operation === "branch-on-player-position-rectangle") {
            const inside = shared.playerMapX >= operand(command, 0)
              && shared.playerMapX < operand(command, 1)
              && shared.playerMapY >= operand(command, 2)
              && shared.playerMapY < operand(command, 3);
            actor.currentCommand.playerCondition = {...condition, satisfied: inside};
            if (inside) {
              storyVmAdvance(actor, command);
            } else {
              storyVmRelativeAdvance(
                actor,
                operand(
                  command,
                  semantic.outside_advance_operand_index,
                ),
              );
            }
            break;
          } else if (operation === "advance-wander-motion"
              || operation === "wander-inside-rectangle") {
            advanceWanderMotion(actor, operation === "wander-inside-rectangle" ? [
              operand(command, 0), operand(command, 1), operand(command, 2), operand(command, 3),
            ] : null);
            storyVmAdvance(actor, command);
            break;
          } else if (operation === "initialize-actor-motion-state") {
            const speed = 1 << (actor.motionAttributes & 3);
            actor.motion = {fromX: actor.x, fromY: actor.y, toX: actor.x, toY: actor.y,
              elapsed: 0, duration: 32 / speed, animate: true, nonblocking: true, advanceOnComplete: false};
            storyVmAdvance(actor, command);
            break;
          } else if (operation === "attempt-tile-step") {
            beginTileMotion(
              actor, semantic.direction, true, "attempt-tile-step-partial",
            );
            break;
          } else if (operation === "move-actor-to-position") {
            const targetX = operand(command, 0);
            const targetY = operand(command, 1);
            if (Math.round(actor.x) === targetX
                && Math.round(actor.y) === targetY) {
              storyVmAdvance(actor, command);
            } else {
              // $B616 先尝试 X；$B5B8 若以 carry set 报告阻挡，代码不会停在
              // 原地重试，而是直接落入 $B636 再尝试 Y。F5 的角色必须先沿墙
              // 下行、到缺口后再横移，漏掉这个回退会让第一段永久卡在 $16。
              let moved = false;
              if (Math.round(actor.x) !== targetX) {
                const horizontal = actor.x < targetX ? "right" : "left";
                moved = beginTileMotion(
                  actor,
                  horizontal,
                  false,
                  "move-actor-to-position-horizontal-partial",
                );
              }
              if (!moved && Math.round(actor.y) !== targetY) {
                const vertical = actor.y < targetY ? "down" : "up";
                beginTileMotion(
                  actor,
                  vertical,
                  false,
                  "move-actor-to-position-vertical-fallback-partial",
                );
              }
            }
            break;
          } else if (operation === "step-toward-story-target"
            || operation === "step-toward-story-target-until-adjacent") {
            // $ABDA/$AFBE 读取 $0358/$035C，即现场队列索引 1 的领队格坐标。
            const target = fieldMotionEntities()[0];
            const targetX = target.motion?.toX ?? target.x;
            const targetY = target.motion?.toY ?? target.y;
            const atX = Math.round(actor.x) === targetX;
            const atY = Math.round(actor.y) === targetY;
            // PRG $035616 先尝试 X，受阻后回退 Y；$17 在起步后立即推进。
            let moved = false;
            if (!atX) moved = beginTileMotion(actor,
              actor.x < targetX ? "right" : "left", false, operation);
            if (!moved && !atY) beginTileMotion(actor,
              actor.y < targetY ? "down" : "up", false, operation);
            if (operation === "step-toward-story-target") {
              storyVmAdvance(actor, command);
              break;
            }
            // $B5B8 先提交目标格，再由 $34 判距离；画面插值不参与判定。
            const distance = Math.abs((actor.motion?.toX ?? Math.round(actor.x)) - targetX)
              + Math.abs((actor.motion?.toY ?? Math.round(actor.y)) - targetY);
            if (distance < Number(semantic.adjacent_distance ?? 2)) {
              storyVmAdvance(actor, command);
            }
            break;
          } else if (operation === "step-by-rom-direction-table") {
            // $B0B0：nextX = $62 + 表[dir]，dir 推进 $0378 后再取 nextY。
            // $62/$63 是相机格原点，没有它就算不出目标格——不猜。
            const table = semantic.delta_table || [];
            if (!table.length || !shared.cameraKnown) {
              unsupported.add(opcode);
              actor.blocked = true;
              actor.blockedReason = table.length
                ? "missing-camera-tile-origin"
                : "missing-rom-step-delta-table";
              break;
            }
            const cursorKey = `step-direction:${actor.cursor}`;
            const direction = Number(actor.commandTimers[cursorKey]) || 0;
            const turn = operand(command, 0) || 0;
            const nextX = shared.cameraTileOriginX + Number(table[direction & 7]);
            const turned = (direction + turn) & 7;
            const nextY = shared.cameraTileOriginY + Number(table[turned]);
            actor.commandTimers[cursorKey] = turned;
            // 与 $B5B8 同一条地形闸门（$A93E）。$42 直接提交坐标，不走
            // beginTileMotion，所以要在这里显式过闸。
            if (tileBlockedFor(actor, nextX, nextY)) break;   // 返回 0：重复本命令
            actor.x = nextX;
            actor.y = nextY;
            storyVmAdvance(actor, command);
            break;
          } else if (operation === "await-render-gate-then-refresh") {
            // $B50B 的渲染闸门在预览中等待一帧。
            const gateKey = `render-gate:${actor.cursor}`;
            if (!actor.commandTimers[gateKey]) {
              actor.commandTimers[gateKey] = 1;
              break;
            }
            delete actor.commandTimers[gateKey];
            // $FD11→bank1A:$A629 清除 $0360[0..$64)，保留现场坐标。
            for (const entity of shared.fieldEntities) {
              entity.actorType = 0;
              entity.hidden = true;
            }
            storyVmAdvance(actor, command);
            break;
          } else if (operation === "pop-story-actor-slot") {
            // $B53E 清掉末尾现场实体并释放 $42 渲染槽。
            shared.fieldEntityCount = (shared.fieldEntityCount - 1) & 0xFF;
            shared.temporaryEntityValue = 0xFF;
            shared.temporaryEntities = [];
            storyVmAdvance(actor, command);
            break;
          } else if (operation === "follow-rom-waypoint-loop") {
            const path = (semantic.paths || []).find(
              item => Number(item.path_id) === operand(command, 0),
            );
            if (!path?.waypoints?.length) {
              unsupported.add(opcode);
              actor.blocked = true;
              actor.blockedReason = "missing-rom-waypoint-path";
              break;
            }
            const pathKey = `waypoint:${actor.cursor}`;
            const waypointIndex = Math.max(
              0,
              Number(actor.commandTimers[pathKey]) || 0,
            ) % path.waypoints.length;
            const waypoint = path.waypoints[waypointIndex];
            const targetX = Number(waypoint.x);
            const targetY = Number(waypoint.y);
            if (Math.round(actor.x) === targetX
                && Math.round(actor.y) === targetY) {
              actor.commandTimers[pathKey] = (
                waypointIndex + 1
              ) % path.waypoints.length;
            } else {
              const direction = actor.x < targetX ? "right"
                : actor.x > targetX ? "left"
                  : actor.y < targetY ? "down" : "up";
              beginTileMotion(
                actor, direction, false, "follow-rom-waypoint-loop-partial",
              );
            }
            break;
          } else if (operation === "play-rom-recovery-effect") {
            const timerKey = `recovery-effect:${actor.cursor}`;
            let effect = actor.commandTimers[timerKey];
            if (!effect || typeof effect !== "object") {
              const steps = (semantic.steps || []).map(step => ({
                frameId: Number(step.frame_id),
                duration: Math.max(
                  1,
                  Number(step.duration_frames) || 1,
                ),
                audioEvent: step.audio_event || null,
              }));
              if (!steps.length) {
                unsupported.add(opcode);
                actor.blocked = true;
                actor.blockedReason = "missing-rom-recovery-effect";
                break;
              }
              effect = {
                stepIndex: 0,
                remaining: steps[0].duration,
                steps,
              };
              actor.commandTimers[timerKey] = effect;
              applyGenericMetasprite(actor, steps[0].frameId);
              emitRuntimeAudioEvent(steps[0].audioEvent, actor, frame);
            }
            effect.remaining -= 1;
            if (effect.remaining <= 0) {
              effect.stepIndex += 1;
              if (effect.stepIndex >= effect.steps.length) {
                delete actor.commandTimers[timerKey];
                actor.renderMode = semantic.restore_render_mode
                  || "type-animation";
                applyActorType(
                  actor,
                  Number(semantic.restore_actor_type ?? 0x25),
                );
                storyVmAdvance(actor, command);
              } else {
                const step = effect.steps[effect.stepIndex];
                applyGenericMetasprite(actor, step.frameId);
                effect.remaining = step.duration;
                emitRuntimeAudioEvent(step.audioEvent, actor, frame);
              }
            }
            break;
          } else if (operation === "play-render-slot-offset-sequence") {
            const timerKey = `render-offset:${actor.cursor}`;
            let offsetSequence = actor.commandTimers[timerKey];
            if (!offsetSequence || typeof offsetSequence !== "object") {
              const selector = operand(command, 0);
              const sequence = (semantic.sequences || []).find(
                item => Number(item.selector) === selector,
              );
              if (!sequence?.deltas?.length) {
                unsupported.add(opcode);
                actor.blocked = true;
                actor.blockedReason = "missing-rom-render-offset-sequence";
                break;
              }
              applyActorType(actor, operand(command, 1));
              offsetSequence = {
                index: 0,
                deltas: sequence.deltas.map(item => ({
                  dx: Number(item.dx),
                  dy: Number(item.dy),
                })),
              };
              actor.commandTimers[timerKey] = offsetSequence;
            }
            const delta = offsetSequence.deltas[offsetSequence.index];
            actor.screenOffsetX += Number(delta.dx);
            actor.screenOffsetY += Number(delta.dy);
            offsetSequence.index += 1;
            if (offsetSequence.index >= offsetSequence.deltas.length) {
              delete actor.commandTimers[timerKey];
              storyVmAdvance(actor, command);
            }
            break;
          } else if (operation === "advance-global-screen-effect") {
            // $B1DD 仅在 $6D 为负时更新当前渲染槽的两级计数器。
            const cameraMoving = Boolean(fieldMovementBusy || fieldInputStep || terrainStep);
            if (cameraMoving) break;
            const effect = actor.screenEffect;
            if (effect.roundCounter === 0) {
              effect.roundCounter = operand(command, semantic.round_operand_index) & 0xff;
            }
            if (effect.stepCounter === 0) {
              effect.stepCounter = Number(semantic.step_count);
              emitRuntimeAudioEvent(semantic.audio_event, actor, frame);
            }
            const delta = semantic.deltas?.[effect.stepCounter - 1];
            if (!Number.isFinite(delta)) {
              unsupported.add(opcode);
              actor.blocked = true;
              actor.blockedReason = "missing-rom-screen-effect-deltas";
              break;
            }
            shared.screenScrollOffsetY += delta;
            effect.stepCounter = (effect.stepCounter - 1) & 0xff;
            if (effect.stepCounter === 0) {
              effect.roundCounter = (effect.roundCounter - 1) & 0xff;
              if (effect.roundCounter === 0) storyVmAdvance(actor, command);
            }
            break;
          } else if (operation === "relative-cursor-advance") {
            storyVmRelativeAdvance(actor, operand(command, 0));
            break;
          } else if (operation === "wait-operand-frames") {
            const timerKey = String(actor.cursor);
            if (!Number.isFinite(actor.commandTimers[timerKey])) {
              actor.commandTimers[timerKey] = Math.max(
                1,
                operand(command, semantic.count_operand_index, 1),
              );
            }
            actor.commandTimers[timerKey] -= 1;
            if (actor.commandTimers[timerKey] <= 0) {
              delete actor.commandTimers[timerKey];
              storyVmAdvance(actor, command);
            }
            break;
          } else if (operation === "drive-scripted-input") {
            enqueueScriptedInput(actor, command, Number(semantic.input_value) || 0,
              operand(command, semantic.count_operand_index, 1));
            break;
          } else if (operation === "join-party-and-remove-scene-actor") {
            const slot = operand(command, 0) - 1;
            actor.hidden = true;
            if (slot >= 0 && slot < 3) {
              shared.runtimePartySlots.add(slot);
              shared.temporaryEntities = shared.temporaryEntities.slice(0, 1);
              rebuildFieldEntities();
            }
            emitRuntimeAudioEvent({operation: "sound-command", command_id: semantic.sound_command}, actor, frame);
            shared.partyItemEvents.push({frame, opcode, partySlot: slot, joined: true});
            storyVmAdvance(actor, command);
          } else if (operation === "push-temporary-field-entity") {
            const index = shared.fieldEntityCount;
            const value = operand(command, 0);
            const position = shared.fieldEntities[index]
              || runtimeOverrides?.fieldPartyPositions?.[index];
            if (!position) {
              actor.blocked = true;
              actor.blockedReason = "field-entity-capacity";
              break;
            }
            shared.fieldEntityCount = (index + 1) & 0xFF;
            shared.temporaryEntityValue = value;
            shared.temporaryEntities.push({
              actorSlot: `temporary:${index}`, partySlot: null, fieldEntityIndex: index,
              x: Number(position.x), y: Number(position.y), actorType: value,
              renderMode: "direct-actor-frame", palette: 0,
              direction: shared.playerDirection, hidden: value === 0,
              moveDirectionCode: position.moveDirectionCode ?? 0,
              ended: true, blocked: false, motion: null, currentCommand: null,
            });
            shared.partyItemEvents.push({frame, opcode, fieldEntityIndex: index, frameId: value});
            storyVmAdvance(actor, command);
          } else if (operation === "replace-party-item") {
            const itemId = operand(command, 0);
            const result = replaceStoryPartyItem(shared.partyInventories, shared.runtimePartySlots,
              itemId, operand(command, 1));
            shared.runtimeResultD5 = result.d5;
            const runtimeResult = {frame, opcode, itemId, ...result,
              cursor: actor.cursor, nextCursor: (actor.cursor + 3) & 0xFF};
            actor.currentCommand.runtimeResult = runtimeResult;
            shared.partyItemEvents.push(runtimeResult);
            storyVmRelativeAdvance(actor, 3);
            break;
          } else if (operation === "find-party-item-and-branch"
              || operation === "grant-party-item-and-branch") {
            const itemId = operand(command, 0);
            const result = operation === "find-party-item-and-branch"
              ? findStoryPartyItem(shared.partyInventories, shared.runtimePartySlots, itemId)
              : itemId >= 0x41 && itemId < 0x99 || itemId >= 0xCB && itemId < 0xF0
                ? grantStoryVehicleItem(shared.vehicles, shared.partyMembers, shared.runtimePartySlots,
                  itemId, shared.runtimeResultD5, {
                    weight: Number(readProject()?.game_data?.items?.records?.find(item => item.id === itemId)?.tank_weight?.internal_units ?? 0),
                    acceptOverload: Boolean(runtimeOverrides?.acceptVehicleOverload),
                  })
                : itemId >= 1 && itemId < 0x41 || itemId >= 0x99 && itemId < 0xCB
                  ? grantStoryPartyItem(itemId < 0x41 ? shared.partyEquipment : shared.partyInventories,
                    shared.runtimePartySlots, itemId, shared.runtimeResultD5)
                  : {d5: shared.runtimeResultD5, inserted: false, missing: "field-item-effect-service"};
            if (result.missing) {
              actor.blocked = true;
              actor.blockedReason = result.missing;
              break;
            }
            shared.runtimeResultD5 = result.d5;
            const advance = result.d5 === 0 ? 3 : operand(command, semantic.branch_operand_index);
            const runtimeResult = {frame, opcode, itemId, ...result,
              cursor: actor.cursor, nextCursor: (actor.cursor + advance) & 0xFF};
            actor.currentCommand.runtimeResult = runtimeResult;
            shared.partyItemEvents.push(runtimeResult);
            storyVmRelativeAdvance(actor, advance);
            break;
          } else if (operation === "move-actor-off-map"
              || operation === "remove-actor") {
            actor.hidden = true;
            storyVmAdvance(actor, command);
          } else if (operation === "set-direct-frame-id") {
            applyDirectFrame(actor, operand(command, 0));
            actor.screenOffsetX = 0;
            actor.screenOffsetY = 0;
            actor.hidden = false;
            storyVmAdvance(actor, command);
          } else if (operation === "set-actor-type-animation-renderer") {
            applyActorType(actor, operand(command, 0));
            actor.renderMode = "type-animation";
            actor.screenOffsetX = 0;
            actor.screenOffsetY = 0;
            actor.hidden = false;
            storyVmAdvance(actor, command);
          } else if (operation === "set-actor-type") {
            localMutation();
            actor.hidden = false;
            storyVmAdvance(actor, command);
          } else if (operation === "enter-dedicated-field-mode") {
            shared.mode = operand(command, 0);
            actor.ended = true;
            actor.blocked = true;
            actor.blockedReason = `dedicated-field-mode-${hex(shared.mode, 2)}`;
          } else if (operation === "set-actor-position") {
            localMutation();
            actor.screenOffsetX = 0;
            actor.screenOffsetY = 0;
            actor.hidden = actor.x >= 63 || actor.y >= 63;
            storyVmAdvance(actor, command);
          } else if (operation === "set-packed-camera-relative-position") {
            if (!shared.cameraKnown) {
              unsupported.add(opcode);
              actor.blocked = true;
              actor.blockedReason = "runtime-camera-tile-origin";
              break;
            }
            const packed = operand(command, 0);
            actor.x = shared.cameraTileOriginX + ((packed >> 4) & 0x0F);
            actor.y = shared.cameraTileOriginY + (packed & 0x0F);
            actor.hidden = false;
            storyVmAdvance(actor, command);
          } else if (operation === "adopt-runtime-entity-state") {
            const source = fieldMotionEntities()[operand(command, 0)];
            if (!source) {
              actor.blocked = true;
              actor.blockedReason = "runtime-field-entity-state";
              break;
            }
            // $B086–$B0A7 接管现场实体的类型、坐标与朝向，并清除现场槽。
            applyActorType(actor, source.actorType);
            actor.x = source.x;
            actor.y = source.y;
            actor.direction = source.direction;
            actor.partySlot = source.partySlot;
            actor.renderMode = "type-animation";
            actor.hidden = false;
            source.hidden = true;
            source.actorType = 0;
            storyVmAdvance(actor, command);
          } else if (operation === "transfer-actor-to-runtime-entity") {
            const target = shared.fieldEntities.find(entity => entity.partySlot === operand(command, 0));
            if (!target) {
              actor.blocked = true;
              actor.blockedReason = "runtime-field-entity-state";
              break;
            }
            Object.assign(target, {actorType: actor.actorType, x: actor.x, y: actor.y,
              palette: actor.palette, renderMode: "type-animation",
              direction: actor.direction, hidden: false, motion: null});
            actor.currentCommand.targetActor = runtimeTarget(target);
            if (target.fieldEntityIndex === 0) {
              shared.playerDirection = actor.direction;
            }
            actor.partySlot = null;
            actor.hidden = true;
            actor.y = 0x8F;
            storyVmAdvance(actor, command);
          } else if (operation === "relocate-runtime-target") {
            const target = shared.fieldEntities.find(entity => entity.partySlot === Number(shared.parameters.partySlot ?? 0));
            if (!target) {
              actor.blocked = true;
              actor.blockedReason = "runtime-field-entity-state";
              break;
            }
            shared.parameters.relocatedEntity = {index: target.fieldEntityIndex, x: target.x, y: target.y};
            actor.currentCommand.targetActor = runtimeTarget(target);
            target.x = 7;
            target.y = 8;
            storyVmAdvance(actor, command);
          } else if (operation === "clear-runtime-entity-render-slots") {
            for (const entity of [...shared.fieldEntities, ...shared.temporaryEntities]) {
              entity.actorType = 0;
              entity.hidden = true;
            }
            storyVmAdvance(actor, command);
          } else if (operation === "set-runtime-entity-move-direction") {
            const packed = operand(command, 0);
            const entity = fieldMotionEntities()[packed >>> 4];
            if (entity) {
              actor.currentCommand.targetActor = runtimeTarget(entity);
              entity.moveDirectionCode = packed & 0x0F;
            }
            storyVmRelativeAdvance(actor, 2);
          } else if (operation === "mark-ridden-vehicle-event-flags") {
            // PRG $0355A0 将人物当前战车的掩码并入 $045E。
            for (const member of shared.partyMembers) if (member.ridingVehicle
                && member.vehicleSlot >= 0 && member.vehicleSlot < 8) {
              const flagId = 0xE8 + member.vehicleSlot;
              shared.eventFlags.add(flagId);
              shared.eventFlagWrites.push({flagId, operation, frame});
            }
            storyVmAdvance(actor, command);
          } else if (operation === "play-table-driven-actor-transformation") {
            const timerKey = `transform:${actor.cursor}`;
            let transform = actor.commandTimers[timerKey];
            if (!transform || typeof transform !== "object") {
              const selector = operand(command, 0);
              const sequence = (semantic.sequences || []).find(
                item => Number(item.selector) === selector,
              );
              if (!sequence) {
                unsupported.add(opcode);
                actor.blocked = true;
                actor.blockedReason = "missing-rom-transformation-sequence";
                break;
              }
              // $B299 在装载首个时长后递增帧号。
              applyActorType(actor, Number(sequence.initial_actor_type) + 1);
              transform = {
                durationIndex: 0,
                remaining: Math.max(0, Number(sequence.durations?.[0]) || 0),
                durations: (sequence.durations || []).map(Number),
                audioEvent: sequence.audio_event || null,
              };
              actor.commandTimers[timerKey] = transform;
              emitRuntimeAudioEvent(transform.audioEvent, actor, frame);
              // PRG $035299 装载时长后返回，下一次更新才递减。
              break;
            }
            if (transform.remaining > 0) transform.remaining -= 1;
            if (transform.remaining <= 0) {
              transform.durationIndex += 1;
              if (transform.durationIndex >= transform.durations.length) {
                delete actor.commandTimers[timerKey];
                storyVmAdvance(actor, command);
              } else {
                applyActorType(actor, actor.actorType + 1);
                transform.remaining = Math.max(
                  1,
                  Number(transform.durations[transform.durationIndex]) || 1,
                );
              }
            }
            break;
          } else if (operation === "switch-scene-inside-story-state") {
            const routeIndex = Math.max(
              0,
              Number(
                shared.parameters.sceneRouteIndex
                ?? semantic.default_preview_route
                ?? 0
              ) || 0,
            );
            const route = (semantic.routes || []).find(
              item => Number(item.route_index) === routeIndex,
            );
            if (!route) {
              unsupported.add(opcode);
              actor.blocked = true;
              actor.blockedReason = "missing-rom-internal-shot-route";
              break;
            }
            const nextCameraX = Number(route.camera_tile_origin_x);
            const nextCameraY = Number(route.camera_tile_origin_y);
            const deltaX = nextCameraX - shared.cameraTileOriginX;
            const deltaY = nextCameraY - shared.cameraTileOriginY;
            for (const shiftedActor of actors) {
              shiftedActor.x += deltaX;
              shiftedActor.y += deltaY;
            }
            retainedSceneContext = null;
            shared.sceneId = Number(route.scene_id);
            shared.cameraTileOriginX = nextCameraX;
            shared.cameraTileOriginY = nextCameraY;
            shared.cameraKnown = true;
            storyVmAdvance(actor, command);
          } else if (operation === "set-motion-attributes") {
            localMutation();
            storyVmAdvance(actor, command);
          } else if (operation === "set-dialogue-actor-parameter") {
            shared.parameters.dialogueActor = operand(command, 0);
            storyVmAdvance(actor, command);
          } else if (operation === "set-global-parameter") {
            // $B066 写 CHR 影子寄存器 $1B，$D395 将其提交给 MMC3。
            if (callerEntry) shared.parameters.spritePair = operand(command, 0);
            storyVmAdvance(actor, command);
          } else if (operation === "set-story-parameter") {
            shared.parameters.storyParameter = operand(command, 0);
            storyVmAdvance(actor, command);
          } else if (operation === "set-runtime-parameter-$9c") {
            shared.parameters.runtime9c = operand(command, 0);
            storyVmAdvance(actor, command);
          } else if (operation === "set-runtime-parameter-$a2") {
            shared.parameters.runtimeA2 = operand(command, 0);
            animationStep();
            chrAnimationStep = shared.parameters.runtimeA2;
            storyVmAdvance(actor, command);
          } else if (operation === "replace-runtime-entity-scene") {
            const oldScene = operand(command, 0);
            const newScene = operand(command, 1);
            // PRG $07FD5D 只替换场景号；已加载的地图与镜头保持原值。
            retainedSceneContext ||= activeSceneContext();
            if (shared.sceneId !== newScene) {
              for (const [key, tile] of [...shared.fieldTiles]) {
                shared.fieldTiles.delete(key);
                shared.fieldTiles.set(`${newScene}:${tile.x}:${tile.y}`, {...tile, sceneId: newScene});
              }
              shared.fieldPassableTiles = new Set([...shared.fieldPassableTiles].map(key =>
                `${newScene}:${key.split(":").slice(1).join(":")}`));
            }
            shared.sceneId = newScene;
            for (const entity of shared.fieldEntities) {
              if (entity.parked?.sceneId === oldScene) entity.parked.sceneId = newScene;
            }
            storyVmAdvance(actor, command);
          } else if (operation === "write-field-tile-at-actor") {
            const x = Math.round(actor.x);
            const y = Math.round(actor.y);
            const key = `${shared.sceneId}:${x}:${y}`;
            shared.fieldTiles.set(key, {
              sceneId: Number(shared.sceneId),
              x,
              y,
              tileId: operand(command, 0),
            });
            storyVmAdvance(actor, command);
          } else if (operation === "mutate-field-tile-near-actor") {
            const document = db.peekResourceDocument(recordUid("scene", shared.sceneId), null);
            const changes = sceneInteractionTileChanges(document?.scene || document, actor, {
              pages: db.peekResourceDocument("metatile-page", null),
              sets: db.peekResourceDocument("metatile-set", null),
            }, [...shared.fieldTiles.values()]);
            for (const tile of changes) {
              const key = `${tile.sceneId}:${tile.x}:${tile.y}`;
              shared.fieldTiles.set(key, tile);
              shared.fieldPassableTiles.add(key);
            }
            storyVmAdvance(actor, command);
          } else if (operation === "toggle-player-control-lock") {
            shared.controlLock = shared.controlLock === 0 ? 0xFF : 0;
            if (shared.controlLock === 0) previewControlReleased = true;
            actor.currentCommand.controlLock = shared.controlLock;
            shared.controlSequenceStarted = true;
            storyVmAdvance(actor, command);
          } else if (operation === "wait-event-flag-set") {
            actor.currentCommand.playerCondition = {...condition,
              satisfied: shared.eventFlags.has(operand(command, 0))};
            if (shared.eventFlags.has(operand(command, 0))) {
              storyVmAdvance(actor, command);
            } else {
              break;
            }
          } else if (operation === "remove-actor-if-event-flag-set") {
            if (shared.eventFlags.has(operand(command, 0))) {
              actor.hidden = true;
              actor.ended = true;
            } else {
              storyVmAdvance(actor, command);
            }
          } else if (operation === "decrement-actor-type") {
            localMutation();
            storyVmAdvance(actor, command);
          } else if (operation === "wait") {
            storyVmAdvance(actor, command);
            actor.wait = Math.max(0, Number(semantic.frames) || 0);
            break;
          } else if (operation === "end-story-state") {
            actor.ended = true;
            requestTransition(
              sceneReloadMode,
              0,
              "end-story-state",
            );
            break;
          } else if (operation === "set-story-state") {
            actor.ended = true;
            requestTransition(
              sceneReloadMode,
              operand(command, 0),
              "set-story-state",
            );
            break;
          } else if (operation === "start-scripted-encounter") {
            const encounterFormationId = operand(command, 0);
            const eventFlag = operand(command, 1);
            const targetStoryState = operand(command, 2);
            const nextCursor = Number(command.cursor)
              + Number(command.normal_advance || 1);
            const nextCommand = (program?.commands || [])
              .find(item => Number(item.cursor) === nextCursor);
            const nextSemantic = nextCommand
              ? semantics.get(Number(nextCommand.opcode))
              : null;
            const resumesAfterExternalEvent = Boolean(
              nextCommand
              && nextSemantic?.operation === "wait-event-flag-set"
              && operand(nextCommand, 0) === eventFlag,
            );
            shared.parameters.encounterFormationId = encounterFormationId;
            shared.parameters.currentEventFlag = eventFlag;
            storyVmAdvance(actor, command);
            if (actor.scriptKind === "interaction"
                || (startsControlLocked
                  && !(targetStoryState > 0 && targetStoryState < 0x80))) {
              shared.mode = transitionProgramMode;
              shared.storyState = targetStoryState;
              shared.battleEntry = {
                formationId: encounterFormationId,
                pendingEventFlag: eventFlag,
                targetStoryState,
                actorSlot: Number(actor.actorSlot),
                scriptKind: actor.scriptKind,
                scriptId: Number(actor.scriptId),
                commandCursor: Number(command.cursor),
              };
              if (actor.scriptKind === "interaction") {
                actor.ended = true;
                completion = "battle-entry";
                break;
              }
              shared.battleEntry.assumedResult = "victory";
              // PRG $02E27D：状态 $00 保留现场，bit 7 置位清状态并重载角色表。
              const reload = (targetStoryState & 0x80) !== 0;
              requestTransition(transitionProgramMode, targetStoryState,
                "start-scripted-encounter", null, null, {
                  preserveActorScripts: !reload,
                  completedEventFlag: eventFlag,
                  encounterFormationId,
                  victoryCallback: reload ? "reload" : "resume",
                });
            } else if (resumesAfterExternalEvent) {
              requestTransition(
                transitionProgramMode,
                targetStoryState,
                "start-scripted-encounter",
                null,
                null,
                {
                  preserveActorScripts: true,
                  completedEventFlag: eventFlag,
                  encounterFormationId,
                },
              );
            } else {
              actor.ended = true;
              requestTransition(
                transitionProgramMode,
                targetStoryState,
                "start-scripted-encounter",
                null,
                null,
                {
                  completedEventFlag: eventFlag,
                  encounterFormationId,
                },
              );
            }
            break;
          } else if (operation === "clear-story-state-and-mode") {
            actor.ended = true;
            requestTransition(
              fieldRefreshMode,
              0,
              "clear-story-state-and-mode",
            );
            break;
          } else if (operation === "end-story-state-with-scene-context") {
            actor.ended = true;
            requestTransition(
              sceneReloadMode,
              0,
              "end-story-state-with-scene-context",
              {
                sceneId: operand(command, 0),
                cameraTileOriginX: sceneCameraCoordinate(operand(command, 0), operand(command, 1)),
                cameraTileOriginY: sceneCameraCoordinate(operand(command, 0), operand(command, 2)),
              },
            );
            break;
          } else {
            storyVmAdvance(actor, command);
          }
          command = (program?.commands || [])
            .find(item => Number(item.cursor) === actor.cursor);
        }
        if (!command) actor.ended = true;
        if (shared.globalWait > 0) break;
      }
      refreshWanderRandom(frame);
      if (initialActorTicks) {
        const snapshot = captureFrame();
        initializationFrames.push({variantId: snapshot.variantId, actors: snapshot.actors});
        initialActorTicks -= 1;
        if (!initialActorTicks) {
          appendFrame();
          frames.at(-1).initializationFrames = initializationFrames.splice(0);
          if (fieldPresentation) fieldPresentation.tick += 1;
        }
        continue;
      }
      appendFrame();
      if (entryCheckpoint?.(frames.at(-1))) {
        completion = "entry-checkpoint";
        break;
      }
      if (controlReturnedFrame !== null) {
        if (!afterControlRemaining) completion = returnedCompletion;
        continue;
      }
      if (!completion && shared.globalWait <= 0 && !shared.transition
          && !scriptedFieldStep && !shared.scriptedInput && !fieldInputStep && !terrainStep
          && actors.every(actor => actor.ended || actor.blocked)) {
        if (isControlReturned() || (shared.parameters.completedEncounterEventFlag !== undefined
            && shared.storyState === 0 && shared.controlLock === 0 && shared.mode === fieldMode
            && shared.controlReturnGuard <= 0)) {
          controlReturnedFrame = frames.length - 1;
          if (!afterControlRemaining) completion = "control-returned";
          continue;
        }
        const nextEventVariantId = activeVariant.next_event_variant_id;
        const nextEventFlag = activeVariant.next_event_flag;
        const nextEventVariant = nextEventVariantId === null
          || nextEventVariantId === undefined
          ? null
          : variants.get(Number(nextEventVariantId));
        if (!actors.some(actor => actor.blocked)
            && shared.controlLock !== 0
            && nextEventVariant
            && shared.eventFlags.has(Number(nextEventFlag))) {
          const nextContext = nextEventVariant.scene_contexts?.find(
            item => Number(item.scene_id)
              === Number(nextEventVariant.selection?.scene_id),
          ) || nextEventVariant.scene_contexts?.[0] || null;
          requestTransition(
            sceneReloadMode,
            0,
            "scripted-input-locked-scene-continuation",
            nextContext
              ? {
                sceneId: Number(nextContext.scene_id),
                cameraTileOriginX: Number(
                  nextContext.camera_tile_origin_x ?? 0,
                ),
                cameraTileOriginY: Number(
                  nextContext.camera_tile_origin_y ?? 0,
                ),
              }
              : null,
            Number(nextEventVariant.id),
          );
        } else {
          const blockedActors = actors.filter(actor => actor.blocked);
          const dedicatedModeReached = isDedicatedModeReached();
          const result = blockedActors.length
            ? dedicatedModeReached
              ? "dedicated-field-mode"
              : "blocked-on-unknown-handler"
            : interactionTrigger && shared.storyState === 0
                && shared.controlLock === 0 && shared.mode === fieldMode
              ? "interaction-returned"
            : shared.storyState > 0 && shared.storyState < 0x80
              ? "waiting-for-story-continuation"
            : startsControlLocked
              ? "story-state-stalled"
              : "ambient-settled";
          if (result === "interaction-returned" && afterControlRemaining) {
            returnedCompletion = result;
            controlReturnedFrame = frames.length - 1;
          } else completion = result;
        }
      }
    }
    while (emittedFrames < frames.length) yield frameEffect(frames[emittedFrames++]);
    const shots = [];
    let previousShotSignature = null;
    frames.forEach((snapshot, frame) => {
      const signature = `${Number(snapshot.variantId)}:${Number(snapshot.sceneId)}`;
      if (signature === previousShotSignature) return;
      previousShotSignature = signature;
      shots.push({
        frame,
        variantId: Number(snapshot.variantId),
        sceneId: Number(snapshot.sceneId),
        context: snapshot.context || null,
      });
    });
    const result = {
      frames,
      eventFlagWrites: shared.eventFlagWrites,
      duration: Math.max(1, frames.length),
      unsupported: [...unsupported].sort((a, b) => a - b),
      blockedActors: actors
        .filter(actor => actor.blocked)
        .map(actor => actor.actorSlot),
      blockedReasons: actors
        .filter(actor => actor.blocked)
        .map(actor => actor.blockedReason)
        .filter(Boolean),
      finalControlState: {
        storyState: shared.storyState,
        controlLock: shared.controlLock,
        scriptedInput: shared.scriptedInput,
        mode: shared.mode,
        actorListId: shared.actorListId,
        eventFlags: [...shared.eventFlags]
          .sort((left, right) => left - right),
      },
      completion,
      loopStart,
      executionSteps,
      executionElapsedMs: performance.now() - executionStartedAt,
      executionStop,
      controlReturned: completion === "control-returned",
      controlReturnedFrame,
      uiAutoInputs,
      audioEvents,
      finalAudioState: {...shared.audioState},
      battleEntry: shared.battleEntry ? {...shared.battleEntry} : null,
      shots,
    };
    if (!entryCheckpoint && !externalServices) storyVmCompilationCache.set(cacheKey, result);
    return result;
  }

  const storySequenceShotIdentity = shot => {
    const variantId = Number(shot?.variant_id ?? shot?.variantId);
    const sceneId = Number(shot?.scene_id ?? shot?.sceneId);
    return Number.isInteger(variantId) && Number.isInteger(sceneId)
      ? `${variantId}:${sceneId}` : null;
  };

  function storyCompiledShotRange(compiled, identity) {
    const shots = compiled?.shots || [];
    const index = shots.findIndex(
      shot => storySequenceShotIdentity(shot) === identity,
    );
    if (index < 0) return null;
    const start = Math.max(0, Number(shots[index].frame) || 0);
    const end = index + 1 < shots.length
      ? Math.max(start + 1, Number(shots[index + 1].frame) || 0)
      : compiled.frames.length;
    return end > start ? {start, end} : null;
  }

  function storyVariantPersistentBranchFlags(variant) {
    const programs = storyVmProgramMap();
    const semantics = storyVmSemanticsMap();
    const clearedOnReload = new Set(
      (storyBrowserVm().control_state_model
        ?.scene_reload_cleared_event_flags || []).map(Number),
    );
    const flags = new Set();
    for (const actor of variant?.actors || []) {
      const program = programs.get(Number(actor.autonomous_script_id));
      for (const command of program?.commands || []) {
        const operation = semantics.get(Number(command.opcode))?.operation;
        if (![
          "branch-if-event-flag-clear",
          "remove-actor-if-event-flag-set",
        ].includes(operation)) continue;
        const [flag] = command.currentOperands || storyVmEffectiveBytes(
          Number(command.prg_offset) + 1,
          (command.operands || []).length,
        );
        if (Number.isInteger(flag) && !clearedOnReload.has(flag)) flags.add(flag);
      }
    }
    return [...flags].sort((left, right) => left - right);
  }

  function storyRouteFlagCandidates(variant, initialFlags) {
    const existing = new Set(initialFlags.map(Number));
    const flags = storyVariantPersistentBranchFlags(variant)
      .filter(flag => !existing.has(flag))
      .slice(0, 8);
    const candidates = flags.map(flag => [flag]);
    for (let left = 0; left < flags.length; left += 1) {
      for (let right = left + 1; right < flags.length; right += 1) {
        candidates.push([flags[left], flags[right]]);
      }
    }
    return candidates.map(candidate => [...new Set([
      ...initialFlags,
      ...candidate,
    ])].sort((left, right) => left - right));
  }

  function storyInteractionBootstrapFlags(actorListId) {
    const candidate = (
      storyBrowserVm().caller_audit?.control_lock_actor_list_candidates || []
    ).find(item => Number(item.actor_list_id) === Number(actorListId));
    const signatures = new Map();
    for (const bootstrap of candidate?.interaction_bootstraps || []) {
      const flags = [...new Set((bootstrap.set_event_flags || [])
        .map(Number)
        .filter(Number.isInteger))]
        .sort((left, right) => left - right);
      if (!flags.length) continue;
      signatures.set(flags.join(","), flags);
    }
    return signatures.size === 1 ? [...signatures.values()][0] : null;
  }

  function storyEncounterCompletionFlags(variant) {
    const programs = storyVmProgramMap();
    const semantics = storyVmSemanticsMap();
    const flags = new Set();
    for (const actor of variant?.actors || []) {
      const program = programs.get(Number(actor.autonomous_script_id));
      for (const command of program?.commands || []) {
        if (semantics.get(Number(command.opcode))?.operation
            !== "start-scripted-encounter") continue;
        const operands = command.currentOperands || storyVmEffectiveBytes(
          Number(command.prg_offset) + 1,
          (command.operands || []).length,
        );
        const flag = Number(operands[1]);
        if (Number.isInteger(flag)) flags.add(flag);
      }
    }
    return [...flags].sort((left, right) => left - right);
  }

  const storyFrameDialogueRecordIds = frames => [...new Set(
    frames.map(frame => Number(
      frame.dialogue?.recordId ?? frame.dialogue?.record_id,
    )).filter(Number.isInteger),
  )].sort((left, right) => left - right);

  const storyFrameDialogueIdentity = dialogue => {
    const regionId = Number(dialogue?.regionId ?? dialogue?.region_id);
    const recordId = Number(dialogue?.recordId ?? dialogue?.record_id);
    return dialogue?.recordFound !== false
        && Number.isInteger(regionId) && regionId >= 0
        && Number.isInteger(recordId) && recordId >= 0
      ? `${regionId}:${recordId}` : null;
  };

  function storyCompiledDialogueRuns(compiled, range, preserveOccurrences = false) {
    const runs = [];
    let activeRun = null;
    for (let frame = range.start; frame < range.end; frame += 1) {
      const dialogue = compiled.frames[frame]?.dialogue || null;
      const identity = storyFrameDialogueIdentity(dialogue);
      if (!identity) {
        activeRun = null;
        continue;
      }
      const occurrence = preserveOccurrences ? JSON.stringify([
        compiled.frames[frame]?.variantId, dialogue.sourceVariantId, dialogue.actorSlot,
        dialogue.scriptId, dialogue.commandCursor, dialogue.opcode,
        dialogue.totalWaitFrames, dialogue.prefixRecordId,
      ]) : null;
      if (!activeRun || activeRun.identity !== identity || activeRun.occurrence !== occurrence) {
        activeRun = {
          identity,
          occurrence,
          start: frame,
          end: frame + 1,
          regionId: Number(dialogue.regionId ?? dialogue.region_id),
          recordId: Number(dialogue.recordId ?? dialogue.record_id),
          sourceVariantId: Number(dialogue.sourceVariantId),
          actorSlot: Number(dialogue.actorSlot),
          scriptId: Number(dialogue.scriptId),
          commandCursor: Number(dialogue.commandCursor),
          opcode: Number(dialogue.opcode),
        };
        runs.push(activeRun);
        continue;
      }
      activeRun.end = frame + 1;
    }
    return runs;
  }

  const storyDialogueCommandHasProvenance = command => [
    command?.sourceVariantId,
    command?.scriptId,
    command?.commandCursor,
    command?.opcode,
  ].every(Number.isInteger);

  /**
   * Some ROM shot chains include the next shot's opening dialogue as an actor
   * rendezvous in the preceding list.  When two adjacent declared actor shots
   * start with the same record but then diverge, retain the first shot's later
   * action and VM state while removing only that overlapping visible UI wait.
   */
  function collapseRepeatedActorShotDialoguePrefix(compiled, declaredShots) {
    const overlaps = [];
    for (let shotIndex = 0; shotIndex + 1 < declaredShots.length; shotIndex += 1) {
      const earlierShot = compiled.shots?.[shotIndex];
      const laterShot = compiled.shots?.[shotIndex + 1];
      if (storySequenceShotIdentity(earlierShot)
          !== storySequenceShotIdentity(declaredShots[shotIndex])
          || storySequenceShotIdentity(laterShot)
            !== storySequenceShotIdentity(declaredShots[shotIndex + 1])) {
        continue;
      }
      const earlierRange = {
        start: Math.max(0, Number(earlierShot.frame) || 0),
        end: Math.max(0, Number(laterShot.frame) || 0),
      };
      const laterRange = {
        start: earlierRange.end,
        end: shotIndex + 2 < compiled.shots.length
          ? Math.max(earlierRange.end, Number(
            compiled.shots[shotIndex + 2].frame,
          ) || 0)
          : compiled.frames.length,
      };
      const earlierRuns = storyCompiledDialogueRuns(compiled, earlierRange);
      const laterRuns = storyCompiledDialogueRuns(compiled, laterRange);
      if (earlierRuns.length < 2 || laterRuns.length < 2) continue;
      const [earlierPrefix, earlierNext] = earlierRuns;
      const [laterPrefix, laterNext] = laterRuns;
      const prefixContainsAudioEvent = (compiled.audioEvents || []).some(event => (
        Number(event.frame) >= earlierPrefix.start
        && Number(event.frame) < earlierPrefix.end
      ));
      if (earlierPrefix.identity !== laterPrefix.identity
          || earlierPrefix.identity === earlierNext.identity
          || laterPrefix.identity === laterNext.identity
          || earlierNext.identity === laterNext.identity
          || earlierPrefix.sourceVariantId !== Number(earlierShot.variantId)
          || laterPrefix.sourceVariantId !== Number(laterShot.variantId)
          || prefixContainsAudioEvent
          || !storyDialogueCommandHasProvenance(earlierPrefix)
          || !storyDialogueCommandHasProvenance(laterPrefix)) {
        continue;
      }
      overlaps.push({
        ...earlierPrefix,
        duplicateOf: {
          sourceVariantId: laterPrefix.sourceVariantId,
          actorSlot: laterPrefix.actorSlot,
          scriptId: laterPrefix.scriptId,
          commandCursor: laterPrefix.commandCursor,
          opcode: laterPrefix.opcode,
        },
        reason: "adjacent-actor-shot-leading-dialogue-overlap",
      });
    }
    if (!overlaps.length) return compiled;

    const removed = new Uint8Array(compiled.frames.length);
    for (const overlap of overlaps) {
      for (let frame = overlap.start; frame < overlap.end; frame += 1) {
        removed[frame] = 1;
      }
    }
    const keptBefore = new Uint32Array(compiled.frames.length + 1);
    for (let frame = 0; frame < compiled.frames.length; frame += 1) {
      keptBefore[frame + 1] = keptBefore[frame] + (removed[frame] ? 0 : 1);
    }
    const remapBoundary = sourceFrame => keptBefore[Math.max(
      0,
      Math.min(compiled.frames.length, Number(sourceFrame) || 0),
    )];
    const frames = [];
    compiled.frames.forEach((source, sourceFrame) => {
      if (removed[sourceFrame]) return;
      const frame = frames.length;
      frames.push({
        ...source,
        audioEvents: (source.audioEvents || []).map(event => ({
          ...event,
          frame,
        })),
      });
    });
    const remapTimedItems = items => (items || []).filter(item => {
      const frame = Number(item.frame);
      return Number.isInteger(frame) && frame >= 0
        && frame < removed.length && !removed[frame];
    }).map(item => ({
      ...item,
      frame: Number(remapBoundary(item.frame)),
    }));
    const remapShots = shots => (shots || []).map(shot => ({
      ...shot,
      frame: Number(remapBoundary(shot.frame)),
    }));
    const collapsedDialogueCommands = [
      ...(compiled.collapsedDialogueCommands || []),
      ...overlaps.map(overlap => ({
        sourceVariantId: overlap.sourceVariantId,
        actorSlot: overlap.actorSlot,
        scriptId: overlap.scriptId,
        commandCursor: overlap.commandCursor,
        opcode: overlap.opcode,
        regionId: overlap.regionId,
        recordId: overlap.recordId,
        sourceFrameStart: overlap.start,
        sourceFrameEnd: overlap.end,
        removedFrameCount: overlap.end - overlap.start,
        duplicateOf: {...overlap.duplicateOf},
        reason: overlap.reason,
      })),
    ];
    const loopStart = compiled.loopStart !== null
        && compiled.loopStart !== undefined
        && Number.isInteger(Number(compiled.loopStart))
      ? Math.min(
        Math.max(0, frames.length - 1),
        Number(remapBoundary(compiled.loopStart)),
      )
      : compiled.loopStart;
    return {
      ...compiled,
      frames,
      duration: Math.max(1, frames.length),
      shots: remapShots(compiled.shots),
      ...(compiled.storyShots
        ? {storyShots: remapShots(compiled.storyShots)} : {}),
      uiAutoInputs: remapTimedItems(compiled.uiAutoInputs),
      audioEvents: remapTimedItems(compiled.audioEvents),
      eventFlagWrites: (compiled.eventFlagWrites || []).map(item => ({
        ...item, frame: Number(remapBoundary(item.frame)),
      })),
      loopStart,
      collapsedDialogueCommands,
    };
  }

  /**
   * A published narrative association may cross a runtime rendezvous rather
   * than a literal scene transition.  Reconstruct only routes the ROM scripts
   * themselves prove: a minimal persistent-flag branch into the ordinary
   * continuation, its unique interaction bootstrap, and the encounter result
   * flag.  A later scene-event actor list is a consequence, not another shot,
   * unless the VM reaches it naturally.
   */
  function compileDeclaredStorySequence(
    sequence,
    entryVariant,
    runtimeOverrides,
  ) {
    prepareStoryVmCompilation();
    const runtimeParty = runtimePartyConfiguration(runtimeOverrides);
    const normalizedOverrides = {
      ...(runtimeOverrides || {}),
      partySlots: [...runtimeParty.slots],
      partyMembers: runtimeParty.members,
      independentEntryActorListId: sequence?.independent_entry_actor_list_id,
      ...(sequence?.interaction_trigger
        ? {interactionTrigger: sequence.interaction_trigger} : {}),
    };
    const declaredShots = (sequence?.shots || []).filter(
      shot => storySequenceShotIdentity(shot) !== null,
    );
    const direct = buildStoryVmVariant(entryVariant, normalizedOverrides);
    if (normalizedOverrides.eventFlags !== undefined) return direct;
    if (declaredShots.length <= 1 || (direct.controlReturned
        && entryVariant.sequence_completion === "scene-reload-chain-control-return")) return direct;
    const directChainComplete = declaredShots.every((shot, index) => (
      storySequenceShotIdentity(direct.shots?.[index])
        === storySequenceShotIdentity(shot)
    ));
    if (directChainComplete) {
      const eventFlags = runtimeEventFlags(normalizedOverrides);
      const cameraX = Number(normalizedOverrides.cameraTileOriginX);
      const cameraY = Number(normalizedOverrides.cameraTileOriginY);
      const cameraSignature = Number.isFinite(cameraX) && Number.isFinite(cameraY)
        ? `${cameraX}:${cameraY}` : "published";
      const playerSignature = runtimePlayerSignature(normalizedOverrides);
      const cacheKey = `${String(sequence.id)}|declared-direct|variant:${
        Number(entryVariant.id)}|party:${runtimePartySignature(runtimeParty)
      }|party-items:${runtimePartyItemSignature(normalizedOverrides)}|shots:${declaredShots.map(storySequenceShotIdentity).join(">")
      }|flags:${eventFlags.join(",")}|camera:${cameraSignature
      }|player:${playerSignature}|independent-entry:${sequence?.independent_entry_actor_list_id ?? "none"}|wait-assumptions:${JSON.stringify(normalizedOverrides.waitAssumptions || [])}|preview-inputs:${JSON.stringify(normalizedOverrides.previewFieldInputs ?? null)}|presentation-inputs:${JSON.stringify([normalizedOverrides.previewEntryWaitFrames, normalizedOverrides.previewUiInputs, normalizedOverrides.runtimeResultD5, normalizedOverrides.wanderRandomState, normalizedOverrides.randomSeed, normalizedOverrides.randomCallsPerFrame, normalizedOverrides.renderFrameParityOffset, normalizedOverrides.previewAfterControlFrames])}`;
      const cached = storyVmSequenceCompilationCache.get(cacheKey);
      if (cached) return cached;
      const collapsed = collapseRepeatedActorShotDialoguePrefix(
        direct,
        declaredShots,
      );
      storyVmSequenceCompilationCache.set(cacheKey, collapsed);
      return collapsed;
    }

    const variants = new Map(
      storyVmAllActorLists().map(item => [Number(item.id), item]),
    );
    const continuationShot = declaredShots[1];
    const continuation = variants.get(Number(continuationShot?.variant_id));
    if (!continuation) return direct;
    const directEntryRange = storyCompiledShotRange(
      direct,
      storySequenceShotIdentity(declaredShots[0]),
    );
    if (!directEntryRange) return direct;
    const directTerminalFrame = direct.frames[Math.max(
      directEntryRange.start,
      directEntryRange.end - 1,
    )];
    if (!directTerminalFrame) return direct;
    const initialOverrideFlags = runtimeEventFlags(normalizedOverrides);
    const cameraSignature = Number.isFinite(Number(
      normalizedOverrides.cameraTileOriginX,
    )) && Number.isFinite(Number(normalizedOverrides.cameraTileOriginY))
      ? `${Number(normalizedOverrides.cameraTileOriginX)}:${
        Number(normalizedOverrides.cameraTileOriginY)}` : "published";
    const playerSignature = runtimePlayerSignature(normalizedOverrides);
    const cacheKey = `${String(sequence.id)}|state-routed|party:${
      runtimePartySignature(runtimeParty)}|flags:${initialOverrideFlags.join(",")
    }|camera:${cameraSignature}|player:${playerSignature}|party-items:${runtimePartyItemSignature(normalizedOverrides)}|wait-assumptions:${JSON.stringify(normalizedOverrides.waitAssumptions || [])}|preview-inputs:${JSON.stringify(normalizedOverrides.previewFieldInputs ?? null)}|presentation-inputs:${JSON.stringify([normalizedOverrides.previewEntryWaitFrames, normalizedOverrides.previewUiInputs, normalizedOverrides.runtimeResultD5, normalizedOverrides.wanderRandomState, normalizedOverrides.randomSeed, normalizedOverrides.randomCallsPerFrame, normalizedOverrides.renderFrameParityOffset, normalizedOverrides.previewAfterControlFrames])}`;
    const cached = storyVmSequenceCompilationCache.get(cacheKey);
    if (cached) return cached;

    const continuationIdentity = storySequenceShotIdentity(continuationShot);
    let routed = null;
    let routedEntryRange = null;
    let routedContinuationRange = null;
    let routedFlags = null;
    for (const eventFlags of storyRouteFlagCandidates(
      entryVariant,
      initialOverrideFlags,
    )) {
      const candidate = buildStoryVmVariant(entryVariant, {
        ...normalizedOverrides,
        eventFlags,
        // 持久 flag 续演会跳过入口的 scripted-input 镜头段，因此必须继承
        // 第一段真实终点；重新使用场景入口会让所有 $3F 相机相对角色一起错位。
        cameraTileOriginX: Number(directTerminalFrame.cameraTileOriginX),
        cameraTileOriginY: Number(directTerminalFrame.cameraTileOriginY),
      });
      const entryRange = storyCompiledShotRange(
        candidate,
        storySequenceShotIdentity(declaredShots[0]),
      );
      const continuationRange = storyCompiledShotRange(
        candidate,
        continuationIdentity,
      );
      if (!entryRange || !continuationRange) continue;
      routed = candidate;
      routedEntryRange = entryRange;
      routedContinuationRange = continuationRange;
      routedFlags = eventFlags;
      break;
    }
    const bootstrapFlags = storyInteractionBootstrapFlags(continuation.id);
    if (!routed || !bootstrapFlags?.length) {
      storyVmSequenceCompilationCache.set(cacheKey, direct);
      return direct;
    }

    const inheritedFlags = routed.frames[routedContinuationRange.start]
      ?.eventFlags || routed.finalControlState.eventFlags || routedFlags;
    const continuationInitialFlags = [...new Set([
      ...inheritedFlags.map(Number),
      ...bootstrapFlags.map(Number),
    ])].sort((left, right) => left - right);
    const continuationCompiled = buildStoryVmVariant(continuation, {
      ...normalizedOverrides,
      eventFlags: continuationInitialFlags,
    });
    const encounterFlags = storyEncounterCompletionFlags(continuation)
      .filter(flag => !continuationInitialFlags.includes(flag));
    const encounterCompletedAt = continuationCompiled.frames.findIndex(frame => (
      encounterFlags.some(flag => (frame.eventFlags || []).includes(flag))
    ));
    if (encounterCompletedAt <= 0) {
      storyVmSequenceCompilationCache.set(cacheKey, direct);
      return direct;
    }

    const frames = [];
    const unsupported = new Set();
    const blockedReasons = new Set();
    const uiAutoInputs = [];
    const audioEvents = [];
    const eventFlagWrites = [];
    const appendRange = (compiled, range, phaseIndex) => {
      const frameOffset = frames.length;
      compiled.frames.slice(range.start, range.end).forEach(source => frames.push({
        ...source,
        storyPhaseIndex: phaseIndex,
        storyPhaseCount: 3,
        stateRoutedSequenceBoundary: true,
      }));
      compiled.unsupported.forEach(value => unsupported.add(Number(value)));
      compiled.blockedReasons.forEach(reason => blockedReasons.add(reason));
      for (const [sourceName, target] of [
        ["uiAutoInputs", uiAutoInputs],
        ["audioEvents", audioEvents],
        ["eventFlagWrites", eventFlagWrites],
      ]) {
        (compiled[sourceName] || []).filter(item => (
          Number(item.frame) >= range.start && Number(item.frame) < range.end
        )).forEach(item => target.push({
          ...item,
          frame: frameOffset + Number(item.frame) - range.start,
        }));
      }
      return {start: frameOffset, end: frames.length};
    };
    const phaseRanges = [
      appendRange(direct, directEntryRange, 0),
      appendRange(routed, routedEntryRange, 1),
      appendRange(
        continuationCompiled,
        {start: 0, end: continuationCompiled.frames.length},
        2,
      ),
    ];

    const firstSceneName = declaredShots[0].scene_name
      || declaredShots[0].scene_id_hex;
    const continuationSceneName = continuationShot.scene_name
      || continuationShot.scene_id_hex;
    const phaseSpecifications = [
      {
        variant: entryVariant,
        storyState: declaredShots[0].story_state,
        sceneName: firstSceneName,
        eventFlags: initialOverrideFlags,
        operation: "initial-story-state",
        phaseLabel: "初始演出",
      },
      {
        variant: entryVariant,
        storyState: declaredShots[0].story_state,
        sceneName: firstSceneName,
        eventFlags: routedFlags,
        operation: "persistent-flag-continuation",
        phaseLabel: "状态续演",
      },
      {
        variant: continuation,
        storyState: 0,
        sceneName: continuationSceneName,
        eventFlags: continuationInitialFlags,
        operation: "interaction-encounter-and-aftermath",
        phaseLabel: "交互战斗",
      },
    ];
    const shots = phaseSpecifications.map((phase, phaseIndex) => {
      const range = phaseRanges[phaseIndex];
      const first = frames[range.start];
      const variantId = Number(phase.variant.id);
      const sceneId = Number(first?.sceneId ?? continuationShot.scene_id);
      return {
        frame: range.start,
        variantId,
        variant_id: variantId,
        variant_id_hex: phase.variant.id_hex || hex(variantId, 2),
        sceneId,
        scene_id: sceneId,
        scene_id_hex: first?.context?.scene_id_hex || hex(sceneId, 2),
        context: first?.context || null,
        story_state: Number(phase.storyState) || 0,
        story_state_hex: Number(phase.storyState)
          ? hex(Number(phase.storyState), 2) : hex(0, 2),
        scene_name: phase.sceneName,
        publishedSceneName: phase.sceneName,
        shot_index: phaseIndex,
        stageId: `state-routed-phase-${phaseIndex}`,
        operation: phase.operation,
        kind: phase.operation,
        phase_label: phase.phaseLabel,
        event_flags: [...phase.eventFlags],
        dialogue_record_ids: storyFrameDialogueRecordIds(
          frames.slice(range.start, range.end),
        ),
        stateRoutedSequenceBoundary: true,
      };
    });
    const sourceLoopStart = Number(continuationCompiled.loopStart);
    const loopStart = Number.isInteger(sourceLoopStart)
      ? phaseRanges[2].start + sourceLoopStart
      : null;
    const result = {
      frames,
      duration: frames.length,
      unsupported: [...unsupported].sort((left, right) => left - right),
      blockedActors: [...(continuationCompiled.blockedActors || [])],
      blockedReasons: [...blockedReasons],
      finalControlState: {...continuationCompiled.finalControlState},
      completion: "state-routed-story-preview",
      eventFlagWrites,
      loopStart,
      controlReturned: false,
      uiAutoInputs,
      audioEvents,
      finalAudioState: {...continuationCompiled.finalAudioState},
      shots,
      storyShots: shots,
      stateRoutedSequencePreview: true,
      stateRouteSource: "rom-script-branch-and-interaction-state",
      stateRouteEventFlags: routedFlags,
      encounterCompletionFlags: encounterFlags,
      excludedPublishedConsequenceShots: declaredShots.slice(2).map(shot => ({
        variantId: Number(shot.variant_id),
        sceneId: Number(shot.scene_id),
      })),
      directCompletion: direct.completion,
    };
    storyVmSequenceCompilationCache.set(cacheKey, result);
    return result;
  }

  const storySequenceAudioCache = new WeakMap();

  function buildStoryVmSequence(sequence, entryVariant, runtimeOverrides = null) {
    runtimeOverrides = storyPreviewRuntimeOverrides(runtimeOverrides, storyPartyMembers());
    if (!storyVmCompilationDepth) storyVmItemInputsSignature = null;
    prepareStoryVmCompilation();
    storyVmCompilationDepth += 1;
    try {
      return buildStoryVmSequenceAudio(sequence, entryVariant, runtimeOverrides);
    } finally {
      storyVmCompilationDepth -= 1;
      if (!storyVmCompilationDepth) storyVmItemInputsSignature = null;
    }
  }

  function buildStoryVmSequenceAudio(sequence, entryVariant, runtimeOverrides) {
    entryVariant = storyVmEntryVariant(sequence, entryVariant);
    const source = compileStoryVmSequence(sequence, entryVariant, runtimeOverrides);
    const cached = storySequenceAudioCache.get(source);
    if (cached) return cached;
    const audioState = initialStoryAudioState();
    const audioStateFields = Object.keys(audioState).filter(key => key !== 'lastEvent');
    const eventSignatures = new WeakMap();
    const eventSignature = event => {
      if (!event || typeof event !== 'object') return JSON.stringify(event);
      if (!eventSignatures.has(event)) eventSignatures.set(event, JSON.stringify(event));
      return eventSignatures.get(event);
    };
    const audioEvents = [];
    const eventsByFrame = new Map();
    for (const event of source.audioEvents || []) {
      if (!eventsByFrame.has(event.frame)) eventsByFrame.set(event.frame, []);
      eventsByFrame.get(event.frame).push(event);
    }
    let previousScene = null;
    const frames = source.frames.map((snapshot, frame) => {
      const sceneChanged = Number(snapshot.sceneId) !== previousScene;
      let events = (eventsByFrame.get(frame) || []).filter(event =>
        event.dispatch !== "scene-entry-music" || sceneChanged);
      if (!source.endingAnimation && sceneChanged && !events.some(event => event.dispatch === "scene-entry-music")) {
        const entry = sceneEntryAudioEvent(snapshot.sceneId, snapshot.eventFlags);
        if (entry) events = [entry, ...events];
      }
      previousScene = Number(snapshot.sceneId);
      const currentEvents = events.map(event => ({...applyStoryAudioEvent(audioState, event), frame}));
      if (currentEvents.length) audioState.lastEvent = currentEvents.at(-1);
      audioEvents.push(...currentEvents);
      const unchanged = snapshot.audioState && audioStateFields.every(key => snapshot.audioState[key] === audioState[key])
        && eventSignature(snapshot.audioState.lastEvent) === eventSignature(audioState.lastEvent)
        && currentEvents.length === snapshot.audioEvents?.length
        && currentEvents.every((event, index) => eventSignature(event) === eventSignature(snapshot.audioEvents[index]));
      const result = unchanged ? snapshot : {...snapshot, audioState: {...audioState}, audioEvents: currentEvents};
      advanceStoryAudioState(audioState);
      return result;
    });
    const result = {...source, frames, audioEvents, finalAudioState: {...audioState}};
    storySequenceAudioCache.set(source, result);
    return result;
  }

  function compileStoryVmSequence(
    sequence,
    entryVariant,
    runtimeOverrides = null,
  ) {
    entryVariant = storyVmEntryVariant(sequence, entryVariant);
    const animation = sequence?.ending_animation;
    if (!animation) {
      return compileDeclaredStorySequence(
        sequence,
        entryVariant,
        runtimeOverrides,
      );
    }
    prepareStoryVmCompilation();
    const runtimeParty = runtimePartyConfiguration(runtimeOverrides);
    const normalizedOverrides = {
      ...(runtimeOverrides || {}),
      partySlots: [...runtimeParty.slots],
      partyMembers: runtimeParty.members,
    };
    const initialOverrideFlags = runtimeEventFlags(normalizedOverrides);
    const endingBranch = animation.branches?.find(branch => branch.value ===
      (normalizedOverrides.eventFlags === undefined || initialOverrideFlags.includes(Number(branch.event_flag))));
    const timeline = (animation.timeline || []).filter(stage => stage.ending_branch === undefined
      || stage.ending_branch === endingBranch?.value);
    const overrideCameraX = Number(normalizedOverrides.cameraTileOriginX);
    const overrideCameraY = Number(normalizedOverrides.cameraTileOriginY);
    const hasRuntimeCameraOverride = Number.isFinite(overrideCameraX)
      && Number.isFinite(overrideCameraY);
    const overrideCameraSignature = hasRuntimeCameraOverride
      ? `${overrideCameraX}:${overrideCameraY}` : "published";
    const overridePlayerX = Number(normalizedOverrides.playerMapX);
    const overridePlayerY = Number(normalizedOverrides.playerMapY);
    const hasRuntimePlayerOverride = normalizedOverrides.playerMapX !== null
      && normalizedOverrides.playerMapX !== undefined
      && normalizedOverrides.playerMapY !== null
      && normalizedOverrides.playerMapY !== undefined
      && Number.isFinite(overridePlayerX)
      && Number.isFinite(overridePlayerY);
    const overridePlayerSignature = hasRuntimePlayerOverride
      ? `${overridePlayerX}:${overridePlayerY}:${String(
        normalizedOverrides.playerDirection || "published-direction",
      )}`
      : "published";
    const cacheKey = `${String(sequence.id)}|party:${
      runtimePartySignature(runtimeParty)}|flags:${initialOverrideFlags.join(",")
    }|camera:${overrideCameraSignature}|player:${overridePlayerSignature}|party-items:${runtimePartyItemSignature(normalizedOverrides)}|wait-assumptions:${JSON.stringify(normalizedOverrides.waitAssumptions || [])}|preview-inputs:${JSON.stringify(normalizedOverrides.previewFieldInputs ?? null)}|presentation-inputs:${JSON.stringify([normalizedOverrides.previewEntryWaitFrames, normalizedOverrides.previewUiInputs, normalizedOverrides.runtimeResultD5, normalizedOverrides.wanderRandomState, normalizedOverrides.randomSeed, normalizedOverrides.randomCallsPerFrame, normalizedOverrides.renderFrameParityOffset, normalizedOverrides.previewAfterControlFrames])}`;
    const cached = storyVmSequenceCompilationCache.get(cacheKey);
    if (cached) return cached;

    const variants = new Map(
      storyVmAllActorLists().map(item => [Number(item.id), item]),
    );
    const sceneContexts = new Map(
      (animation.scene_contexts || []).map(
        context => [Number(context.scene_id), context],
      ),
    );
    const frames = [];
    const shots = [];
    const unsupported = new Set();
    const blockedReasons = [];
    const uiAutoInputs = [];
    const audioEvents = [];
    const eventFlagWrites = [];
    const audioState = initialStoryAudioState();
    let loopStart = null;

    const applySequenceAudioEvents = (events, frameIndex) => (
      events || []
    ).filter(event => !endingBranch || event.branch === 'shared-before-event-6f-test'
      || event.branch === (endingBranch.value ? 'event-6f-set-maximal-content' : 'event-6f-clear-alternate')
      || event.branch === undefined).map(sourceEvent => {
      const event = {
        ...applyStoryAudioEvent(audioState, sourceEvent),
        frame: frameIndex,
      };
      audioState.lastEvent = event;
      audioEvents.push(event);
      return event;
    });

    const pushShot = (stage, snapshot) => {
      shots.push({
        frame: frames.length,
        variantId: Number(snapshot.variantId),
        sceneId: Number(snapshot.sceneId),
        context: snapshot.context || null,
        label: stage.label || stage.id,
        stageId: stage.id,
        operation: stage.operation || stage.kind,
      });
    };
    const previewCamera = snapshot => {
      if (snapshot.cameraKnown) return snapshot;
      const context = snapshot.context || null;
      if (!context) return snapshot;
      return {
        ...snapshot,
        cameraTileOriginX: 0,
        cameraTileOriginY: 0,
        cameraKnown: true,
        previewCameraAssumed: true,
        previewCameraEvidence: (
          "ending maximal-content preview; runtime entry camera was not saved"
        ),
      };
    };
    const appendActorList = stage => {
      const variant = variants.get(Number(stage.variant_id));
      if (!variant) return;
      const stageEventFlags = [...new Set((normalizedOverrides.eventFlags !== undefined
        ? initialOverrideFlags : (stage.initial_event_flags || []).map(Number)).filter(flag => (
        Number.isInteger(flag) && flag >= 0 && flag <= 0xFF
      )))].sort((left, right) => left - right);
      if (endingBranch?.value && !stageEventFlags.includes(endingBranch.event_flag))
        stageEventFlags.push(endingBranch.event_flag);
      const previewCameraX = Number(stage.preview_camera_tile_origin_x);
      const previewCameraY = Number(stage.preview_camera_tile_origin_y);
      const hasPreviewCamera = Number.isFinite(previewCameraX)
        && Number.isFinite(previewCameraY);
      const inheritsRuntimeFieldCamera = stage.entry_camera_policy
        === "inherit-runtime-field-camera";
      // Player-dialogue entries inherit the live field camera.  Their published
      // camera is only a deterministic standalone-preview fallback.  Scripted
      // scene reloads, by contrast, own their explicit camera and must replace
      // any camera that belonged to the sequence entry.
      const usePreviewCamera = hasPreviewCamera && !(
        inheritsRuntimeFieldCamera && hasRuntimeCameraOverride
      );
      const previewEntryState = stage.preview_entry_state || {};
      const previewPlayerX = Number(previewEntryState.player_map_x);
      const previewPlayerY = Number(previewEntryState.player_map_y);
      const hasPreviewPlayer = Number.isFinite(previewPlayerX)
        && Number.isFinite(previewPlayerY);
      const stageRuntimeOverrides = {
        ...normalizedOverrides,
        eventFlags: stageEventFlags,
        ...(usePreviewCamera ? {
          cameraTileOriginX: previewCameraX,
          cameraTileOriginY: previewCameraY,
        } : {}),
      };
      if (!inheritsRuntimeFieldCamera) {
        delete stageRuntimeOverrides.playerMapX;
        delete stageRuntimeOverrides.playerMapY;
        delete stageRuntimeOverrides.playerDirection;
      } else if (!hasRuntimePlayerOverride && hasPreviewPlayer) {
        stageRuntimeOverrides.playerMapX = previewPlayerX;
        stageRuntimeOverrides.playerMapY = previewPlayerY;
        stageRuntimeOverrides.playerDirection = String(
          previewEntryState.player_direction || "down",
        );
      }
      const compiled = buildStoryVmVariant(
        variant,
        stageRuntimeOverrides,
      );
      compiled.unsupported.forEach(value => unsupported.add(Number(value)));
      blockedReasons.push(...compiled.blockedReasons.filter(
        reason => !String(reason).startsWith("dedicated-field-mode-"),
      ));
      uiAutoInputs.push(...compiled.uiAutoInputs.map(item => ({
        ...item,
        frame: frames.length + Number(item.frame),
      })));
      eventFlagWrites.push(...(compiled.eventFlagWrites || []).map(item => ({
        ...item, frame: frames.length + Number(item.frame),
      })));
      const first = previewCamera(compiled.frames[0] || {
        variantId: Number(variant.id),
        sceneId: Number(variant.selection?.scene_id || variant.id),
        context: variant.scene_contexts?.[0] || null,
        actors: [],
      });
      pushShot(stage, first);
      for (const source of compiled.frames) {
        const frameAudioEvents = applySequenceAudioEvents(
          source.audioEvents,
          frames.length,
        );
        frames.push({
          ...previewCamera(source),
          audioState: {...audioState},
          audioEvents: frameAudioEvents,
          endingStageId: stage.id,
          endingStageLabel: stage.label,
          endingOperation: "actor-list-vm",
        });
        advanceStoryAudioState(audioState);
      }
    };
    const dialogueForStage = (stage, localFrame, duration) => {
      if (stage.ui_screen_id) {
        if (localFrame < Number(stage.dialogue_start_frame || 0)
            || localFrame >= Number(stage.dialogue_end_frame ?? duration)) return null;
        return {
          uiScreenId: String(stage.ui_screen_id),
          uiPreviewContext: {...(stage.ui_preview_context || {})},
          recordFound: true,
          pageIndex: 0,
          pageCount: 1,
        };
      }
      if (stage.panel_lines?.length) {
        return {
          synthetic: true,
          regionId: -1,
          recordId: -1,
          recordFound: true,
          pages: [stage.panel_lines],
          lines: stage.panel_lines,
          pageIndex: 0,
          pageCount: 1,
        };
      }
      const record = stage.ui_record;
      if (!record?.record_found) return null;
      const start = Math.max(0, Number(stage.dialogue_start_frame) || 0);
      const end = Math.min(
        duration,
        Number.isFinite(Number(stage.dialogue_end_frame))
          ? Number(stage.dialogue_end_frame)
          : duration,
      );
      if (localFrame < start || localFrame >= end) return null;
      const pages = record.pages || [];
      const visibleFrames = Math.max(1, end - start);
      const pageIndex = Math.min(
        Math.max(0, pages.length - 1),
        Math.floor((localFrame - start) * Math.max(1, pages.length)
          / visibleFrames),
      );
      return {
        regionId: Number(record.region_id),
        recordId: Number(record.record_id),
        recordFound: true,
        pages,
        lines: pages[pageIndex] || [],
        pageIndex,
        pageCount: pages.length,
        machineCodeOwned: true,
      };
    };
    const fadeOpacity = (stage, localFrame, dialogue) => {
      if (!dialogue) {
        // 赏金首阶段的前 $B4 帧就是海报展示期，不能套职员表“正文出现前为
        // 黑场”的规则；结果文字只是在同一张海报上延后出现。
        if (stage.operation === "ending-wanted-result") return 0;
        return stage.ui_record ? 1 : 0;
      }
      const start = Math.max(0, Number(stage.dialogue_start_frame) || 0);
      const end = Number.isFinite(Number(stage.dialogue_end_frame))
        ? Number(stage.dialogue_end_frame)
        : Number(stage.duration_frames);
      const fadeIn = Math.max(0, Number(stage.fade_in_frames) || 0);
      const fadeOut = Math.max(0, Number(stage.fade_out_frames) || 0);
      if (fadeIn && localFrame < start + fadeIn) {
        if (stage.ui_screen_id) return 1 - (localFrame - start + 1) / (fadeIn + 1);
        return 1 - (localFrame - start) / fadeIn;
      }
      if (fadeOut && localFrame >= end - fadeOut) {
        if (stage.ui_screen_id) return (localFrame - (end - fadeOut) + 1) / (fadeOut + 1);
        return (localFrame - (end - fadeOut)) / fadeOut;
      }
      return 0;
    };
    const appendMachineStage = stage => {
      const duration = Math.max(1, Number(stage.duration_frames) || 1);
      const context = stage.scene_id == null
        ? null
        : sceneContexts.get(Number(stage.scene_id)) || null;
      const variantId = Number(stage.mode) === 0x0E ? 0x03 : 0x02;
      const first = {
        variantId,
        sceneId: context ? Number(context.scene_id) : -1,
        context,
      };
      pushShot(stage, first);
      if (stage.terminal_loop) {
        const oneShotEnd = Math.max(
          0,
          ...(stage.audio_events || [])
            .filter(event => event.one_shot)
            .map(event => Number(event.local_frame) + 1),
        );
        loopStart = frames.length + Math.min(duration - 1, oneShotEnd);
      }
      for (let localFrame = 0; localFrame < duration; localFrame += 1) {
        const dialogue = dialogueForStage(stage, localFrame, duration);
        const frameAudioEvents = applySequenceAudioEvents(
          (stage.audio_events || []).filter(
            event => Number(event.local_frame) === localFrame,
          ),
          frames.length,
        );
        frames.push({
          variantId,
          context,
          storyState: 0,
          mode: Number(stage.mode),
          actorListId: variantId,
          sceneId: context ? Number(context.scene_id) : -1,
          cameraTileOriginX: Number(stage.camera_tile_origin_x || 0),
          cameraTileOriginY: Number(stage.camera_tile_origin_y || 0),
          cameraKnown: Boolean(context),
          controlLock: 0xFF,
          scriptedInput: 0,
          actors: [],
          fieldTiles: [],
          dialogue,
          audioState: {...audioState},
          audioEvents: frameAudioEvents,
          endingStageId: stage.id,
          endingStageLabel: stage.label,
          endingOperation: stage.operation,
          endingLocalFrame: localFrame,
          endingStageDuration: duration,
          endingWantedTargetId: stage.operation === "ending-wanted-result"
            ? stage.formation_id ?? null : null,
          endingWantedDefeated: stage.operation === "ending-wanted-result"
            && Number(stage.ui_record?.record_id) === 0x10,
          endingFill: stage.fill || (context ? "field-green" : "black"),
          endingFadeOpacity: fadeOpacity(stage, localFrame, dialogue),
          endingPreviewBranch: stage.preview_branch || null,
        });
        advanceStoryAudioState(audioState);
      }
    };

    const characterStages = timeline.filter(stage => stage.operation === "ending-character-status"
      && runtimeParty.slots.has(Number(stage.role_slot)));
    for (const source of timeline) {
      let stage = source;
      if (stage.operation === "ending-character-review-setup") stage = {...stage,
        duration_frames: stage.duration_frames + Number(characterStages[0]?.character_load_frames || 0)};
      if (stage.operation === "ending-character-status") {
        const index = characterStages.indexOf(source);
        if (index < 0) continue;
        const next = characterStages[index + 1];
        stage = {...stage, duration_frames: next ? 181 + Number(next.character_load_frames) : 192,
          dialogue_end_frame: next ? 188 : 192, fade_out_frames: next ? 4 : 8};
      }
      if (stage.kind === "actor-list-vm") appendActorList(stage);
      else appendMachineStage(stage);
    }
    if (!frames.length) {
      const result = buildStoryVmVariant(entryVariant, normalizedOverrides);
      storyVmSequenceCompilationCache.set(cacheKey, result);
      return result;
    }
    const result = {
      frames,
      duration: frames.length,
      unsupported: [...unsupported].sort((a, b) => a - b),
      blockedActors: [],
      blockedReasons,
      finalControlState: {
        storyState: 0,
        controlLock: 0xFF,
        scriptedInput: 0,
        mode: endingBranch?.terminal_mode ?? 0x0E,
        actorListId: endingBranch?.terminal_actor_list ?? 0x03,
      },
      completion: endingBranch?.completion || "terminal-ending-loop",
      endingBranch: endingBranch?.id || null,
      eventFlagWrites,
      loopStart,
      controlReturned: false,
      uiAutoInputs,
      audioEvents,
      finalAudioState: {...audioState},
      shots,
      endingAnimation: true,
    };
    storyVmSequenceCompilationCache.set(cacheKey, result);
    return result;
  }

  return {
    initializeSceneContext: entry => initializeSceneContext({state: actionState(), entry,
      readDocument: id => db.getResourceDocument(id, null),
      readField: source => db.getField(source.resource_id, source.entity_handle, source.field), createRenderServices}),
    createTextExecutionServices: ({catalog = frameCommitCatalog, textCatalog, renderServices, ...options}) => {
      const state = actionState(), displayServices = createSceneDisplayServices({state, catalog}),
        controllerServices = createControllerInputServices({state, catalog: options.controllerCatalog || catalog});
      const interactions = createTextInteractionServices({state, catalog, displayServices, controllerServices,
        windowCatalog: options.windowCatalog || readProject().interfaces?.application_window_sources,
        clearRectangles: options.clearRectangles || (options.codeValues && Array.from({length: 3},
          (_, index) => fieldSubmenuCodeValue(options.codeValues, `dialogue-clear-rectangle-${index}`))),
        recordOrigin: options.recordOrigin ?? (options.codeValues && (
          fieldSubmenuCodeValue(options.codeValues, "menu-text-origin-low")
          | fieldSubmenuCodeValue(options.codeValues, "menu-text-origin-high") << 8)),
        renderScene: options.renderScene || (renderServices && (request => renderServices.createExecution(request))),
        createHookExecution: options.createHookExecution || renderServices?.createHookExecution || createInlineExecution});
      return createTextExecutionServices({
        ...interactions, ...options,
        choiceParameters: options.choiceParameters || (options.codeValues && dialogueChoiceParameters(options.codeValues)),
        source: options.source || createTextRecordExecutionSource({
          readDocument: () => readProject().text_record_edits, catalog: textCatalog}),
        state, displayServices, controllerServices,
      });
    },
    createSceneDrawSlotServices: createDrawSlotServices,
    createSceneRenderServices: createRenderServices,
    createSceneActorTileServices: createTileServices,
    createSceneDisplayServices: (catalog = frameCommitCatalog) => createSceneDisplayServices({state: actionState(), catalog}),
    createSceneOamServices: createOamServices,
    createControllerInputServices: catalog => createControllerInputServices({state: actionState(), catalog}),
    createRuntimeRandomServices: () => createRuntimeRandomServices({state: actionState()}),
    async rebuildSceneParty() {
      const state = actionState(), before = state.capture();
      try {
        const [visual, partyTypes, vehicles] = await Promise.all([
          'actor-visual', 'party-field-actor-type-map', 'vehicle-visual-selector',
        ].map(id => db.getResourceDocument(id, null)));
        rebuildSceneParty({state, visual, partyTypes, vehicles});
        return {status: 'available', state: state.capture(), effects: []};
      } catch (error) {
        state.restore(before);
        return {status: 'unavailable', missing: [error.message]};
      }
    },
    sceneActionField: (id, index = 0) => actionState().field(id, index),
    captureSceneActionState: () => actionState().capture(),
    restoreSceneActionState: record => actionState().restore(record),
    createSceneActionStateExecution: createStateExecution,
    createSceneActionInteractionExecution: createInteractionExecution,
    createSceneActionInlineExecution: createInlineExecution,
    createSceneActionExecution,
    storyVmCompilationCache,
    storyVmSequenceCompilationCache,
    storyBrowserVm,
    storyActorIsVisible,
    storyVmEntryVariant,
    storyPartyMembers,
    storySnapshotActors,
    storyVmCurrentPrograms,
    storyVmBlockingUiResolver,
    storyVmSemanticsMap,
    storyAudioCommand,
    storyAudioControl,
    storyVmAllActorLists,
    storyVmSequences,
    storyVmStage,
    storyCompiledDialogueRuns,
    buildStoryVmSequence
  };
}
