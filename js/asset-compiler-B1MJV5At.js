import { farjumpEntryIds, farjumpOriginalEntryIds, farjumpFragmentIds, validateFarjumpPage, SAVE_EXTENSION_LAYOUT, SAVE_EXTENSION_ID, fieldFragmentId, saveExtensionBitmapFieldOwner, SAVE_EXTENSION_COMPILER, validateExtensionAllocations, applicationProgramId, applicationProgramFragment, applicationEntryFragments, readApplicationWord, validateApplicationProgramSlot, APPLICATION_READER_PRODUCTS, APPLICATION_READER_ID, FACILITY_POINT_OWNER, facilityPointRecords, sceneMapPointRecords, sceneMapCell, sceneInteractionScriptPrograms, sceneActorInteractionPermitted, sceneInteractionScriptActorDependency, SCENE_INTERACTION_ACTOR_REASON, fieldAssetPaths, fieldRomValue, SCENE_INTERACTION_LAYERS, fieldOwner, allocateExpansionSharedPool, validateExpansionSharedPool, validateSceneObjectExpansionWrites, isStoryPageDocument, assertStoryPageEntryRom, sceneInteractionActorTargets, storyPageExpandedEntryIds, createStoryPageScriptCodec, validateStoryPageReferences, storyPageEntryProgram, createProjectDb, openActiveProjectStore, db, prepareSceneRemapCollectionBuild, prepareFacilityPointBuild, fieldOwnerIds, hasFieldOwner, STORY_COMPILER_ID, SCENE_COMPILER_ID, SCENE_INTERACTION_CODE_COMPILER, SCENE_MAP_READER_COMPILER, APPLICATION_PROGRAM_COMPILER, APPLICATION_READER_COMPILER, VEHICLE_TRADE_COMPILER_ID, ELEVATOR_PARAMETERS_COMPILER_ID, UI_COMMAND_DISPATCH_COMPILER_ID, BOOT_PARAMETER_COMPILER_ID, METATILE_COMPILER_ID, LAUNCH_ANCHOR_COMPILER_ID, NARRATIVE_GLYPHS_COMPILER_ID, CONDITIONAL_AUDIO_COMPILER_ID, FIXED_TEXT_COMPILER_ID, compileFixedTextFields, fixedTextInput, ITEM_SERVICE_COMPILER_ID, BATTLE_SHARED_TABLES_COMPILER_ID, BATTLE_AMOUNT_COMPILER_ID, CHARACTER_GROWTH_COMPILER_ID, ACQUISITION_AUDIO_ITEMS_COMPILER_ID, STATUS_SCHEDULER_COMPILER_ID, UI_LAYOUT_COMPILER_ID, RASTER_LATCH_COMPILER_ID, CHR_PRESET_COMPILER_ID, EQUIPMENT_EFFECT_ITEMS_COMPILER_ID, DPCM_COMPILER_ID, DPCM_STORAGE_COMPILER_ID, AUDIO_VOICE_COMPILER_ID, AUDIO_PERIOD_COMPILER_ID, ENCOUNTER_MESSAGE_COMPILER_ID, BATTLE_WEAPON_ROUTES_COMPILER_ID, FIELD_REWARD_PARAMETERS_COMPILER_ID, FACILITY_CONFIG_COMPILER_ID, GAME_DATA_COMPILER_ID, compileApplicationPrograms, applicationProgramInput, VISUAL_COMPILER_ID, farjumpComponentIds, conditionalAudioExtensionSpecs, encodeFacilityConfigurationFields, FACILITY_CONFIG_COMPONENT_CODEC, FACILITY_CONFIG_COMPONENT_CODEC_VERSION, facilityConfigurationInputSha256, FACILITY_CONFIG_ENCODER_VERSION, FACILITY_CONFIG_ENCODER, FACILITY_CONFIG_RESOURCE_ID, FACILITY_CONFIG_ASSET_SCHEMA, FACILITY_CONFIG_FRAGMENT_ID, validateGameDataComponentPreimages, GAME_DATA_COMPONENT_CODEC, GAME_DATA_COMPONENT_CODEC_VERSION, gameDataAssetInputSha256, GAME_DATA_ENCODER_VERSION, GAME_DATA_ENCODER, gameDataAssetSchema, gameDataComponentSpecs, collectSceneComponentFields, compileSceneAssetFields, SCENE_BUILD_ASSET_ID, SCENE_CATALOG_PATH, SCENE_COMPONENT_CATALOG_PATH, STORY_RESOURCE_IDS, storyComponentIds, STORY_COMPONENT_CODEC, STORY_COMPONENT_CODEC_VERSION, storyAssetInputSha256, STORY_ENCODER_VERSION, STORY_ENCODER, storyAssetSchema, SCENE_MAP_READER_ID, SCENE_MAP_READER_PRODUCTS, SCENE_INTERACTION_CODE_OWNERS, compileApplicationReader, VISUAL_COMPONENT_CODEC, VISUAL_COMPONENT_CODEC_VERSION, visualAssetInputSha256, VISUAL_ENCODER_VERSION, VISUAL_ENCODER, VISUAL_RESOURCE_IDS, visualAssetSchema, visualComponentSpecs, VEHICLE_TRADE_COMPONENT_CODEC, vehicleTradeComponentSpecs, vehicleTradeAssetSchema, ELEVATOR_PARAMETERS_COMPONENT_CODEC, elevatorParameterComponentSpecs, elevatorParameterAssetSchema, UI_LAYOUT_COMPONENT_CODEC, uiLayoutComponentSpecs, uiLayoutAssetSchema, UI_COMMAND_DISPATCH_COMPONENT_CODEC, uiCommandDispatchComponentSpecs, uiCommandDispatchAssetSchema, BOOT_PARAMETER_COMPONENT_CODEC, bootParameterComponentSpecs, bootParameterAssetSchema, METATILE_COMPONENT_CODEC, metatileComponentSpecs, metatileAssetSchema, LAUNCH_ANCHOR_COMPONENT_CODEC, launchAnchorComponentSpecs, launchAnchorAssetSchema, CONDITIONAL_AUDIO_COMPONENT_CODEC, conditionalAudioComponentSpecs, conditionalAudioAssetSchema, DPCM_STORAGE_COMPONENT_CODEC, dpcmStorageComponentSpecs, dpcmStorageAssetSchema, NARRATIVE_GLYPHS_COMPONENT_CODEC, narrativeGlyphComponentSpecs, narrativeGlyphAssetSchema, RASTER_LATCH_COMPONENT_CODEC, rasterLatchComponentSpecs, rasterLatchAssetSchema, STATUS_SCHEDULER_COMPONENT_CODEC, statusSchedulerComponentSpecs, statusSchedulerAssetSchema, CHR_PRESET_COMPONENT_CODEC, chrPresetComponentSpecs, chrPresetAssetSchema, BATTLE_WEAPON_ROUTES_COMPONENT_CODEC, battleWeaponRoutesComponentSpecs, battleWeaponRoutesAssetSchema, AUDIO_VOICE_COMPONENT_CODEC, audioVoiceComponentSpecs, audioVoiceAssetSchema, DPCM_COMPONENT_CODEC, dpcmComponentSpecs, dpcmAssetSchema, AUDIO_PERIOD_COMPONENT_CODEC, audioPeriodComponentSpecs, audioPeriodAssetSchema, ENCOUNTER_MESSAGE_COMPONENT_CODEC, encounterMessageComponentSpecs, encounterMessageAssetSchema, FIELD_REWARD_PARAMETERS_COMPONENT_CODEC, fieldRewardParametersComponentSpecs, fieldRewardParametersAssetSchema, ACQUISITION_AUDIO_ITEMS_COMPONENT_CODEC, acquisitionAudioItemsComponentSpecs, acquisitionAudioItemsAssetSchema, EQUIPMENT_EFFECT_ITEMS_COMPONENT_CODEC, equipmentEffectItemsComponentSpecs, equipmentEffectItemsAssetSchema, CHARACTER_GROWTH_COMPONENT_CODEC, characterGrowthComponentSpecs, characterGrowthAssetSchema, BATTLE_AMOUNT_COMPONENT_CODEC, battleAmountComponentSpecs, battleAmountAssetSchema, ITEM_SERVICE_COMPONENT_CODEC, itemServiceComponentSpecs, itemServiceAssetSchema, BATTLE_SHARED_TABLES_COMPONENT_CODEC, battleSharedTableComponentSpecs, battleSharedTableAssetSchema } from './prg-loaders-DnCSmXk9.js';
import { sha256Hex, BUNDLE_SCHEMA, canonicalHash, cloneValidatedJson, RomLinker, LinkerSchemaError, normalizeBundle, compareText as compareText$3, canonicalJson, identifierRepr, LinkerError, editorLog, canonicalJsonEqual, freezeValidatedJson, linkRom, siteUrl, resolveFragmentPayload } from './visual-metasprites-IDA0o2Z8.js';
import { state } from './emulator-Bpa8EsFw.js';
import { SAVE_BUILD_BLOB_PREFIX, prepareSaveBuildFieldObjects, SAVE_BUILD_MEDIA_TYPE } from './physical-field-object-windows-DnQmS3eb.js';

// @editor-module 在统一链接边界校验剧情远跳的绑定与定值许可。

const CODE = Object.freeze([
  ["story-script-reader.code", "story-script-reader", 2048, 0],
  ["scene-actor-runtime.autonomous-gate", "scene-actor-runtime", 8, 0x7C3],
  ["scene-actor-runtime.interaction-gate", "scene-actor-runtime", 12, 0x7CB],
  ["scene-actor-runtime.glyph-guard", "scene-actor-runtime", 14, 0x7D7],
  ["scene-actor-runtime.interaction-call", "scene-actor-runtime", 3, 0x87C],
  ["scene-actor-runtime.interaction-pointer", "scene-actor-runtime", 14, 0x860],
]);
const requireValue$5 = (condition, message) => {if (!condition) throw new TypeError(`剧情远跳许可：${message}`);};
function exact$2(value, keys) {
  requireValue$5(value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join() === [...keys].sort().join(), "声明形状无效");
}
const equalBytes = (left, right) => left.length === right.length && left.every((byte, index) => byte === right[index]);

async function validateStoryFarjumpWrites(linker, resolved) {
  const policy = linker.buildMap.story_farjump;
  if (policy === undefined) return;
  exact$2(policy, ["schema", "reader_bank", "autonomous_first_bank", "interaction_first_bank", "code", "classes", "declarations", "byte_map"]);
  requireValue$5(policy.schema === "metalmaxcn.story-farjump" && linker.target.mapper === 74
    && linker.target.regions.find(region => region.kind === "prg")?.size === 1048576
    && policy.reader_bank === 0x40 && policy.autonomous_first_bank === 0x41
    && policy.interaction_first_bank === 0x4F, "目标映射与批准的扩展布局不同");
  requireValue$5(Array.isArray(policy.code) && policy.code.length === CODE.length, "代码许可数量无效");
  const codeSlots = new Set();
  const registered = new Map();
  exact$2(policy.byte_map, ["schema", "baseline_sha256", "ranges"]);
  requireValue$5(policy.byte_map.schema === "metalmaxcn.target-byte-map"
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256
    && Array.isArray(policy.byte_map.ranges) && policy.byte_map.ranges.length === CODE.length
      + 2 * ['story-autonomous-script', 'story-interaction-script'].reduce((sum, id) => sum + farjumpEntryIds(id).length, 0),
  "目标符号表身份无效");
  for (const range of policy.byte_map.ranges) {
    exact$2(range, ["slot_id", "prg_offset", "file_offset", "length", "bank", "kind", "purpose", "field_objects", "confidence", "evidence"]);
    const slot = linker.slots.get(range.slot_id);
    requireValue$5(slot && !registered.has(range.slot_id) && range.file_offset === slot.file_offset
      && range.prg_offset === slot.bank_index * 0x2000 + slot.bank_offset
      && range.file_offset === range.prg_offset + 16 && range.length === slot.capacity && range.bank === slot.bank_index
      && range.kind === (slot.atomic_group === "story-farjump-code" ? "code" : "data")
      && range.confidence === (slot.bank_index >= 0x40 ? "expanded-baseline-reservation" : "approved-code-product")
      && JSON.stringify(range.evidence) === JSON.stringify(["project/config/story-farjump-reader.asm",
        "docs/metalmaxcn_story_farjump_design.md", `${slot.baseline_bin}#sha256=${linker.target.baseline_sha256}`]),
    "符号表范围、确认程度或原像来源不同");
    registered.set(range.slot_id, range);
  }
  const checkRegistration = (slot, fragmentId, handle) => requireValue$5(registered.get(slot.slot_id)?.purpose === fragmentId
    && JSON.stringify(registered.get(slot.slot_id).field_objects) === JSON.stringify([handle]), "符号表字段对象不同");
  for (const [fragmentId, owner, length, offset] of CODE) {
    const permission = policy.code.find(row => row.fragment_id === fragmentId);
    exact$2(permission, ["fragment_id", "slot_id", "approved_sha256"]);
    const slot = linker.slots.get(permission.slot_id);
    requireValue$5(slot && slot.owner === owner && slot.region === "prg" && slot.capacity === length
      && slot.bank_offset === offset
      && slot.atomic_group === "story-farjump-code" && !slot.alias_of && !slot.mirror_of
      && /^[0-9a-f]{64}$/.test(permission.approved_sha256), "代码绑定或定值许可无效");
    if (owner === "story-script-reader") requireValue$5(slot.bank_index === policy.reader_bank
      && slot.bank_offset === 0 && slot.runtime_address === 0x8000, "读取器绑定无效");
    else requireValue$5(slot.bank_index === 0x1A && slot.runtime_address === 0xA000 + slot.bank_offset,
      "门桩绑定无效");
    requireValue$5(!codeSlots.has(slot.slot_id), "代码许可重复");
    codeSlots.add(slot.slot_id);
    checkRegistration(slot, fragmentId, owner === "story-script-reader" ? "story-script-reader:00"
      : `scene-actor-runtime:farjump:${fragmentId.slice("scene-actor-runtime.".length)}`);
  }
  requireValue$5(Array.isArray(policy.declarations) && policy.declarations.length === (linker.buildMap.save_extension ? 0x78 : 0x74),
    "缺少完整剧情指令声明");
  policy.declarations.forEach((declaration, opcode) => {
    exact$2(declaration, ["opcode", "name", "width", "fixed_advance", "dynamic_advance_operands", "terminal_side_effect"]);
    requireValue$5(declaration.opcode === opcode && Number.isInteger(declaration.width)
      && declaration.width >= 1 && declaration.width <= 6
      && (declaration.fixed_advance === null || (Number.isInteger(declaration.fixed_advance)
        && declaration.fixed_advance >= 0 && declaration.fixed_advance <= 255))
      && typeof declaration.terminal_side_effect === "boolean"
      && Array.isArray(declaration.dynamic_advance_operands)
      && new Set(declaration.dynamic_advance_operands).size === declaration.dynamic_advance_operands.length
      && declaration.dynamic_advance_operands.every(index => Number.isInteger(index)
        && index > 0 && index < declaration.width), "剧情指令声明无效");
  });
  const bySlot = new Map();
  for (const item of resolved) {
    if (!bySlot.has(item.slot.slot_id)) bySlot.set(item.slot.slot_id, []);
    bySlot.get(item.slot.slot_id).push(item);
  }
  requireValue$5(Array.isArray(policy.classes) && policy.classes.length === 2, "剧情分类许可无效");
  let active = 0;
  for (const [classIndex, resourceId] of ["story-autonomous-script", "story-interaction-script"].entries()) {
    const row = policy.classes.find(row => row.resource_id === resourceId);
    exact$2(row, ["resource_id", "pointer_slot_id", "pool_slot_id", "entries"]);
    const identifiers = farjumpEntryIds(resourceId);
    const originalIdentifiers = farjumpOriginalEntryIds(resourceId);
    requireValue$5(Array.isArray(row.entries) && row.entries.length === identifiers.length, "目录 ID 域无效");
    const pointer = linker.slots.get(row.pointer_slot_id), pool = linker.slots.get(row.pool_slot_id);
    requireValue$5(pointer?.owner === resourceId && pointer.capacity === originalIdentifiers.length * 2
      && pool?.owner === resourceId && pool.region === "prg"
      && pointer.atomic_group === null && pool.atomic_group === null, "原指针与原池归属无效");
    requireValue$5(!bySlot.has(pool.slot_id), "原脚本池不得写入");
    const allowed = new Set([pointer.slot_id, pool.slot_id]);
    const pointerWrites = bySlot.get(pointer.slot_id) || [];
    const expectedOffsets = new Set();
    for (const [index, scriptId] of identifiers.entries()) {
      const entry = row.entries[index];
      exact$2(entry, ["script_id", "directory_slot_id", "page_slot_id"]);
      requireValue$5(entry.script_id === scriptId, "目录入口顺序无效");
      const [directoryId, pageId] = farjumpFragmentIds(resourceId, scriptId);
      const directory = linker.slots.get(entry.directory_slot_id), page = linker.slots.get(entry.page_slot_id);
      const pageIndex = index, firstBank = classIndex === 0 ? policy.autonomous_first_bank : policy.interaction_first_bank;
      const directoryAddress = (classIndex === 0 ? 0x8800 : 0x8AA4) + scriptId * 4;
      requireValue$5(directory?.owner === resourceId && directory.region === "prg" && directory.capacity === 4
        && directory.bank_index === policy.reader_bank && directory.bank_offset === directoryAddress - 0x8000
        && directory.runtime_address === directoryAddress && directory.alignment === 4
        && page?.owner === resourceId && page.region === "prg" && page.capacity === 256
        && page.bank_index === firstBank + (pageIndex >> 5) && page.bank_offset === (pageIndex & 31) * 256
        && page.bank_index <= (classIndex === 0 ? 0x4E : 0x5B)
        && page.runtime_address === 0x8000 + page.bank_offset && page.alignment === 256,
      "目录或页绑定超出所属分类");
      allowed.add(directory.slot_id); allowed.add(page.slot_id);
      const handle = `${resourceId}:script:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;
      checkRegistration(directory, directoryId, handle); checkRegistration(page, pageId, handle);
      const directories = bySlot.get(directory.slot_id) || [], pages = bySlot.get(page.slot_id) || [];
      const original = originalIdentifiers.includes(scriptId);
      const offset = index * 2, pointers = pointerWrites.filter(item => item.fragment.offset_in_slot === offset);
      if (!directories.length && !pages.length && !pointers.length) continue;
      requireValue$5(directories.length === 1 && pages.length === 1 && pointers.length === (original ? 1 : 0),
        original ? "原入口须同时写入两字节指针、目录与整页" : "扩展入口须只写入目录与整页");
      const dir = directories[0], content = pages[0], ptr = pointers[0];
      if (original) requireValue$5(ptr.payload.length === 2 && equalBytes(ptr.payload,
        [directoryAddress & 255, directoryAddress >> 8]) && ptr.fragment.relocations.length === 1
        && ptr.fragment.relocations[0].type === "le16-pointer"
        && ptr.fragment.relocations[0].target_slot_id === directory.slot_id
        && ptr.fragment.relocations[0].target_offset === 0 && ptr.fragment.relocations[0].addend === 0,
      "指针不在对应目录域");
      requireValue$5(dir.fragment.fragment_id === directoryId && content.fragment.fragment_id === pageId
        && !dir.fragment.offset_in_slot && !content.fragment.offset_in_slot
        && !dir.fragment.relocations.length && !content.fragment.relocations.length
        && equalBytes(dir.payload, [0xFF, page.bank_index, 0, page.runtime_address >> 8]), "目录格式或目标页错误");
      validateFarjumpPage(content.payload, content.fragment.instruction_boundaries, policy.declarations);
      requireValue$5(!content.fragment.instruction_boundaries.some(cursor => content.payload[cursor] >= 0x74
        && content.payload[cursor] < 0x78) || resolved.some(row => row.fragment.asset_id === 'save-extension-bitmap'),
      '扩展剧情指令缺读取器与存档门桩');
      if (original) expectedOffsets.add(offset);
      active++;
    }
    requireValue$5(pointerWrites.every(item => expectedOffsets.has(item.fragment.offset_in_slot)), "写入未改入口的指针");
    requireValue$5(resolved.filter(item => item.fragment.asset_id === resourceId)
      .every(item => allowed.has(item.slot.slot_id)), "剧情片段未登记");
  }
  const presentCode = resolved.filter(item => codeSlots.has(item.slot.slot_id));
  requireValue$5(active ? presentCode.length === CODE.length : presentCode.length === 0,
    "有效远跳入口与代码激活集合不同");
  for (const item of presentCode) {
    const permission = policy.code.find(row => row.slot_id === item.slot.slot_id);
    const handle = item.slot.owner === "story-script-reader" ? "story-script-reader:00"
      : `scene-actor-runtime:farjump:${permission.fragment_id.slice("scene-actor-runtime.".length)}`;
    requireValue$5(item.fragment.fragment_id === JSON.stringify([handle, handle, "enabled"])
      && item.fragment.codec === "metalmaxcn.story-code" && item.fragment.codec_version === "1" && !item.fragment.offset_in_slot
      && !item.fragment.relocations.length && item.payload.length === item.slot.capacity
      && await sha256Hex(item.payload) === (item.slot.owner === 'story-script-reader'
        && resolved.some(row => row.fragment.asset_id === 'save-extension-bitmap')
        ? linker.buildMap.save_extension.story_reader_sha256 : permission.approved_sha256), "代码片段偏离审定产物");
  }
}

// @editor-module 有扩展归属时才序列化位图读取器与存档门桩。

const requireValue$4 = (value, message) => {if (!value) throw new TypeError(`扩展位图构建：${message}`);};
function saveExtensionInput(binding) {
  requireValue$4(binding.asset_id === SAVE_EXTENSION_ID && binding.compiler_id === SAVE_EXTENSION_COMPILER
    && binding.input.resource_id === SAVE_EXTENSION_ID && binding.input.asset_schema === 'metalmaxcn.save-extension.asset'
    && binding.input.components?.length === SAVE_EXTENSION_LAYOUT.length, '绑定身份无效');
  return binding.input;
}
async function saveExtensionBuildState(context) {
  if (!context.saveExtensionState) context.saveExtensionState = (async () => {
    if (!context.buildMap.save_extension) return {active: false, allocations: Array(256).fill(null), assertCurrent: async () => {}};
    const manifest = await context.repository.getManifest();
    const snapshot = await context.fieldDb.readBuildFields(SAVE_EXTENSION_ID, context.repository, manifest.active_original_revision_id);
    const allocations = validateExtensionAllocations(snapshot.fields.find(row => row.fieldName === 'owners')?.value);
    return {active: allocations.some(Boolean), allocations, fields: snapshot.fields, assertCurrent: snapshot.assertCurrent};
  })();
  return context.saveExtensionState;
}
async function compileSaveExtension(context, bindings) {
  const state = await saveExtensionBuildState(context), fragments = [];
  for (const binding of bindings) {
    saveExtensionInput(binding);
    if (!state.active) continue;
    for (const permission of context.buildMap.save_extension.code) {
      const field = state.fields.find(row => fieldFragmentId(row) === permission.fragment_id);
      requireValue$4(field, '缺代码字段');
      const payload = saveExtensionBitmapFieldOwner.serializeField({...field, value: true});
      requireValue$4(await sha256Hex(payload) === permission.approved_sha256, '定值代码偏离审定产物');
      fragments.push({asset_id: SAVE_EXTENSION_ID, fragment_id: permission.fragment_id, slot_id: permission.slot_id,
        payload, payload_sha256: permission.approved_sha256, codec: SAVE_EXTENSION_COMPILER, codec_version: '1',
        alignment: 1, relocations: []});
    }
  }
  await state.assertCurrent();
  context.workingFieldCoverage ||= new Map();
  context.workingFieldCoverage.set(SAVE_EXTENSION_ID, fragments.map(fragment =>
    [fragment.fragment_id, fragment.slot_id, undefined, fragment.payload.length]));
  return {compiler_id: SAVE_EXTENSION_COMPILER, compiled_asset_ids: bindings.map(row => row.asset_id),
    changed_asset_ids: fragments.length ? [SAVE_EXTENSION_ID] : [], bundles: fragments.length ? [{schema: BUNDLE_SCHEMA,
      asset_id: SAVE_EXTENSION_ID, encoder: SAVE_EXTENSION_COMPILER, encoder_version: '1',
      input_sha256: await canonicalHash(state.allocations), fragments}] : []};
}

async function validateSaveExtensionWrites(linker, resolved) {
  const policy = linker.buildMap.save_extension;
  if (!policy) return;
  requireValue$4(policy.schema === 'metalmaxcn.save-extension' && policy.runtime_cpu === 0x05C0 && policy.bytes === 32
    && policy.slot_offset === 990 && JSON.stringify(policy.signature) === '[69,1]'
    && policy.code.length === SAVE_EXTENSION_LAYOUT.length, '运行布局无效');
  const writes = resolved.filter(row => row.fragment.asset_id === SAVE_EXTENSION_ID);
  requireValue$4(writes.length === 0 || writes.length === policy.code.length, '代码与门桩须整组启用');
  for (const [index, [id, bank, offset, length, cpu]] of SAVE_EXTENSION_LAYOUT.entries()) {
    const permission = policy.code[index], slot = linker.slots.get(permission.slot_id);
    requireValue$4(permission.fragment_id === `${SAVE_EXTENSION_ID}.${id}` && slot?.owner === SAVE_EXTENSION_ID
      && slot.bank_index === bank && slot.bank_offset === offset && slot.capacity === length
      && slot.runtime_address === cpu && slot.atomic_group === 'save-extension-code', '代码许可或归属无效');
    const write = writes.find(row => row.slot.slot_id === permission.slot_id);
    if (write) requireValue$4(write.fragment.fragment_id === permission.fragment_id && !write.fragment.offset_in_slot
      && !write.fragment.relocations.length && await sha256Hex(write.payload) === permission.approved_sha256, '代码未经审定');
  }
}

// @editor-module 场景地图的扩展槽分配与统一链接许可校验。

const SCENE_MAP_LAYOUT = Object.freeze([
  ['map-reader', 'scene-data-stream-service', 0x5C, 0, 1024, 0x8000],
  ['map-gate', 'scene-data-stream-service', 0x14, 0xD4C, 18, 0xAD4C],
  ['directory', 'scene.config', 0x5C, 0x400, 2048, 0x8400],
  ['pool-0', 'scene.config', 0x5C, 0xC00, 5120, 0x8C00],
  ['pool-1', 'scene.config', 0x5D, 0, 8192, 0x8000],
]);
const sceneMapSlotId = id => `scene-map-expansion.${id}`;
const requireValue$3 = (value, message) => {if (!value) throw new TypeError(`场景地图扩展：${message}`);};

function sceneMapExpansionBudget(policy, slots) {
  return {
    capacity: SCENE_MAP_LAYOUT.slice(3).reduce((sum, [id]) => sum + (slots.get(sceneMapSlotId(id))?.capacity || 0), 0),
    mapCount: policy.entries.length,
    estimatedBytes: policy.entries.reduce((sum, entry) => sum + Math.ceil(entry.length / 7) * 7, 0),
  };
}

async function planExpandedSceneMaps(components, policy, slots) {
  const fragments = [], directory = new Uint8Array(2048);
  const pools = SCENE_MAP_LAYOUT.slice(3).map(([id]) => slots.get(sceneMapSlotId(id)));
  const budget = sceneMapExpansionBudget(policy, slots);
  const required = components.reduce((sum, item) => sum + item.payload.length, 0);
  requireValue$3(required <= budget.capacity,
    `预算不足（bank $5C..$5D，地图容量 ${budget.capacity} 字节）；本次 ${components.length} 张地图需要 ${required} 字节，缺少 ${required - budget.capacity} 字节；全部 ${budget.mapCount} 张可修改地图按原分配估算 ${budget.estimatedBytes} 字节`);
  const used = [0, 0];
  for (const item of [...components].sort((a, b) => a.component_id.localeCompare(b.component_id))) {
    const entry = policy.entries.find(row => row.component_id === item.component_id);
    requireValue$3(entry && item.payload.length > 0 && item.payload.length % 7 === 0, '迁移片段须属于已绑定地图并包含完整 packed7 读取组');
    const index = pools.findIndex((pool, i) => pool && pool.capacity - used[i] >= item.payload.length);
    requireValue$3(index >= 0, `预算用尽（bank $5C..$5D，地图容量 ${budget.capacity} 字节）；${entry.resource_id} 需要 ${item.payload.length} 字节，剩余 ${pools.map((pool, i) => (pool?.capacity || 0) - used[i]).join('/')} 字节，地图须在同一 bank 内；全部 ${budget.mapCount} 张可修改地图按原分配估算 ${budget.estimatedBytes} 字节`);
    const pool = pools[index], offset = used[index], address = pool.runtime_address + offset;
    const length = item.payload.length;
    directory.set([pool.bank_index, address & 255, address >> 8, length & 255, length >> 8,
      entry.original_pointer & 255, entry.original_pointer >> 8, 255], entry.scene_id * 8);
    fragments.push({asset_id: 'scene.config', fragment_id: item.component_id,
      slot_id: pool.slot_id, offset_in_slot: offset, payload: item.payload,
      payload_sha256: await sha256Hex(item.payload), codec: 'scene-config/v1',
      codec_version: '1', alignment: 1, relocations: []});
    used[index] += length;
  }
  if (fragments.length) fragments.push({asset_id: 'scene.config', fragment_id: 'scene.map.directory',
    slot_id: sceneMapSlotId('directory'), payload: directory, payload_sha256: await sha256Hex(directory),
    codec: 'scene-config/v1', codec_version: '1', alignment: 1, relocations: []});
  return fragments;
}

async function validateSceneMapExpansionWrites(linker, resolved) {
  const policy = linker.buildMap.scene_map_expansion;
  if (!policy) return;
  requireValue$3(policy.schema === 'metalmaxcn.scene-map-expansion' && linker.target.mapper === 74
    && linker.target.regions.find(row => row.kind === 'prg')?.size === 1048576, '目标布局不同');
  requireValue$3(policy.code?.length === 2 && policy.byte_map?.ranges?.length === 5
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256, '代码许可或符号表缺失');
  for (const [id, owner, bank, offset, length, address] of SCENE_MAP_LAYOUT) {
    const slot = linker.slots.get(sceneMapSlotId(id));
    const range = policy.byte_map.ranges.find(row => row.slot_id === slot?.slot_id);
    requireValue$3(slot && slot.owner === owner && slot.region === 'prg' && slot.bank_index === bank
      && slot.bank_offset === offset && slot.capacity === length && slot.runtime_address === address
      && slot.file_offset === 16 + bank * 8192 + offset && slot.alignment === 1
      && !slot.alias_of && !slot.mirror_of && slot.atomic_group === null
      && range?.prg_offset === bank * 8192 + offset && range.file_offset === slot.file_offset
      && range.length === length && range.bank === bank && range.kind === (owner === 'scene.config' ? 'data' : 'code')
      && range.purpose === id && range.owner === owner
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'approved-code-product')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/scene-map-reader.asm',
        'project/evidence/scene-map-expansion-reader/observations.json']), '绑定或归属不同');
  }
  requireValue$3(Array.isArray(policy.entries) && new Set(policy.entries.map(row => row.scene_id)).size === policy.entries.length,
    '场景目录身份重复');
  for (const entry of policy.entries) {
    const suffix = entry.scene_id.toString(16).padStart(2, '0');
    requireValue$3(Number.isInteger(entry.scene_id) && entry.scene_id >= 1 && entry.scene_id <= 0xEF
      && entry.component_id === `scene.map.${suffix}` && entry.resource_id === `scene:${suffix.toUpperCase()}`
      && Number.isInteger(entry.length) && entry.length > 0
      && Number.isInteger(entry.output_bytes) && entry.output_bytes > 0
      && entry.original_locations?.length > 0 && entry.original_locations.reduce((sum, row) => sum + row.length, 0) === entry.length
      && Number.isInteger(entry.original_pointer) && entry.original_pointer >= 0 && entry.original_pointer <= 65535,
    '场景原分配声明无效');
  }
  const expanded = resolved.filter(row => SCENE_MAP_LAYOUT.slice(3).some(([id]) => row.slot.slot_id === sceneMapSlotId(id)));
  const directories = resolved.filter(row => row.slot.slot_id === sceneMapSlotId('directory'));
  const code = resolved.filter(row => row.slot.owner === 'scene-data-stream-service');
  requireValue$3(expanded.length ? directories.length === 1 && code.length === 2 : !directories.length && !code.length,
    '地图、目录与读取器须完整激活');
  const expected = await planExpandedSceneMaps(expanded.map(row => ({component_id: row.fragment.fragment_id,
    payload: row.payload})), policy, linker.slots);
  for (const item of expanded) {
    const entry = policy.entries.find(row => row.component_id === item.fragment.fragment_id);
    requireValue$3(item.payload.length % 7 === 0, '扩展地图须包含完整 packed7 读取组');
    const tokens = [];
    let buffer = 0, width = 0;
    for (const byte of item.payload) {
      buffer = (buffer << 8) | byte; width += 8;
      while (width >= 7) {width -= 7;tokens.push((buffer >> width) & 127);}
      buffer &= (1 << width) - 1;
    }
    let cursor = 0, output = 0;
    while (output < entry.output_bytes) {
      requireValue$3(cursor < tokens.length, '地图流提前结束');
      if (tokens[cursor++]) output++;
      else {
        requireValue$3(cursor + 1 < tokens.length && tokens[cursor + 1] > 0, '地图 RLE 操作数无效');
        output += tokens[cursor + 1]; cursor += 2;
      }
    }
    requireValue$3(output === entry.output_bytes && tokens.slice(cursor).every(token => token === 127), '地图尺寸或尾部填充不同');
  }
  for (const entry of policy.entries) {
    for (const location of entry.original_locations) {
      const slot = linker.slots.get(location.slot_id);
      requireValue$3(slot?.owner === 'scene.config' && location.offset_in_slot >= 0
        && location.offset_in_slot + location.length <= slot.capacity, '原地图绑定不同');
      for (const write of resolved.filter(row => row.slot.slot_id === slot.slot_id)) {
        const start = Math.max(location.offset_in_slot, write.fragment.offset_in_slot ?? 0);
        const end = Math.min(location.offset_in_slot + location.length, (write.fragment.offset_in_slot ?? 0) + write.payload.length);
        for (let offset = start; offset < end; offset++) requireValue$3(
          write.payload[offset - (write.fragment.offset_in_slot ?? 0)] === linker.baseline[slot.file_offset + offset], '地图的旧位置不得写入');
      }
    }
  }
  for (const product of expected) {
    const row = resolved.find(row => row.fragment.fragment_id === product.fragment_id
      && row.fragment.asset_id === 'scene.config');
    requireValue$3(row && row.slot.slot_id === product.slot_id
      && (row.fragment.offset_in_slot ?? 0) === (product.offset_in_slot ?? 0)
      && !row.fragment.relocations.length && row.payload.length === product.payload.length
      && row.payload.every((value, index) => value === product.payload[index]), '目录或迁移位置不同');
  }
  for (const row of code) {
    const permission = policy.code.find(item => item.slot_id === row.slot.slot_id);
    requireValue$3(permission && row.fragment.fragment_id === permission.fragment_id
      && !row.fragment.offset_in_slot && !row.fragment.relocations.length
      && row.payload.length === row.slot.capacity && await sha256Hex(row.payload) === permission.approved_sha256,
    '代码偏离审定产物');
  }
}

// @editor-module 应用程序入口、目录与整槽在统一边界原子校验。
const requireValue$2 = (condition, message) => {if (!condition) throw new TypeError(`应用程序许可：${message}`);};
const exact$1 = (value, keys) => requireValue$2(value && Object.keys(value).sort().join() === [...keys].sort().join(), '声明形状不同');
function validateApplicationProgramWrites(linker, resolved) {
  const policy = linker.buildMap.application_farjump;
  requireValue$2(policy.programs.length === 60, '程序分配不是 60 槽');
  exact$1(policy.program_contract, ['prefix', 'native_handlers']);
  requireValue$2(policy.program_contract.prefix === 12
    && JSON.stringify(policy.program_contract.native_handlers) === JSON.stringify([0xA797, 0xA915, 0xEEBC, 0xEEC5, 0xA9F2]), '程序消费许可不同');
  const allowed = new Set(policy.code.map(row => row.slot_id)), bySlot = new Map();
  const applicationIds = new Set(['application-program', 'application-script-reader',
    ...policy.active_entries.map(entry => entry.resource_id), ...policy.extended_entries.map(entry => entry.resource_id)]);
  for (const item of resolved) {
    requireValue$2(!bySlot.has(item.slot.slot_id) || !applicationIds.has(item.fragment.asset_id), '片段重复');
    bySlot.set(item.slot.slot_id, item);
  }
  const slotFor = (id, owner, bank, offset, capacity, alignment, fragmentId) => {
    const slot = linker.slots.get(id), range = policy.byte_map.ranges.find(row => row.slot_id === id);
    requireValue$2(slot && slot.owner === owner && slot.region === 'prg' && slot.bank_index === bank
      && slot.bank_offset === offset && slot.capacity === capacity && slot.alignment === alignment
      && slot.file_offset === 16 + bank * 8192 + offset
      && slot.runtime_address === (bank === 0x18 ? 0xA000 : 0x8000) + offset
      && slot.fill === null && slot.alias_of === null && slot.mirror_of === null && slot.atomic_group === null,
      'bank、地址、容量或绑定不同');
    requireValue$2(range && range.file_offset === slot.file_offset && range.prg_offset === slot.file_offset - 16
      && range.length === capacity && range.bank === bank && range.kind === 'data' && range.purpose === fragmentId
      && JSON.stringify(range.field_objects) === JSON.stringify([owner === 'application-program' ? fragmentId.slice(0, -5) : owner])
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'confirmed-program-entry')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/byte-map/owners/application-program.json',
        'docs/metalmaxcn_application_script_farjump_design.md']), '符号表归属不同');
    allowed.add(id); return slot;
  };
  const slots = policy.programs.map((program, index) => {
    exact$1(program, ['program_id', 'allocation', 'slot_id']);
    const allocation = index === 0 ? 59 : index - 1;
    requireValue$2(program.program_id === applicationProgramId(index) && program.allocation === allocation, '稳定分配不同');
    return slotFor(program.slot_id, 'application-program', 0x60 + (allocation >> 1), (allocation & 1) * 4096,
      4096, 4096, applicationProgramFragment(program.program_id));
  });
  const used = new Set(); let active = 0, originalActive = 0;
  requireValue$2(policy.extended_entries.length === 199, '扩展命令目录容量不同');
  [...policy.active_entries, ...policy.extended_entries].forEach((entry, index) => {
    const extended = index >= 4;
    exact$1(entry, extended ? ['command', 'resource_id', 'directory_slot_id']
      : ['command', 'resource_id', 'origin_program', 'pointer_slot_id', 'directory_slot_id']);
    const command = extended ? index - 4 + 0x39 : index + 0x10, [id, pointerId, directoryId] = applicationEntryFragments(command);
    requireValue$2(entry.command === command && entry.resource_id === id
      && (extended || entry.origin_program === 'application-program:00'), '未许可入口');
    if (!extended) slotFor(entry.pointer_slot_id, id, 0x18, 0x1331 + index * 2, 2, 1, pointerId);
    const directory = slotFor(entry.directory_slot_id, id, 0x5E, 0x1000 + command * 16, 16, 16, directoryId);
    const ptr = bySlot.get(entry.pointer_slot_id), dir = bySlot.get(entry.directory_slot_id);
    if (!ptr && !dir) return;
    requireValue$2((extended || ptr) && dir, '缺入口指针或目录');
    if (!extended) requireValue$2(ptr.payload.length === 2 && readApplicationWord(ptr.payload, 0) === directory.runtime_address,
      '原入口未远跳到对应目录');
    if (!extended) requireValue$2(ptr.fragment.relocations.length === 1 && ptr.fragment.relocations[0].type === 'le16-pointer'
      && ptr.fragment.relocations[0].target_slot_id === directory.slot_id
      && ptr.fragment.relocations[0].offset === 0 && ptr.fragment.relocations[0].target_offset === 0
      && ptr.fragment.relocations[0].addend === 0, '入口重定位许可不同');
    const bytes = dir.payload;
    requireValue$2(bytes.length === 16 && bytes[0] === 255 && readApplicationWord(bytes, 10) === 4096
      && bytes.subarray(12).every(byte => byte === 0), '目录格式或容量不同');
    const programIndex = slots.findIndex(slot => slot.bank_index === bytes[1] && slot.runtime_address === readApplicationWord(bytes, 4));
    const slot = slots[programIndex], content = bySlot.get(slot?.slot_id);
    requireValue$2(content && readApplicationWord(bytes, 2) === slot.runtime_address + 512, '改错 bank 或缺整程序');
    requireValue$2(dir.fragment.relocations.length === 3
      && dir.fragment.relocations[0].type === 'fixed-write' && dir.fragment.relocations[0].offset === 1
      && dir.fragment.relocations[0].data.length === 1 && dir.fragment.relocations[0].data[0] === slot.bank_index
      && [2, 4].every((offset, index) => {
        const relocation = dir.fragment.relocations[index + 1];
        return relocation.type === 'le16-pointer' && relocation.offset === offset
          && relocation.target_slot_id === slot.slot_id && relocation.target_offset === (index ? 0 : 512)
          && relocation.addend === 0;
      }), '目录重定位许可不同');
    validateApplicationProgramSlot(content.payload, {count: readApplicationWord(bytes, 6), length: readApplicationWord(bytes, 8),
      ...policy.program_contract});
    if (!extended) originalActive++;
    used.add(slot.slot_id); active++;
  });
  requireValue$2(slots.every(slot => !bySlot.has(slot.slot_id) || used.has(slot.slot_id)), '无入口引用的程序片段');
  for (const item of resolved.filter(row => applicationIds.has(row.fragment.asset_id))) {
    requireValue$2(allowed.has(item.slot.slot_id), '原池或未登记位置不得写入');
    if (policy.code.some(row => row.slot_id === item.slot.slot_id)) continue;
    const expected = item.slot.owner === 'application-program'
      ? applicationProgramFragment(policy.programs.find(row => row.slot_id === item.slot.slot_id).program_id)
      : applicationEntryFragments(Number.parseInt(item.slot.owner.slice(-2), 16))[item.slot.capacity === 2 ? 1 : 2];
    requireValue$2(item.fragment.fragment_id === expected && !item.fragment.offset_in_slot
      && (item.slot.owner !== 'application-program' || !item.fragment.relocations.length)
      && item.payload.length === item.slot.capacity, '片段身份或整段覆盖不同');
  }
  return {active, originalActive};
}

// @editor-module 应用代码许可只接受审定布局与完整程序激活。

const APPLICATION_READER_LAYOUT = Object.freeze([
  [0x5E, 0x8000, 0], [0x18, 0xA05A, 0x5A], [0x18, 0xA06C, 0x6C], [0x18, 0xA0D4, 0xD4],
]);
const requireValue$1 = (condition, message) => {if (!condition) throw new TypeError(`应用读取器许可：${message}`);};
const exact = (value, keys) => requireValue$1(value && typeof value === 'object'
  && Object.keys(value).sort().join() === [...keys].sort().join(), '声明形状无效');
async function validateApplicationReaderWrites(linker, resolved) {
  const policy = linker.buildMap.application_farjump;
  if (policy === undefined) return;
  exact(policy, ['schema', 'reader_bank', 'code', 'active_entries', 'byte_map',
    ...(policy.programs ? ['programs', 'program_contract', 'extended_entries'] : [])]);
  exact(policy.byte_map, ['schema', 'baseline_sha256', 'ranges']);
  requireValue$1(policy.schema === 'metalmaxcn.application-farjump'
    && policy.reader_bank === 0x5E && linker.target.mapper === 74
    && linker.target.regions.find(region => region.kind === 'prg')?.size === 1048576
    && Array.isArray(policy.code) && policy.code.length === 4
    && Array.isArray(policy.active_entries) && policy.active_entries.length === (policy.programs ? 4 : 0),
  '目标布局或入口集合不同');
  requireValue$1(policy.byte_map?.schema === 'metalmaxcn.target-byte-map'
    && policy.byte_map.baseline_sha256 === linker.target.baseline_sha256
    && policy.byte_map.ranges?.length === (policy.programs ? 271 : 4), '目标符号表无效');
  const slots = new Set();
  for (const [[id, length], index] of APPLICATION_READER_PRODUCTS.map((row, index) => [row, index])) {
    const permission = policy.code.find(row => row.fragment_id === `${APPLICATION_READER_ID}.${id}`);
    exact(permission, ['fragment_id', 'slot_id', 'approved_sha256']);
    const slot = linker.slots.get(permission?.slot_id);
    const [bank, address, offset] = APPLICATION_READER_LAYOUT[index];
    const range = policy.byte_map.ranges.find(row => row.slot_id === slot?.slot_id);
    exact(range, ['slot_id', 'prg_offset', 'file_offset', 'length', 'bank', 'kind', 'purpose', 'field_objects', 'confidence', 'evidence']);
    requireValue$1(slot && slot.owner === APPLICATION_READER_ID && slot.region === 'prg'
      && slot.capacity === length && slot.bank_index === bank && slot.bank_offset === offset
      && slot.runtime_address === address && slot.alignment === 1
      && slot.alias_of === null && slot.mirror_of === null && slot.atomic_group === 'application-reader-code'
      && !slots.has(slot.slot_id) && /^[a-f0-9]{64}$/.test(permission.approved_sha256), '代码绑定不同');
    slots.add(slot.slot_id);
    requireValue$1(range && range.prg_offset === bank * 8192 + offset && range.file_offset === slot.file_offset
      && range.length === length && range.bank === bank && range.kind === 'code'
      && range.purpose === permission.fragment_id
      && range.confidence === (bank >= 0x40 ? 'expanded-baseline-reservation' : 'approved-code-product')
      && JSON.stringify(range.evidence) === JSON.stringify(['project/config/application-farjump-reader.asm',
        'project/evidence/app-script-wb-p5-new-commands/observations.json'])
      && JSON.stringify(range.field_objects) === JSON.stringify([`${APPLICATION_READER_ID}:0${index}`]),
    '代码归属不同');
    requireValue$1(await sha256Hex(linker.baseline.subarray(slot.file_offset, slot.file_offset + length))
      === slot.preimage_sha256, '代码原像不同');
  }
  const code = resolved.filter(row => slots.has(row.slot.slot_id));
  const {active, originalActive} = policy.programs ? validateApplicationProgramWrites(linker, resolved)
    : {active: 0, originalActive: 0};
  requireValue$1(active ? originalActive ? code.length === 4 : [0, 4].includes(code.length) : code.length === 0,
    '应用程序迁移未开放或缺完整入口，代码不得单独激活');
  for (const item of code) {
    const permission = policy.code.find(row => row.slot_id === item.slot.slot_id);
    requireValue$1(item.fragment.fragment_id === permission.fragment_id && !item.fragment.offset_in_slot
      && !item.fragment.relocations.length && item.payload.length === item.slot.capacity
      && await sha256Hex(item.payload) === permission.approved_sha256, '代码偏离审定产物');
  }
}

// @editor-module 构建交互转接时核对源字段、目标流程与当前脚本现场。

function sceneInteractionTargetPayload(kind, record, document, runtimePointer = null) {
  const tag = SCENE_INTERACTION_LAYERS.findIndex(([name]) => name === kind) + 1;
  if (tag < 1) throw new TypeError('交互目标类别无效');
  if (tag >= 5) {
    if (!Number.isInteger(runtimePointer) || runtimePointer < 0x8000 || runtimePointer > 0x9FFD)
      throw new TypeError('场景出入口缺运行时目标许可');
    return [tag, runtimePointer & 255, runtimePointer >> 8, 0, 0, 0, 0, 0];
  }
  const sceneId = Number(document.scene.id);
  if (tag === 4) {
    const treasure = document.logic.layers.treasures.find(row => row.x === record.x && row.y === record.y);
    const facility = document.logic.layers.investigation_points.find(row => row.x === record.x && row.y === record.y);
    return [tag, record.behavior_code, record.metatile_id, sceneId, record.x, record.y,
      treasure ? 1 : facility ? 2 : 0, treasure?.id ?? facility?.id ?? 0];
  }
  return [tag, record.id, 0, sceneId, record.x, record.y, 0, 0];
}

async function sceneInteractionBuildState(context) {
  if (!context.sceneInteractionState) context.sceneInteractionState = (async () => {
    const binding = context.bindings.find(row => row.asset_id === 'scene.config');
    const policy = binding?.input.interaction_transfer;
    const kinds = new Set(), snapshots = [], targets = new Map();
    if (!policy) return {kinds, targets, dynamicScenes: [], assertCurrent: async () => {}};
    const database = context.fieldDb, repository = context.repository, manifest = await repository.getManifest();
    const working = new Set(await repository.listFieldWorkingResourceIds());
    const active = [], dynamicScenes = [];
    if (working.has(FACILITY_POINT_OWNER)
      && facilityPointRecords(await database.getResourceDocument(FACILITY_POINT_OWNER)).length) kinds.add(2);
    for (const resourceId of new Set([...policy.components.map(row => row.resource_id),
      ...[...working].filter(id => /^scene:[0-9A-F]{2}$/u.test(id))])) {
      if (!working.has(resourceId)) continue;
      const snapshot = await database.readBuildFields(resourceId, repository, manifest.active_original_revision_id);
      snapshots.push(snapshot);
      for (const field of snapshot.fields.filter(field => field.fieldName === 'interaction_binding' && field.value)) {
        if (!field.interactionKey || field.writeback?.state === 'unpermitted')
          throw new TypeError(`${field.entityHandle} 没有交互转接写入许可`);
        active.push(field);
        kinds.add(field.interactionKind);
      }
      if (/^scene:[0-9A-F]{2}$/u.test(resourceId) && snapshot.fields.some(field =>
        field.sceneObjectCollection === 'map-investigation'
        && field.value.created.some(row => row.interaction_binding || row.behavior_code !== undefined))) {
        const document = await database.getResourceDocument(resourceId);
        const rows = sceneMapPointRecords(document, resourceId).filter(row => row.interaction_binding || row.behavior_code !== undefined)
          .map(row => ({entityHandle: row.handle, fieldName: 'interaction_binding', value: row.interaction_binding || '',
            defaultValue: '', interactionKey: [4, document.scene.id, row.x, row.y], interactionKind: 4,
            ...(row.interaction_binding ? {} : {nativeTarget: sceneInteractionTargetPayload('investigation-tile',
              {...row, metatile_id: sceneMapCell(document.scene, row.x, row.y).metatileId}, document)})}));
        if (rows.length) {
          if (!context.buildMap?.scene_interaction_transfer?.directory) throw new TypeError('新增图块调查缺转接目录扩容许可');
          active.push(...rows); kinds.add(4);
          dynamicScenes.push({resourceId, snapshot, document, rows});
        }
      }
    }
    const scriptFields = active.some(field => field.value.startsWith('actor:0:'))
      ? await database.readBuildFields('story-interaction-script', repository, manifest.active_original_revision_id) : null;
    if (scriptFields) snapshots.push(scriptFields);
    const scriptPrograms = scriptFields ? new Map(sceneInteractionScriptPrograms(
      await database.getResourceDocument('story-interaction-script'), await database.getDocument('project.story'))
      .map(program => [Number(program.id), program])) : new Map();
    if (scriptFields) for (const page of await database.storyPageInteractionEntries()) {
      if (Number.isInteger(page.id)) scriptPrograms.set(page.id, page.program);
    }
    const documents = new Map();
    for (const field of active) {
      if (field.nativeTarget) continue;
      if (field.value.startsWith('actor:')) {
        const [, selector, argument] = field.value.split(':').map(Number);
        if (!sceneActorInteractionPermitted({text_region: selector, interaction_or_record_id: argument},
          binding.input.actor_interaction_permission)) throw new TypeError(`${field.value} 没有交互组合许可`);
        if (selector === 0 && argument) {
          const program = scriptPrograms.get(argument);
          if (!program) throw new TypeError(`${field.value} 缺当前脚本`);
          if (field.interactionKind !== 0 && sceneInteractionScriptActorDependency(program))
            throw new TypeError(SCENE_INTERACTION_ACTOR_REASON);
        }
        continue;
      }
      const target = policy.targets[field.value];
      if (!target) throw new TypeError(`${field.value} 没有目标许可`);
      const [, prefix, hex, kind, id] = field.value.split(':');
      const resourceId = `${prefix}:${hex}`;
      if (!documents.has(resourceId)) {
        const snapshot = await database.readBuildFields(resourceId, repository, manifest.active_original_revision_id);
        snapshots.push(snapshot);
        const asset = {document: cloneValidatedJson(await database.getResourceDocument(resourceId))};
        for (const field of snapshot.fields.filter(field => field.writeback?.state === 'unpermitted')) {
          for (const path of fieldAssetPaths(field)) {
            const parent = path.slice(0, -1).reduce((node, key) => node[key], asset);
            parent[path.at(-1)] = fieldRomValue(field);
          }
        }
        documents.set(resourceId, asset.document);
      }
      const document = documents.get(resourceId);
      const [, layer, parent] = SCENE_INTERACTION_LAYERS.find(([name]) => name === kind);
      const rows = parent ? document.logic.layers[parent][layer] : document.logic.layers[layer];
      const record = rows.find(row => row.id === Number.parseInt(id, 16));
      if (!record || record.kind === 'investigation-battle-trigger') throw new TypeError('交互目标不是非战斗交互点');
      targets.set(field.value, sceneInteractionTargetPayload(kind, record, document,
        target[0] >= 5 ? target[1] | target[2] << 8 : null));
    }
    return {kinds, targets, dynamicScenes, assertCurrent: async () => {for (const snapshot of snapshots) await snapshot.assertCurrent();}};
  })();
  return context.sceneInteractionState;
}

async function sceneInteractionCodeFragments(context, binding) {
  const state = await sceneInteractionBuildState(context);
  if (!state.kinds.size) return [];
  const manifest = await context.repository.getManifest();
  const snapshot = await context.fieldDb.readBuildFields(binding.asset_id, context.repository, manifest.active_original_revision_id);
  const fragments = [];
  for (const field of snapshot.fields.filter(field => field.interactionCode
    && field.interactionKinds.some(kind => state.kinds.has(kind)))) {
    const component = field.physical?.component, source = field.physical?.source;
    const permission = context.buildMap.scene_interaction_transfer.code.find(row => row.fragment_id === component?.fragment_id);
    if (!permission || !source || field.writeback?.state === 'unpermitted') throw new TypeError('交互转接代码缺许可');
    const original = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
    fieldOwner(binding.asset_id).validatePreimage(snapshot.fields, component.fragment_id, original);
    const payload = fieldOwner(binding.asset_id).serializeField({...field, value: true});
    if (await sha256Hex(payload) !== permission.approved_sha256)
      throw new TypeError('交互转接产物与许可不同');
    fragments.push({asset_id: binding.asset_id, fragment_id: component.fragment_id, slot_id: permission.slot_id,
      payload, payload_sha256: await sha256Hex(payload), codec: 'scene-interaction-code', codec_version: '1', alignment: 1, relocations: []});
  }
  const directory = context.buildMap.scene_interaction_transfer.directory;
  if (binding.asset_id === 'nearby-object-investigation-service' && directory) {
    const field = snapshot.fields.find(field => field.interactionDirectory);
    if (field?.physical?.source?.slot_id !== directory.slot_id || field.writeback?.state === 'unpermitted')
      throw new TypeError('交互转接目录缺字段绑定');
    const payload = Uint8Array.from(directory.default_bytes);
    fragments.push({asset_id: binding.asset_id, fragment_id: directory.fragment_id, slot_id: directory.slot_id,
      payload, payload_sha256: await sha256Hex(payload), codec: 'scene-interaction-directory', codec_version: '1', alignment: 1, relocations: []});
  }
  await snapshot.assertCurrent();
  await state.assertCurrent();
  return fragments;
}

// @editor-module 新增坐标转接整表与目录使用共用池和字段对象绑定。

const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};

async function prepareSceneMapPointBuild(compiled, {database, repository, baseline, bindings}) {
  const {target, buildMap} = compiled;
  const state = await sceneInteractionBuildState({bindings: bindings.bindings, buildMap, fieldDb: database, repository});
  if (!state.dynamicScenes.length) return compiled;
  const policy = buildMap.scene_interaction_transfer.directory;
  const tables = state.dynamicScenes.map(({resourceId, snapshot, rows}) => {
    const original = policy.tables.find(row => row.resource_id === resourceId);
    const payload = fieldOwner(resourceId).encode(snapshot.fields, {
      fragmentIds: new Set(original ? [original.fragment_id] : []), bindingTargets: state.targets,
      mapPointTransfer: {original, rows},
    })[0]?.payload;
    const count = (original?.count || 0) + rows.length;
    requireValue(count <= policy.maximum, `坐标转接表需要 ${count * 12} 字节，单 bank 上限为 8192 字节`);
    requireValue(payload?.length === count * 12, '坐标转接整表序列化不完整');
    return {resourceId, payload, count};
  });
  const previous = (buildMap.expansion_shared_pool?.allocations || []).filter(row => row.content_type !== 'scene-interaction-table');
  const expansion = await allocateExpansionSharedPool({baseline, target, buildMap, requests: [
    ...previous.map(row => ({...row, length: row.capacity})),
    ...tables.map(row => ({content_type: 'scene-interaction-table', identity: row.resourceId,
      asset_id: 'scene.config', length: row.payload.length})),
  ]});
  const fragments = [], directory = Uint8Array.from(policy.default_bytes);
  for (const table of tables) {
    const allocation = expansion.allocations.find(row => row.content_type === 'scene-interaction-table' && row.identity === table.resourceId);
    const slot = expansion.buildMap.slots.find(row => row.slot_id === allocation.slot_id);
    directory.set([slot.bank_index, slot.runtime_address & 255, slot.runtime_address >> 8,
      table.count & 255, table.count >> 8, 255], Number.parseInt(table.resourceId.slice(-2), 16) * 6);
    fragments.push({asset_id: 'scene.config', fragment_id: `scene.interaction.created.${table.resourceId}`,
      slot_id: slot.slot_id, payload: table.payload, payload_sha256: await sha256Hex(table.payload),
      codec: 'scene-interaction-table', codec_version: '1', alignment: 1, relocations: []});
  }
  fragments.push({asset_id: 'nearby-object-investigation-service', fragment_id: policy.fragment_id,
    slot_id: policy.slot_id, payload: directory, payload_sha256: await sha256Hex(directory),
    codec: 'scene-interaction-directory', codec_version: '1', alignment: 1, relocations: []});
  const moved = new Set(tables.map(row => row.resourceId));
  const oldSlots = new Set(policy.tables.filter(row => moved.has(row.resource_id)).map(row => row.slot_id));
  const bundles = compiled.bundles.map(bundle => ({...bundle, fragments: bundle.fragments.filter(fragment =>
    fragment.slot_id !== policy.slot_id && !oldSlots.has(fragment.slot_id))}));
  for (const fragment of fragments) {
    let bundle = bundles.find(row => row.asset_id === fragment.asset_id);
    if (!bundle) {
      bundle = {schema: BUNDLE_SCHEMA, asset_id: fragment.asset_id, encoder: 'scene-interaction-table/v1',
        encoder_version: '1', input_sha256: fragment.payload_sha256, fragments: []};
      bundles.push(bundle);
    }
    bundle.fragments.push(fragment);
  }
  const active = bundles.filter(row => row.fragments.length), changed = new Set(fragments.map(row => row.asset_id));
  await state.assertCurrent();
  return {...compiled, target: expansion.target, buildMap: expansion.buildMap, bundles: active,
    compiler_results: compiled.compiler_results.map(result => ({...result,
      changed_asset_ids: [...new Set([...result.changed_asset_ids, ...result.compiled_asset_ids.filter(id => changed.has(id))])],
      bundles: active.filter(bundle => result.compiled_asset_ids.includes(bundle.asset_id))}))};
}

async function validateSceneMapPointWrites(linker, resolved) {
  const policy = linker.buildMap.scene_interaction_transfer;
  if (!policy?.directory) return;
  const directory = policy.directory;
  requireValue(directory.default_bytes.length === 1440 && directory.maximum === Math.floor(8192 / 12)
    && directory.record_bytes === 12, '坐标转接目录许可无效');
  const write = resolved.find(row => row.slot.slot_id === directory.slot_id);
  const tables = resolved.filter(row => row.slot.slot_id.startsWith('expansion-shared-pool.scene-interaction-table:'));
  requireValue(!tables.length || write, '新增坐标转接缺目录');
  if (!write) return;
  requireValue(write.payload.length === 1440 && !write.fragment.offset_in_slot && !write.fragment.relocations.length,
    '坐标转接目录形状无效');
  for (let scene = 0; scene < 240; scene++) {
    const resourceId = `scene:${scene.toString(16).toUpperCase().padStart(2, '0')}`;
    const table = tables.find(row => row.fragment.fragment_id === `scene.interaction.created.${resourceId}`);
    const entry = write.payload.subarray(scene * 6, scene * 6 + 6);
    if (!table) {
      requireValue(entry.every((byte, index) => byte === directory.default_bytes[scene * 6 + index]), '未扩容的转接目录不能改变');
      continue;
    }
    const original = directory.tables.find(row => row.resource_id === resourceId), count = entry[3] | entry[4] << 8;
    requireValue(table.slot.owner === 'scene.config' && entry[0] === table.slot.bank_index
      && (entry[1] | entry[2] << 8) === table.slot.runtime_address && entry[5] === 255
      && count > (original?.count || 0) && count <= directory.maximum && table.payload.length === count * 12,
    '扩容转接表与目录不一致');
    const cells = new Set();
    for (let index = original?.count || 0; index < count; index++) {
      const [kind, id, x, y] = table.payload.subarray(index * 12, index * 12 + 4), cell = `${x},${y}`;
      requireValue(kind === 4 && id === scene && !cells.has(cell), '新增坐标转接身份无效或重复');
      cells.add(cell);
    }
    requireValue(!original || !resolved.some(row => row.slot.slot_id === original.slot_id), '扩容时原转接表不得写入');
  }
  requireValue(tables.every(row => {
    const resourceId = row.fragment.fragment_id.slice('scene.interaction.created.'.length);
    return /^scene:(?:[0-9A-D][0-9A-F]|E[0-9A-F])$/u.test(resourceId)
      && row.fragment.fragment_id === `scene.interaction.created.${resourceId}`
      && linker.buildMap.expansion_shared_pool.allocations.some(allocation =>
        allocation.slot_id === row.slot.slot_id && allocation.identity === resourceId
        && allocation.content_type === 'scene-interaction-table' && allocation.asset_id === 'scene.config');
  }), '新增转接表身份无效');
  const reader = policy.code.find(row => row.fragment_id.endsWith('.interaction-reader'));
  requireValue(resolved.some(row => row.slot.slot_id === reader.slot_id), '转接目录缺审定读取器');
  if (tables.length) {
    const gate = policy.code.find(row => row.fragment_id.endsWith('.tile-transfer-gate'));
    requireValue(resolved.some(row => row.slot.slot_id === gate.slot_id), '新增坐标转接缺图块门位');
  }
  for (const permission of policy.code) {
    const row = resolved.find(row => row.slot.slot_id === permission.slot_id);
    if (row) requireValue(await sha256Hex(row.payload) === permission.approved_sha256, '转接代码不是审定产物');
  }
}

// @editor-module 在 ROM 写入前统一校验目标、映射、基线与片段。

class TargetValidationError extends LinkerError {}
class BuildMapValidationError extends LinkerError {}
class PreimageError extends LinkerError {}
class OwnershipError extends LinkerError {}
class CapacityError extends LinkerError {}
class OverlapError extends LinkerError {}
class AtomicGroupError extends LinkerError {}

const regionByKind = (target, kind) => target.regions.find(region => region.kind === kind);
const slotEnd = slot => slot.file_offset + slot.capacity;
const relationshipRoot = slot => slot.alias_of || slot.mirror_of || slot.slot_id;
const bytesEqual = (left, right) => left.length === right.length &&
    left.every((byte, index) => byte === right[index]);
const staticValidationCache = new Set();

function nes2RomSize(lsb, msbNibble, unit) {
    if (msbNibble !== 0x0f) return ((msbNibble << 8) | lsb) * unit;
    return (2 ** (lsb >> 2)) * ((lsb & 0x03) * 2 + 1);
}

function romHeaderSizes(header) {
    const nes2 = (header[7] & 0x0c) === 0x08;
    return {
        prgBytes: nes2 ? nes2RomSize(header[4], header[9] & 0x0f, 16 * 1024)
            : header[4] * 16 * 1024,
        chrBytes: nes2 ? nes2RomSize(header[5], header[9] >> 4, 8 * 1024)
            : header[5] * 8 * 1024,
    };
}

class LinkValidation {
    constructor(linker) {
        this.baseline = linker.baseline;
        this.target = linker.target;
        this.buildMap = linker.buildMap;
        this.slots = linker.slots;
        this.linker = linker;
    }

    async validateTargetAndMap() {
        if (this.buildMap.target_profile_id !== this.target.profile_id) {
            throw new BuildMapValidationError("BuildMap target_profile_id does not match the target profile");
        }
        const mapHash = await canonicalHash({...this.buildMap,
            slots: [...this.buildMap.slots].sort((left, right) => compareText$3(left.slot_id, right.slot_id))});
        if (mapHash !== this.target.build_map_sha256) {
            throw new BuildMapValidationError("BuildMap hash does not match the hash pinned by the target profile");
        }
        for (const slot of this.buildMap.slots) {
            const region = regionByKind(this.target, slot.region);
            if (slot.file_offset < region.file_offset || slotEnd(slot) > region.file_offset + region.size) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} escapes the ${slot.region} region`);
            }
            const relative = slot.file_offset - region.file_offset;
            const bankIndex = Math.floor(relative / region.bank_size);
            const bankOffset = relative % region.bank_size;
            if (slot.bank_index !== bankIndex || slot.bank_offset !== bankOffset) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} bank coordinates do not match file_offset`);
            }
            if (bankOffset + slot.capacity > region.bank_size) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} crosses a physical bank boundary`);
            }
            if (slot.bank_offset % slot.alignment) {
                throw new BuildMapValidationError(`slot ${identifierRepr(slot.slot_id)} bank offset violates its alignment`);
            }
        }
        for (const slot of this.buildMap.slots) {
            const relation = slot.alias_of || slot.mirror_of;
            if (relation === null) continue;
            const target = this.slots.get(relation);
            if (!target) {
                throw new BuildMapValidationError(
                    `slot ${identifierRepr(slot.slot_id)} refers to missing slot ${identifierRepr(relation)}`);
            }
            if (target.alias_of !== null || target.mirror_of !== null) {
                throw new BuildMapValidationError("alias/mirror references must point directly to a relationship root");
            }
            if (slot.atomic_group !== target.atomic_group) {
                throw new BuildMapValidationError("related slots must use the same atomic_group");
            }
            if (slot.alias_of !== null) this.validateAlias(slot, target);
            else this.validateMirror(slot, target);
        }
        const ordered = [...this.buildMap.slots].sort((left, right) =>
            left.file_offset - right.file_offset || slotEnd(left) - slotEnd(right) ||
            compareText$3(left.slot_id, right.slot_id));
        for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
            const left = ordered[leftIndex];
            for (const right of ordered.slice(leftIndex + 1)) {
                if (right.file_offset >= slotEnd(left)) break;
                const exact = left.file_offset === right.file_offset &&
                    slotEnd(left) === slotEnd(right) &&
                    relationshipRoot(left) === relationshipRoot(right) &&
                    (left.alias_of !== null || right.alias_of !== null);
                if (!exact) {
                    throw new OverlapError(
                        `slots ${identifierRepr(left.slot_id)} and ${identifierRepr(right.slot_id)} overlap`);
                }
            }
        }
    }

    validateAlias(slot, target) {
        const fields = ["region", "file_offset", "capacity", "bank_index", "bank_offset",
            "baseline_bin", "preimage_sha256", "alignment", "fill", "runtime_address"];
        if (fields.some(field => slot[field] !== target[field])) {
            throw new BuildMapValidationError(
                `alias ${identifierRepr(slot.slot_id)} must exactly describe ${identifierRepr(target.slot_id)}`);
        }
    }

    validateMirror(slot, target) {
        const fields = ["region", "capacity", "alignment", "fill", "owner"];
        if (fields.some(field => slot[field] !== target[field])) {
            throw new BuildMapValidationError(`mirror ${identifierRepr(slot.slot_id)} has incompatible slot semantics`);
        }
        if (slot.file_offset < slotEnd(target) && target.file_offset < slotEnd(slot)) {
            throw new OverlapError("mirror slots must occupy distinct physical ranges");
        }
    }

    async validateBaseline() {
        const fileSize = regionByKind(this.target, "chr").file_offset + regionByKind(this.target, "chr").size;
        if (this.baseline.length !== fileSize) {
            throw new TargetValidationError(`baseline is ${this.baseline.length} bytes; target requires ${fileSize}`);
        }
        if (this.linker.baselineSha256 !== this.target.baseline_sha256) {
            throw new TargetValidationError("baseline hash does not match target profile");
        }
        this.validateOutputLayout(this.baseline);
    }

    validateOutputLayout(data) {
        const expectedSize = regionByKind(this.target, "chr").file_offset + regionByKind(this.target, "chr").size;
        if (data.length !== expectedSize) {
            throw new TargetValidationError("ROM output length no longer matches target");
        }
        this.validateHeader(data.subarray(0, 16));
    }

    validateHeader(header) {
        if (!bytesEqual(header.subarray(0, 4), new Uint8Array([0x4e, 0x45, 0x53, 0x1a]))) {
            throw new TargetValidationError("baseline is missing the iNES signature");
        }
        if (header[6] & 0x04) {
            throw new TargetValidationError("trainer-bearing ROMs require an explicit region schema");
        }
        const nes2 = (header[7] & 0x0c) === 0x08;
        let mapper = (header[6] >> 4) | (header[7] & 0xf0);
        let submapper = null;
        const {prgBytes: prgSize, chrBytes: chrSize} = romHeaderSizes(header);
        if (nes2) {
            mapper |= (header[8] & 0x0f) << 8;
            submapper = header[8] >> 4;
        }
        if (mapper !== this.target.mapper) {
            throw new TargetValidationError(`baseline mapper ${mapper} does not match target ${this.target.mapper}`);
        }
        if (this.target.submapper !== null && submapper !== this.target.submapper) {
            throw new TargetValidationError("baseline submapper does not match target");
        }
        if (prgSize !== regionByKind(this.target, "prg").size) {
            throw new TargetValidationError("baseline PRG size does not match target region");
        }
        if (chrSize !== regionByKind(this.target, "chr").size) {
            throw new TargetValidationError("baseline CHR size does not match target region");
        }
    }

    async validatePreimages() {
        for (const slot of this.buildMap.slots) {
            const preimage = this.baseline.slice(slot.file_offset, slotEnd(slot));
            if (await sha256Hex(preimage) !== slot.preimage_sha256) {
                throw new PreimageError(`slot ${identifierRepr(slot.slot_id)} preimage hash does not match baseline`);
            }
        }
    }

    validateTargetedSlots(fragments) {
        const targetedSlots = new Map();
        for (const fragment of fragments) {
            const previous = targetedSlots.get(fragment.slot_id) || [];
            if (previous.length && (fragment.offset_in_slot === undefined ||
                previous.some(item => item.offset_in_slot === undefined))) {
                throw new OverlapError("only one fragment may directly target a logical slot");
            }
            if (previous.some(item => item.offset_in_slot < fragment.offset_in_slot + fragment.payload.length &&
                fragment.offset_in_slot < item.offset_in_slot + item.payload.length)) {
                throw new OverlapError("fragments targeting the same logical slot overlap");
            }
            previous.push(fragment);
            targetedSlots.set(fragment.slot_id, previous);
        }
    }

    validateFragments(fragments) {
        for (const fragment of fragments) {
            const slot = this.slots.get(fragment.slot_id);
            if (!slot) {
                throw new BuildMapValidationError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} targets unknown slot ` +
                    identifierRepr(fragment.slot_id));
            }
            if (fragment.asset_id !== slot.owner) {
                throw new OwnershipError(
                    `asset ${identifierRepr(fragment.asset_id)} does not own slot ${identifierRepr(slot.slot_id)}`);
            }
            const offset = fragment.offset_in_slot ?? 0;
            if (offset + fragment.payload.length > slot.capacity) {
                throw new CapacityError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} uses ` +
                    `${fragment.payload.length} bytes; slot capacity is ${slot.capacity}`);
            }
            if (fragment.alignment > slot.alignment || slot.alignment % fragment.alignment ||
                (slot.bank_offset + offset) % fragment.alignment) {
                throw new CapacityError(
                    `fragment ${fragment.asset_id}/${fragment.fragment_id} alignment ` +
                    `is incompatible with slot ${identifierRepr(slot.slot_id)}`);
            }
        }
    }

    validateAtomicGroups(fragments) {
        const groups = new Map();
        for (const slot of this.buildMap.slots) {
            if (slot.atomic_group === null) continue;
            if (!groups.has(slot.atomic_group)) groups.set(slot.atomic_group, new Set());
            groups.get(slot.atomic_group).add(relationshipRoot(slot));
        }
        const touched = new Set(fragments.map(fragment => relationshipRoot(this.slots.get(fragment.slot_id))));
        for (const [groupId, required] of groups) {
            const present = new Set([...required].filter(slotId => touched.has(slotId)));
            if (present.size && present.size !== required.size) {
                const missing = [...required].filter(slotId => !present.has(slotId)).sort(compareText$3);
                throw new AtomicGroupError(
                    `atomic group ${identifierRepr(groupId)} is missing slots: ${missing.join(", ")}`);
            }
        }
    }

    validateRelatedWrites(resolved) {
        const sourcesByRoot = new Map();
        for (const item of resolved) {
            const root = relationshipRoot(item.slot);
            if (!sourcesByRoot.has(root)) sourcesByRoot.set(root, []);
            sourcesByRoot.get(root).push(item);
        }
        const membersByRoot = new Map();
        for (const slot of this.buildMap.slots) {
            const root = relationshipRoot(slot);
            if (!membersByRoot.has(root)) membersByRoot.set(root, []);
            membersByRoot.get(root).push(slot);
        }
        for (const rootId of [...sourcesByRoot.keys()].sort(compareText$3)) {
            const sources = sourcesByRoot.get(rootId).sort((left, right) =>
                compareText$3(left.fragment.asset_id, right.fragment.asset_id) ||
                compareText$3(left.fragment.fragment_id, right.fragment.fragment_id));
            if (sources.some(item => item.fragment.offset_in_slot !== undefined)) {
                if (sources.some(item => item.fragment.offset_in_slot === undefined)) {
                    throw new OverlapError("partial and complete fragments share a slot group");
                }
                const byOffset = new Map();
                for (const item of sources) {
                    const offset = item.fragment.offset_in_slot;
                    const same = byOffset.get(offset);
                    if (same && !bytesEqual(same[0].payload, item.payload)) {
                        throw new OverlapError("related partial fragments differ");
                    }
                    if (!same) byOffset.set(offset, [item]); else same.push(item);
                }
                const spans = [...byOffset.entries()].sort((a, b) => a[0] - b[0]);
                for (let index = 1; index < spans.length; index += 1) {
                    if (spans[index][0] < spans[index - 1][0] + spans[index - 1][1][0].payload.length) {
                        throw new OverlapError("related partial fragments overlap");
                    }
                }
                const physical = new Map();
                for (const slot of membersByRoot.get(rootId)) {
                    const key = canonicalJson([slot.file_offset, slot.capacity]);
                    if (!physical.has(key)) physical.set(key, []);
                    physical.get(key).push(slot);
                }
                const projected = [...physical.values()].map(slots => {
                    const slot = slots[0];
                    const data = this.baseline.slice(slot.file_offset, slotEnd(slot));
                    for (const [offset, items] of spans) data.set(items[0].payload, offset);
                    return data;
                });
                if (projected.slice(1).some(data => !bytesEqual(data, projected[0]))) {
                    throw new OverlapError(`mirror group ${identifierRepr(rootId)} does not render identical bytes`);
                }
                for (const slots of physical.values()) for (const [offset, items] of spans) {
                    if (offset + items[0].payload.length > slots[0].capacity) {
                        throw new CapacityError("partial fragment escapes related slot");
                    }
                }
                continue;
            }
            const payload = sources[0].payload;
            if (sources.slice(1).some(item => !bytesEqual(item.payload, payload))) {
                throw new OverlapError(`related slot group ${identifierRepr(rootId)} received different payloads`);
            }
            const byRange = new Map();
            for (const member of membersByRoot.get(rootId)) {
                const key = canonicalJson([member.file_offset, member.capacity]);
                if (!byRange.has(key)) byRange.set(key, []);
                byRange.get(key).push(member);
            }
            const rendered = [...byRange.values()].sort((left, right) =>
                left[0].file_offset - right[0].file_offset || left[0].capacity - right[0].capacity)
                .map(members => this.linker.renderSlot(members[0], payload));
            if (rendered.slice(1).some(data => !bytesEqual(data, rendered[0]))) {
                throw new OverlapError(`mirror group ${identifierRepr(rootId)} does not render identical bytes`);
            }
        }
    }

    validatePlannedWrites(planned) {
        for (let index = 1; index < planned.length; index += 1) {
            const previous = planned[index - 1];
            const current = planned[index];
            if (current.slot.file_offset + (current.offset_in_slot ?? 0) <
                previous.slot.file_offset + (previous.offset_in_slot ?? 0) + previous.data.length) {
                throw new OverlapError(
                    `planned writes for ${identifierRepr(previous.slot_ids)} and ` +
                    `${identifierRepr(current.slot_ids)} overlap`);
            }
        }
    }

    validateOutputHeader(planned) {
        const header = this.baseline.slice(0, 16);
        for (const write of planned) {
            const start = write.slot.file_offset + (write.offset_in_slot ?? 0);
            for (let index = Math.max(0, start); index < Math.min(16, start + write.data.length); index += 1) {
                header[index] = write.data[index - start];
            }
        }
        this.validateHeader(header);
    }
}

/** Validate the complete ROM build before calling linkRom. */
async function validateRomLinkInputs({baseline, target, buildMap, bundles}) {
    const linker = await RomLinker.create({baseline, target, buildMap});
    const validation = new LinkValidation(linker);
    const staticKey = await canonicalHash([
        linker.baselineSha256, linker.target, linker.buildMap,
    ]);
    if (!staticValidationCache.has(staticKey)) {
        await validation.validateTargetAndMap();
        await validation.validateBaseline();
        await validation.validatePreimages();
        await validateExpansionSharedPool(linker);
        if (staticValidationCache.size >= 4) staticValidationCache.clear();
        staticValidationCache.add(staticKey);
    }
    if (!bundles || typeof bundles[Symbol.iterator] !== "function") {
        throw new LinkerSchemaError("bundles must be iterable");
    }
    const normalized = [];
    for (const input of bundles) normalized.push(await normalizeBundle(input));
    normalized.sort((left, right) => compareText$3(left.asset_id, right.asset_id));
    const assetIds = normalized.map(bundle => bundle.asset_id);
    if (new Set(assetIds).size !== assetIds.length) {
        throw new LinkerSchemaError("bundle asset IDs must be globally unique");
    }
    const fragments = normalized.flatMap(bundle => bundle.fragments)
        .sort((left, right) => compareText$3(left.asset_id, right.asset_id) ||
            compareText$3(left.fragment_id, right.fragment_id));
    const keys = fragments.map(fragment => canonicalJson([fragment.asset_id, fragment.fragment_id]));
    if (new Set(keys).size !== keys.length) {
        throw new LinkerSchemaError("fragment identity must be globally unique");
    }
    validation.validateTargetedSlots(fragments);
    validation.validateFragments(fragments);
    validation.validateAtomicGroups(fragments);
    const resolved = fragments.map(fragment => linker.resolveFragment(fragment));
    await validateSaveExtensionWrites(linker, resolved);
    await validateStoryFarjumpWrites(linker, resolved);
    await validateSceneMapExpansionWrites(linker, resolved);
    await validateSceneObjectExpansionWrites(linker, resolved);
    await validateSceneMapPointWrites(linker, resolved);
    await validateApplicationReaderWrites(linker, resolved);
    validation.validateRelatedWrites(resolved);
    const planned = linker.planWrites(resolved);
    validation.validatePlannedWrites(planned);
    validation.validateOutputHeader(planned);
}

// @editor-module 将构建事件映射为统一会话日志与正在进行的构建任务。

const STAGES = {hydrate: "准备构建数据", prepare: "准备构建", compile: "序列化", validate: "校验",
  bundle: "准备片段", link: "写入 ROM", map: "生成映射", finalize: "校验构建结果",
  verify: "校验未写入数据", save: "构建存档", persist: "保存构建结果", done: "构建完成", error: "构建失败"};
let task = null;

function reportBuildState({running = false, event = null} = {}) {
  if (!task && (running || event)) task = editorLog.startTask({source: "构建", message: "准备构建"});
  if (!task) return;
  if (event) {
    const stage = STAGES[event.stage] || event.stage || "构建";
    const entry = {summary: stage, message: `${stage}：${event.message || event.asset_id || event.event_type || ""}`,
      level: event.status === "error" ? "error" : "info", error: event.error,
      progress: Number.isFinite(event.progress_current) && Number.isFinite(event.progress_total)
        ? {current: event.progress_current, total: event.progress_total} : null,
      details: event};
    if (["done", "error"].includes(event.stage) || event.status === "error") {
      task.finish(entry);
      task = null;
    } else task.update(entry);
  } else if (!running) {
    task.finish({level: "debug", message: "构建任务结束", progress: null});
    task = null;
  }
}

// @editor-module 汇总编译器结果与链接器报告。
// 顶层 build_id 标识 ROM/SAV 配对，linker.build_id 保留 ROM 内容身份。
const PACKAGE_BUILD_REPORT_SCHEMA = "metalmaxcn.package-build-report";

function compareText$2(left, right) {
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

function changedBuildAssetIds(compilerResults) {
  return [...new Set(compilerResults.flatMap(
    compiler => compiler.changed_asset_ids,
  ))].sort(compareText$2);
}

function packageBuildReport(linker, compilerResults, verifiedExcludedAssets, saveMetadata = {}) {
  return {
    schema: PACKAGE_BUILD_REPORT_SCHEMA,
    build_id: linker.build_id,
    target_profile_id: linker.target_profile_id,
    build_map_sha256: linker.build_map_sha256,
    baseline_sha256: linker.baseline_sha256,
    output_sha256: linker.output_sha256,
    ...saveMetadata,
    changed_bytes: linker.changed_bytes,
    changed_asset_ids: changedBuildAssetIds(compilerResults),
    verified_excluded_assets: [...verifiedExcludedAssets],
    omitted_scripts: compilerResults.flatMap(compiler => compiler.omitted_scripts || []),
    compilers: compilerResults.map(compiler => ({
      compiler_id: compiler.compiler_id,
      compiled_asset_ids: [...compiler.compiled_asset_ids],
      changed_asset_ids: [...compiler.changed_asset_ids],
      bundle_asset_ids: compiler.bundles.map(bundle => bundle.asset_id).sort(compareText$2),
    })),
    linker,
  };
}

// @editor-module 构建时把已绑定剧情页投影到字段对象与逻辑脚本片段。

async function prepareStoryPageRomBuild(repository, database) {
  if (!repository.listStoryPageWorking) return {repository, fieldDb: database, assertCurrent: async () => {}};
  const records = await repository.listStoryPageWorking();
  const assigned = records.filter(record => isStoryPageDocument(record) && record.overrides.rom_entries?.length);
  const manifest = await repository.getManifest();
  if (assigned.length) assertStoryPageEntryRom(manifest);
  const actors = await database.readBuildFields('scene-actor', repository, manifest.active_original_revision_id);
  const values = new Map();
  for (const field of actors.fields) {
    if (!values.has(field.entityHandle)) values.set(field.entityHandle, {});
    values.get(field.entityHandle)[field.fieldName] = field.value;
  }
  const bindingSnapshots = [actors];
  const targets = sceneInteractionActorTargets(await database.getResourceDocument('scene-actor'));
  for (const resourceId of await repository.listFieldWorkingResourceIds()) {
    if (!/^scene:[0-9A-F]{2}$/.test(resourceId)) continue;
    const snapshot = await database.readBuildFields(resourceId, repository, manifest.active_original_revision_id);
    bindingSnapshots.push(snapshot);
    targets.push(...sceneInteractionActorTargets(await database.getResourceDocument(resourceId)));
  }
  for (const [index, actor] of targets.entries()) values.set(`interaction-target:${index}`, actor);
  let assertionStamp, assertion;
  const assertCurrent = async () => {
    const stamp = (await repository.getBuildInputStamp?.())?.stamp;
    if (typeof stamp !== 'string' || stamp !== assertionStamp) {
      assertionStamp = stamp;
      assertion = (async () => {for (const snapshot of bindingSnapshots) await snapshot.assertCurrent();})();
    }
    await assertion;
  };
  for (const actor of values.values()) {
    if (actor.text_region === 0 && storyPageExpandedEntryIds('interaction').includes(actor.interaction_or_record_id)
      && !assigned.some(record => record.overrides.rom_entries.some(entry => entry.kind === 'interaction'
        && entry.script_id === actor.interaction_or_record_id)))
      throw new TypeError('场景对象的扩展入口缺少剧情页');
  }
  const active = assigned.filter(record => record.overrides.rom_entries.some(entry => [...values.values()].some(actor =>
    entry.kind === 'interaction' ? actor.text_region === 0 && actor.interaction_or_record_id === entry.script_id
      : actor.autonomous_script_id === entry.script_id)));
  if (!active.length) return {repository, fieldDb: database, assertCurrent};
  const [source, assets, actorOriginal] = await Promise.all([
    database.getPackageDocument('game/story/index.json', null),
    Promise.all(['story-autonomous-script', 'story-interaction-script'].map(async id => (await repository.getOriginal(id)).value)),
    repository.getOriginal('scene-actor'),
  ]);
  const scripts = createStoryPageScriptCodec(source.browser_vm, assets, actorOriginal.value.document ?? actorOriginal.value);
  const programs = new Map(), edits = new Map();
  for (const record of active) {
    const document = record.overrides.document;
    await validateStoryPageReferences(document, repository, source.browser_vm.sequences);
    if (record.overrides.rom_entries.length !== document.programs.length)
      throw new TypeError('剧情页的全部指令序列须分配 ROM 入口');
    for (const entry of record.overrides.rom_entries) {
      const program = storyPageEntryProgram(record, entry), resourceId = `story-${entry.kind}-script`;
      if (!programs.has(resourceId)) programs.set(resourceId, []);
      if (programs.get(resourceId).some(row => row.script_id === entry.script_id)) throw new TypeError('剧情页入口重复分配');
      programs.get(resourceId).push({script_id: entry.script_id, ...scripts.serializeProgram(program)});
      if ((actorOriginal.value.document ?? actorOriginal.value).records.some(actor => entry.kind === 'interaction'
        ? actor.text_region === 0 && actor.interaction_or_record_id === entry.script_id : actor.autonomous_script_id === entry.script_id))
        throw new TypeError('剧情页入口已有原始场景调用者');
    }
    for (const row of document.fields) {
      if (!edits.has(row.resource)) edits.set(row.resource, []);
      const overrides = edits.get(row.resource);
      const previous = overrides.find(edit => edit.entity_handle === row.handle && edit.field_name === row.field);
      if (previous && !canonicalJsonEqual(previous.value, row.value)) throw new TypeError('剧情页的共用字段取值冲突');
      if (!previous) overrides.push({resource_id: row.resource, entity_handle: row.handle, field_name: row.field, value: row.value});
    }
  }
  const buildManifest = freezeValidatedJson(cloneValidatedJson(manifest));
  const proxy = new Proxy(repository, {get(target, name) {
    // 构建字段会话共用本次清单快照，外层构建器核对仓库写入标记。
    if (name === 'getManifest') return async () => buildManifest;
    if (name === 'getStoryPageRomPrograms') return async resourceId => {
      await assertCurrent();
      return programs.get(resourceId) || [];
    };
    if (name === 'listFieldWorkingResourceIds') return async () => {
      await assertCurrent();
      return [...new Set([...await repository.listFieldWorkingResourceIds(), ...programs.keys(), ...edits.keys()])];
    };
    if (name === 'getFieldState') return async (resourceId, options) => {
      await assertCurrent();
      const snapshot = await repository.getFieldState(resourceId, edits.has(resourceId)
        ? {...options, includeOriginal: true, includeDependencies: true} : options);
      if (!edits.has(resourceId)) return snapshot;
      const overrides = [...snapshot.overrides];
      for (const edit of edits.get(resourceId)) {
        const old = overrides.find(row => row.entity_handle === edit.entity_handle && row.field_name === edit.field_name);
        if (old && !canonicalJsonEqual(old.value, edit.value)) throw new TypeError('剧情页与字段对象的 Working 取值冲突');
        if (!old) overrides.push(edit);
      }
      fieldOwner(resourceId).validate(snapshot.original.value, overrides, snapshot.dependencies);
      const version = snapshot.version + active.reduce((sum, record) => sum + record.version + 1, 1);
      return {...snapshot, overrides, version, meta: {...snapshot.meta, version}};
    };
    const value = Reflect.get(target, name);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  const projected = createProjectDb({repository: proxy, packageManifest: buildManifest,
    packageLoader: path => database.getPackageDocument(path, undefined, {readonly: true})});
  const usesProjection = resourceId => programs.has(resourceId) || edits.has(resourceId);
  // 未受剧情页投影影响的资源复用原字段会话与版本校验。
  const fieldDb = Object.freeze({...projected,
    getResourceDocument: resourceId => (usesProjection(resourceId) ? projected : database).getResourceDocument(resourceId),
    readBuildFields(resourceId, buildRepository, revisionId) {
      if (buildRepository !== proxy) throw new Error('构建与字段不属于同一项目会话');
      return usesProjection(resourceId) ? projected.readBuildFields(resourceId, proxy, revisionId)
        : database.readBuildFields(resourceId, repository, revisionId);
    },
  });
  return {repository: proxy, fieldDb, assertCurrent};
}

// @editor-module 从浏览器项目编排 ROM 编译、链接、构建报告和运行入口。
// Pure-browser ROM build orchestration.
//
// Static package reads are allowed only while bootstrapping the IndexedDB
// project.  A normal build resolves the active project repository, compiles
// through the selected target's explicit bindings, and invokes the one ROM
// buffer writer (rom-linker.js).  There is intentionally no HTTP build API
// fallback in this module.


const ROM_BUILD_BLOB_PREFIX = "rom-build:";
const ROM_BUILD_MEDIA_TYPE = "application/x-nes-rom";

class BrowserBuildUnavailableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "BrowserBuildUnavailableError";
  }
}

let configuredProvider = null;

const requireObject = (value, message) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BrowserBuildUnavailableError(message);
  }
  return value;
};

function publishBuildState(event = null) {
  reportBuildState({running: state.browserBuildRunning, event});
  if (event) {
    state.browserBuildCurrentEvent = event;
    state.browserBuildEvents.push(event);
  }
  if (typeof globalThis.dispatchEvent !== "function" ||
      typeof globalThis.CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent("mmeditor-browser-build", {
    detail: {
      running: state.browserBuildRunning,
      error: state.browserBuildError,
      current_event: state.browserBuildCurrentEvent,
      event,
      report: state.browserBuildReport,
    },
  }));
}

async function compileAssetBindings$1(input) {
  const compiler = await Promise.resolve().then(function () { return assetCompiler; });
  return compiler.compileAssetBindings(input);
}

function compilerFunction(assetCompiler) {
  if (typeof assetCompiler === "function") return assetCompiler;
  if (assetCompiler && typeof assetCompiler.compile === "function") {
    return input => assetCompiler.compile(input);
  }
  throw new BrowserBuildUnavailableError(
    "当前构建目标没有可用的资产编译器",
  );
}

function supportsSaveWorking(repository) {
  const canResolve = typeof repository?.resolveSaveCurrent === "function";
  const canSave = typeof repository?.saveSaveCurrent === "function";
  if (canResolve !== canSave) {
    throw new BrowserBuildUnavailableError("项目的存档 Working 接口不完整");
  }
  return canResolve && canSave;
}

function compareText$1(left, right) {
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

/**
 * Repository-backed provider boundary.  A future package-io implementation
 * can replace this object without changing the linker or build log.
 */
function createProjectStoreRomBuildProvider(repository, {
  assetCompiler = compileAssetBindings$1,
  fieldDb = db,
} = {}) {
  if (!repository || typeof repository.getManifest !== "function" ||
      typeof repository.getBlob !== "function") {
    throw new TypeError("repository must implement the project-store API");
  }
  const compile = compilerFunction(assetCompiler);
  const provider = {
    repository,
    async prepareBuild({onProgress = null, onTiming = null} = {}) {
      const readStarted = performance.now();
      const manifest = await repository.getManifest();
      if (!manifest) {
        throw new BrowserBuildUnavailableError(
          "项目尚未初始化；请先载入项目包或导入项目文件",
        );
      }
      if (!manifest.active_original_revision_id) {
        throw new BrowserBuildUnavailableError("项目没有当前原始版本");
      }
      const targetProfileId = manifest.default_target;
      if (typeof targetProfileId !== "string" || !targetProfileId) {
        throw new BrowserBuildUnavailableError(
          "项目清单没有默认构建目标，不能确定 ROM 布局",
        );
      }
      const targets = requireObject(
        manifest.targets,
        "项目清单没有构建目标定义",
      );
      const targetDefinition = requireObject(
        targets[targetProfileId],
        `项目缺少构建目标 ${targetProfileId}`,
      );
      const target = requireObject(
        targetDefinition.profile,
        `构建目标 ${targetProfileId} 缺少目标配置`,
      );
      const buildMap = requireObject(
        targetDefinition.build_map,
        `构建目标 ${targetProfileId} 缺少写入映射`,
      );
      const bindings = requireObject(
        targetDefinition.bindings,
        `构建目标 ${targetProfileId} 缺少资产绑定`,
      );
      if (target.profile_id !== targetProfileId ||
          buildMap.target_profile_id !== targetProfileId ||
          bindings.target_profile_id !== targetProfileId) {
        throw new BrowserBuildUnavailableError(
          `构建目标 ${targetProfileId} 的目标配置、写入映射与资产绑定不一致`,
        );
      }

      const baselineBlobId = manifest.baseline_blob_id;
      if (typeof baselineBlobId !== "string" || !baselineBlobId) {
        throw new BrowserBuildUnavailableError("项目没有完整的 ROM 基线");
      }
      const baselineRecord = await repository.getBlob(baselineBlobId);
      if (!baselineRecord) {
        throw new BrowserBuildUnavailableError(
          `ROM 基线不存在：${baselineBlobId}`,
        );
      }
      const baseline = new Uint8Array(await baselineRecord.data.arrayBuffer());
      if (onTiming) onTiming("read", performance.now() - readStarted);
      const compileStarted = performance.now();
      const storyBuild = await prepareStoryPageRomBuild(repository, fieldDb);
      const compiled = await compile({
        repository: storyBuild.repository,
        fieldDb: storyBuild.fieldDb,
        manifest,
        targetProfileId,
        target,
        buildMap,
        bindings,
        baseline,
        onProgress,
      });
      const remapPlan = await prepareSceneRemapCollectionBuild(compiled, {database: storyBuild.fieldDb,
        repository: storyBuild.repository, baseline, target, buildMap});
      const facilityPlan = await prepareFacilityPointBuild(remapPlan, {database: storyBuild.fieldDb,
        repository: storyBuild.repository, baseline, target: remapPlan.target, buildMap: remapPlan.buildMap});
      const plan = await prepareSceneMapPointBuild(facilityPlan, {database: storyBuild.fieldDb,
        repository: storyBuild.repository, baseline, bindings});
      await storyBuild.assertCurrent();
      if (onTiming) onTiming("compile", performance.now() - compileStarted);
      const planFields = [
        "bundles", "compiler_results", "verified_excluded_assets", "target", "buildMap",
      ];
      if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
          Object.keys(plan).sort(compareText$1).join(",") !==
            [...planFields].sort(compareText$1).join(",") ||
          ["bundles", "compiler_results", "verified_excluded_assets"].some(field => !Array.isArray(plan[field]))) {
        throw new TypeError("AssetCompiler must return a complete ROM build plan");
      }
      if (!supportsSaveWorking(repository)) {
        throw new BrowserBuildUnavailableError(
          "项目仓库没有完整的存档 Working 接口，不能生成配套存档",
        );
      }
      const saveReadStarted = performance.now();
      const saveFields = await prepareSaveBuildFieldObjects(repository);
      if (onTiming) onTiming("read", performance.now() - saveReadStarted);
      return {
        repository,
        manifest,
        targetProfileId,
        target: plan.target,
        buildMap: plan.buildMap,
        bindings,
        baseline,
        bundles: plan.bundles,
        compilerResults: plan.compiler_results,
        verifiedExcludedAssets: plan.verified_excluded_assets,
        saveFields,
      };
    },
  };
  return Object.freeze({...provider, async prepareBuild(options) {
    if (!repository.getBuildInputStamp) return provider.prepareBuild(options);
    while (true) {
      const before = await repository.getBuildInputStamp();
      try {
        const result = await provider.prepareBuild(options);
        if ((await repository.getBuildInputStamp()).stamp === before.stamp) return result;
      } catch (error) {
        if ((await repository.getBuildInputStamp()).stamp === before.stamp) throw error;
      }
    }
  }});
}

function configureBrowserRomBuildProvider(provider) {
  if (!provider || typeof provider.prepareBuild !== "function") {
    throw new TypeError("build provider must implement prepareBuild()");
  }
  configuredProvider = provider;
  return provider;
}

async function defaultProvider() {
  if (configuredProvider) return configuredProvider;
  const repository = await openActiveProjectStore();
  configuredProvider = createProjectStoreRomBuildProvider(repository);
  return configuredProvider;
}


/** Build and persist a ROM, rejecting on every unavailable/invalid state. */
async function buildBrowserRom({
  provider = null,
  onEvent = null,
  preserveEvents = false,
  buildRom = true,
  buildSave = true,
  onTiming = null,
  verify = true,
  verification = "checked",
  timings = {},
} = {}) {
  const notifyTiming = onTiming;
  onTiming = (name, duration) => {
    timings[name] = (timings[name] || 0) + duration;
    notifyTiming?.(name, duration);
  };
  if (!buildRom && !buildSave) throw new BrowserBuildUnavailableError("请选择 ROM 或 SAV");
  if (state.browserBuildRunning) {
    throw new BrowserBuildUnavailableError("已有一个 ROM 构建正在进行");
  }
  state.browserBuildRunning = true;
  state.browserBuildError = "";
  state.browserBuildEvents = preserveEvents
    ? [...state.browserBuildEvents] : [];
  state.browserBuildCurrentEvent = state.browserBuildEvents.at(-1) || null;
  state.browserBuildReport = null;
  state.browserBuildRom = null;
  state.browserBuildSave = null;
  publishBuildState();
  let lastEventAt = performance.now();
  const emit = async event => {
    const now = performance.now();
    const timedEvent = {...event, duration_ms: now - lastEventAt};
    lastEventAt = now;
    publishBuildState(timedEvent);
    if (onEvent) await onEvent(timedEvent);
  };
  try {
    const repository = !buildRom || !buildSave
      ? provider?.repository || state.projectRepository || await openActiveProjectStore()
      : null;
    const previousId = repository
      ? (await repository.getManifest())?.latest_package_build_id : null;
    let previous = null;
    if (!buildRom || !buildSave) {
      if (!previousId) throw new BrowserBuildUnavailableError("首次构建须同时选择 ROM 和 SAV");
      const [record, romRecord, saveRecord] = await Promise.all([
        repository.getBuildReport(previousId),
        repository.getBlob(`${ROM_BUILD_BLOB_PREFIX}${previousId}`),
        repository.getBlob(`${SAVE_BUILD_BLOB_PREFIX}${previousId}`),
      ]);
      if (!record?.report || !romRecord || !saveRecord) {
        throw new BrowserBuildUnavailableError("上一对构建产物不完整，无法沿用未勾选产物");
      }
      previous = {
        report: record.report,
        rom: new Uint8Array(await romRecord.data.arrayBuffer()),
        save: new Uint8Array(await saveRecord.data.arrayBuffer()),
      };
      if (await sha256Hex(previous.rom) !== previous.report.output_sha256 ||
          await sha256Hex(previous.save) !== previous.report.save_sha256) {
        throw new BrowserBuildUnavailableError("上一对构建产物摘要不符");
      }
    }
    let prepared = null;
    let result = null;
    if (buildRom) {
    await emit({
      stage: "prepare",
      event_type: "build-plan-started",
      status: "running",
      progress_current: 1,
      progress_total: 2,
      message: "读取当前原始版本、ROM 基线、构建目标与资产绑定",
    });
    const selectedProvider = provider || await defaultProvider();
    prepared = await selectedProvider.prepareBuild({onProgress: emit, onTiming});
    if (!prepared || typeof prepared !== "object" ||
        !Array.isArray(prepared.bundles) ||
        !Array.isArray(prepared.compilerResults) ||
        !Array.isArray(prepared.verifiedExcludedAssets)) {
      throw new TypeError(
        "build provider must return complete ROM compiler metadata",
      );
    }
    if (!supportsSaveWorking(prepared.repository)) {
      throw new BrowserBuildUnavailableError(
        "项目仓库没有完整的存档 Working 接口，不能生成配套存档",
      );
    }
    if (!(prepared.saveFields?.initialSave instanceof Uint8Array) ||
        typeof prepared.saveFields.openCurrent !== "function" ||
        typeof prepared.saveFields.recomputeChecksums !== "function" ||
        typeof prepared.saveFields.changedByteCount !== "function" ||
        typeof prepared.saveFields.slotStatus !== "function") {
      throw new TypeError("SAVE build provider must return complete SAVE compiler metadata");
    }
    await emit({
      stage: "prepare",
      event_type: "build-plan-ready",
      status: "success",
      progress_current: 2,
      progress_total: 2,
      message: `${prepared.bundles.length} 个 ROM bundle`,
    });
    const validationStarted = performance.now();
    await validateRomLinkInputs({
      baseline: prepared.baseline,
      target: prepared.target,
      buildMap: prepared.buildMap,
      bundles: prepared.bundles,
    });
    if (onTiming) onTiming("validate", performance.now() - validationStarted);
    await emit({
      stage: "validate", event_type: "build-inputs-validated", status: "success",
      message: "写入前校验完成",
    });
    const linkStarted = performance.now();
    result = await linkRom(
      prepared.baseline,
      prepared.target,
      prepared.buildMap,
      prepared.bundles,
      {
        // AssetCompiler has already emitted one monotonic compile N/N stream.
        // Linker's deterministic report keeps its historical `compile`
        // bundle-ready events, but the live console presents them as the
        // following bundle hand-off phase instead of restarting compile at 1.
        onEvent: event => emit(event.event_type === "bundle-ready"
          ? {...event, stage: "bundle"} : event),
      },
    );
    if (onTiming) onTiming("write", performance.now() - linkStarted);
    } else {
      prepared = {repository, manifest: await repository.getManifest()};
      result = {rom: previous.rom, report: previous.report.linker};
    }
    if (state.projectRepository !== prepared.repository) {
      throw new BrowserBuildUnavailableError("构建项目与当前存档项目不一致");
    }
    if (buildSave && !prepared.saveFields) {
      if (!supportsSaveWorking(repository)) {
        throw new BrowserBuildUnavailableError("项目仓库没有完整的存档 Working 接口");
      }
      prepared.saveFields = await prepareSaveBuildFieldObjects(repository);
    }
    const saveStarted = performance.now();
    const save = buildSave
      ? prepared.saveFields.recomputeChecksums(await prepared.saveFields.openCurrent(state))
      : previous.save;
    const saveWorkingChangedBytes = buildSave
      ? prepared.saveFields.changedByteCount(save)
      : previous.report.save_working_changed_bytes;
    const saveSlots = buildSave
      ? [1, 2].map(slot => prepared.saveFields.slotStatus(save, slot))
      : previous.report.save_slots;
    const saveChecksumValid = buildSave
      ? saveSlots.every(slot => slot.valid) : previous.report.save_checksum_valid;
    if (!saveChecksumValid) throw new BrowserBuildUnavailableError("构建存档的槽标记或校验和无效");
    const saveSha256 = buildSave ? await sha256Hex(save) : previous.report.save_sha256;
    const saveSource = buildSave
      ? saveWorkingChangedBytes ? "working" : "original"
      : previous.report.save_source;
    if (onTiming) onTiming("save", performance.now() - saveStarted);
    await emit({
      stage: "save", event_type: "save-build-ready", status: "success",
      message: `${saveWorkingChangedBytes} 个存档字节变化 · 双槽校验有效`,
    });
    const createdAt = new Date().toISOString();
    const buildId = await sha256Hex(new TextEncoder().encode(
      `${result.report.build_id}:${saveSha256}:${createdAt}:${crypto.randomUUID()}`,
    ));
    const packageReport = buildRom
      ? packageBuildReport(result.report,
        prepared.compilerResults, prepared.verifiedExcludedAssets, {
      build_id: buildId,
      created_at: createdAt,
      save_sha256: saveSha256,
      save_bytes: save.length,
      save_source: saveSource,
      save_working_changed_bytes: saveWorkingChangedBytes,
      save_checksum_valid: saveChecksumValid,
      save_slots: saveSlots,
      })
      : {...previous.report, build_id: buildId, created_at: createdAt,
        save_sha256: saveSha256, save_bytes: save.length,
        save_source: saveSource, save_working_changed_bytes: saveWorkingChangedBytes,
        save_checksum_valid: saveChecksumValid, save_slots: saveSlots};
    packageReport.build_selection = {rom: buildRom, sav: buildSave};
    if (buildRom) packageReport.layout = {
      mapper: prepared.target.mapper,
      prg_bytes: prepared.target.regions.find(region => region.kind === "prg").size,
      chr_bytes: prepared.target.regions.find(region => region.kind === "chr").size,
      diagnostic: false,
    };
    packageReport.verification = {enabled: verify, preparation: verification};
    packageReport.stage_timings_ms = {...timings};
    packageReport.carried_from = {
      rom: buildRom ? null : previousId,
      sav: buildSave ? null : previousId,
    };
    const blobId = `${ROM_BUILD_BLOB_PREFIX}${buildId}`;
    const saveBlobId = `${SAVE_BUILD_BLOB_PREFIX}${buildId}`;
    const romBlob = new Blob([result.rom], {type: ROM_BUILD_MEDIA_TYPE});
    const persistTotal = 4;
    await emit({
      stage: "persist",
      event_type: "rom-build-storing",
      status: "running",
      progress_current: 1,
      progress_total: persistTotal,
      asset_id: blobId,
      message: "保存 ROM 构建结果",
    });
    const persistStarted = performance.now();
    await prepared.repository.putBlob(blobId, romBlob, {
      kind: "rom-build",
      build_id: buildId,
      target_profile_id: result.report.target_profile_id,
      output_sha256: result.report.output_sha256,
      created_at: createdAt,
    });
    await emit({
      stage: "persist",
      event_type: "save-build-storing",
      status: "running",
      progress_current: 2,
      progress_total: persistTotal,
      asset_id: saveBlobId,
      message: "保存与 ROM 同步构建的当前存档",
    });
    await prepared.repository.putBlob(
      saveBlobId, new Blob([save], {type: SAVE_BUILD_MEDIA_TYPE}), {
        kind: "save-build",
        build_id: buildId,
        save_sha256: saveSha256,
        source: saveSource,
        working_changed_bytes: saveWorkingChangedBytes,
        checksum_valid: saveChecksumValid,
        created_at: createdAt,
      },
    );
    await emit({
      stage: "persist",
      event_type: "build-report-storing",
      status: "running",
      progress_current: persistTotal - 1,
      progress_total: persistTotal,
      asset_id: buildId,
      message: "保存结构化构建报告",
    });
    await prepared.repository.putBuildReport(buildId, packageReport, {
      createdAt,
    });
    const latestManifest = await prepared.repository.getManifest();
    if (latestManifest.active_original_revision_id !==
        prepared.manifest.active_original_revision_id) {
      throw new BrowserBuildUnavailableError(
        "构建期间当前原始版本已变化，无法将结果设为最新构建",
      );
    }
    await emit({
      stage: "persist",
      event_type: "project-manifest-updating",
      status: "running",
      progress_current: persistTotal,
      progress_total: persistTotal,
      asset_id: buildId,
      message: "更新项目的最近构建指针",
    });
    const savedManifest = await prepared.repository.saveManifest({
      ...latestManifest,
      latest_package_build_id: buildId,
    }, {
      expectedActiveRevisionId: prepared.manifest.active_original_revision_id,
      buildOutputOnly: true,
    });
    if (onTiming) onTiming("persist", performance.now() - persistStarted);
    packageReport.stage_timings_ms = {...timings};
    await prepared.repository.putBuildReport(buildId, packageReport, {createdAt});

    state.browserProjectManifest = savedManifest;
    state.browserBuildReport = packageReport;
    state.browserBuildRom = result.rom;
    state.browserBuildSave = save;
    state.browserBuildRunning = false;
    await emit({
      stage: "done",
      event_type: "package-build-complete",
      status: "success",
      progress_current: 1,
      progress_total: 1,
      asset_id: buildId,
      changed_bytes: result.report.changed_bytes,
      message: `${result.report.changed_bytes} 个 ROM 字节变化 · ` +
        `同步生成 ${save.length} B 存档 · ${saveSource === "original"
          ? "Original" : `Working 改动 ${saveWorkingChangedBytes} 字节`} · 双槽校验有效`,
    });
    return {
      ...result,
      report: packageReport,
      build_id: buildId,
      blob_id: blobId,
      save,
      save_blob_id: saveBlobId,
      created_at: createdAt,
    };
  } catch (error) {
    state.browserBuildRunning = false;
    state.browserBuildError = error instanceof Error
      ? error.message : String(error);
    publishBuildState({
      stage: "error",
      event_type: "package-build-failed",
      status: "error",
      message: state.browserBuildError,
      error,
    });
    throw error;
  }
}

function runLatestBrowserRomButton() {
  return `<a class="button" href="${siteUrl("emulator.html")}?rom=latest&amp;autostart=1"
    target="mmeditor-emulator" rel="noopener"
    title="在独立窗口运行最近一次成功构建的 ROM"
  >▶ 运行最新构建 ↗</a>`;
}

// @editor-module 按 target bindings 调度资产编译器，产出逻辑片段并检查写回能力。

const SHA256 = /^[0-9a-f]{64}$/;

class AssetCompilerError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "AssetCompilerError";
  }
}

class MissingAssetCompilerError extends AssetCompilerError {}
class AssetCompilerContractError extends AssetCompilerError {}
class ExcludedAssetModifiedError extends AssetCompilerError {}

const object = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AssetCompilerContractError(`${name} must be an object`);
  }
  return value;
};

const string = (value, name) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AssetCompilerContractError(`${name} must be a non-empty string`);
  }
  return value;
};

const hash = (value, name) => {
  return value;
};

const integer = (value, name, minimum = 0) => {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new AssetCompilerContractError(`${name} must be an integer >= ${minimum}`);
  }
  return value;
};

function strictObject(value, fields, name) {
  const result = object(value, name);
  const actual = Object.keys(result);
  const missing = fields.filter(field => !Object.hasOwn(result, field));
  const unknown = actual.filter(field => !fields.includes(field));
  if (missing.length || unknown.length) {
    const details = [];
    if (missing.length) details.push(`missing ${missing.join(", ")}`);
    if (unknown.length) details.push(`unknown ${unknown.join(", ")}`);
    throw new AssetCompilerContractError(`${name}: ${details.join("; ")}`);
  }
  return result;
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort(compareText).map(key =>
    `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function compareText(left, right) {
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

function bindingAssetBlobId(targetProfileId, assetId) {
  return `binding-asset:${string(targetProfileId, "targetProfileId")}:` +
    string(assetId, "assetId");
}

function normalizeSource(value, binding, slots) {
  const source = strictObject(value, [
    "region", "slot_id", "file_offset", "length", "asset_offset",
    "offset_in_slot",
  ], `${binding.asset_id}.sources[]`);
  string(source.region, "binding source region");
  string(source.slot_id, "binding source slot_id");
  integer(source.file_offset, "binding source file_offset");
  integer(source.length, "binding source length", 1);
  integer(source.asset_offset, "binding source asset_offset");
  integer(source.offset_in_slot, "binding source offset_in_slot");
  const slot = slots.get(source.slot_id);
  if (!slot) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: missing BuildMap slot ${source.slot_id}`,
    );
  }
  if (source.region !== slot.region ||
      source.file_offset !== slot.file_offset + source.offset_in_slot) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: source does not match slot ${source.slot_id}`,
    );
  }
  if (source.offset_in_slot + source.length > slot.capacity) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: source escapes slot ${source.slot_id}`,
    );
  }
  return {...source, slot};
}

function normalizeEvidence(value, assetId) {
  const evidence = strictObject(value, [
    "producers", "statuses", "covered_bytes",
  ], `${assetId}.evidence`);
  if (!Array.isArray(evidence.producers) || !evidence.producers.length ||
      !Array.isArray(evidence.statuses) || !evidence.statuses.length) {
    throw new AssetCompilerContractError(
      `${assetId}: evidence lists must be non-empty`,
    );
  }
  evidence.producers.forEach((item, index) =>
    string(item, `${assetId}.evidence.producers[${index}]`));
  evidence.statuses.forEach((item, index) =>
    string(item, `${assetId}.evidence.statuses[${index}]`));
  integer(evidence.covered_bytes, `${assetId}.evidence.covered_bytes`, 1);
  return evidence;
}

function normalizeBinding(value, slots) {
  const binding = strictObject(value, [
    "asset_id", "compiler_id", "input", "priority", "confidence", "status",
    "sources", "evidence",
  ], "asset binding");
  string(binding.asset_id, "binding.asset_id");
  string(binding.compiler_id, `${binding.asset_id}.compiler_id`);
  object(binding.input, `${binding.asset_id}.input`);
  integer(binding.priority, `${binding.asset_id}.priority`);
  string(binding.confidence, `${binding.asset_id}.confidence`);
  string(binding.status, `${binding.asset_id}.status`);
  if (!Array.isArray(binding.sources) || !binding.sources.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: sources must be non-empty`,
    );
  }
  const sources = binding.sources.map(source =>
    normalizeSource(source, binding, slots)).sort((left, right) =>
    left.asset_offset - right.asset_offset);
  let cursor = 0;
  for (const source of sources) {
    if (source.asset_offset !== cursor) {
      throw new AssetCompilerContractError(
        `${binding.asset_id}: sources must cover input without gaps/overlap`,
      );
    }
    cursor += source.length;
  }
  return {
    ...binding,
    sources,
    source_length: cursor,
    evidence: normalizeEvidence(binding.evidence, binding.asset_id),
  };
}

/**
 * 一项构建不得写入的资产。字段表跟 mm_target.ExcludedAsset 是同一份契约，少一
 * 个就整份 bindings 读不进来。
 *
 * `original_sha256` 描述的是基线 ROM 在 `file_offset` 处那 `length` 个字节；
 * `path` 只是这段字节的语义出处（可能是 .bin，也可能是编译类资产的 JSON），
 * **它的文件内容跟这个哈希没有关系**，不能拿来互相验证。
 */
function normalizeExcluded(value) {
  const excluded = strictObject(value, [
    "asset_id", "path", "file_offset", "length", "original_sha256",
    "confidence", "status", "reason",
  ], "excluded asset");
  string(excluded.asset_id, "excluded.asset_id");
  string(excluded.path, `${excluded.asset_id}.path`);
  integer(excluded.file_offset, `${excluded.asset_id}.file_offset`, 0);
  integer(excluded.length, `${excluded.asset_id}.length`, 1);
  hash(excluded.original_sha256, `${excluded.asset_id}.original_sha256`);
  string(excluded.confidence, `${excluded.asset_id}.confidence`);
  string(excluded.status, `${excluded.asset_id}.status`);
  string(excluded.reason, `${excluded.asset_id}.reason`);
  return excluded;
}

function normalizeBindingDocument(input, targetProfileId, target, buildMap) {
  const document = strictObject(input, [
    "schema", "target_profile_id", "build_map_sha256", "annotations_path",
    "annotations_sha256", "bindings", "excluded_assets",
  ], "asset bindings");
  if (document.target_profile_id !== targetProfileId ||
      target.profile_id !== targetProfileId ||
      buildMap.target_profile_id !== targetProfileId) {
    throw new AssetCompilerContractError("target identity mismatch in bindings");
  }
  hash(document.build_map_sha256);
  if (document.build_map_sha256 !== target.build_map_sha256) {
    throw new AssetCompilerContractError(
      "bindings BuildMap hash does not match the target profile",
    );
  }
  string(document.annotations_path, "bindings.annotations_path");
  hash(document.annotations_sha256);
  if (!Array.isArray(document.bindings) ||
      !Array.isArray(document.excluded_assets)) {
    throw new AssetCompilerContractError("binding catalogs must be arrays");
  }
  if (!Array.isArray(buildMap.slots)) {
    throw new AssetCompilerContractError("BuildMap slots must be an array");
  }
  const slots = new Map(buildMap.slots.map(slot => [slot.slot_id, slot]));
  if (slots.size !== buildMap.slots.length) {
    throw new AssetCompilerContractError("BuildMap slot IDs must be unique");
  }
  const bindings = document.bindings.map(value => normalizeBinding(value, slots));
  const excludedAssets = document.excluded_assets.map(normalizeExcluded);
  const boundIds = bindings.map(binding => binding.asset_id);
  const excludedIds = excludedAssets.map(asset => asset.asset_id);
  if (new Set(boundIds).size !== boundIds.length ||
      new Set(excludedIds).size !== excludedIds.length ||
      boundIds.some(assetId => excludedIds.includes(assetId))) {
    throw new AssetCompilerContractError(
      "binding/excluded asset IDs must be unique and disjoint",
    );
  }
  return {...document, bindings, excluded_assets: excludedAssets, slots};
}

/** Validate one published asset-bindings document against its target and BuildMap. */
function validateBindingDocument(document, targetProfileId, target, buildMap) {
  normalizeBindingDocument(document, targetProfileId, target, buildMap);
}

function gameDataInput(binding) {
  const input = strictObject(binding.input, [
    "resource_id", "asset_schema", "components",
  ], `${binding.asset_id}.input`);
  string(input.resource_id, `${binding.asset_id}.input.resource_id`);
  string(input.asset_schema, `${binding.asset_id}.input.asset_schema`);
  if (input.resource_id !== binding.asset_id) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: game-data resource identity mismatch`,
    );
  }
  if (input.asset_schema !== gameDataAssetSchema(input.resource_id)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: game-data asset schema mismatch`,
    );
  }
  if (!Array.isArray(input.components) || !input.components.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: game-data components must be a non-empty array`,
    );
  }
  const components = input.components.map((raw, index) => {
    const component = strictObject(raw, [
      "fragment_id", "asset_offset", "length", "original_sha256",
    ], `${binding.asset_id}.input.components[${index}]`);
    string(component.fragment_id, `${binding.asset_id}.component.fragment_id`);
    integer(component.asset_offset, `${binding.asset_id}.component.asset_offset`);
    integer(component.length, `${binding.asset_id}.component.length`, 1);
    hash(component.original_sha256, `${binding.asset_id}.component.original_sha256`);
    return {...component};
  }).sort((left, right) => left.asset_offset - right.asset_offset);
  const expectedSpecs = gameDataComponentSpecs(input.resource_id);
  const expectedIds = expectedSpecs.map(spec => spec.fragmentId).sort();
  const actualIds = components.map(component => component.fragment_id).sort();
  if (new Set(actualIds).size !== actualIds.length ||
      stableJson(expectedIds) !== stableJson(actualIds)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: game-data component identity set mismatch`,
    );
  }
  let cursor = 0;
  const lengths = new Map(expectedSpecs.map(spec => [spec.fragmentId, spec.length]));
  for (const component of components) {
    if (component.asset_offset !== cursor ||
        component.length !== lengths.get(component.fragment_id)) {
      throw new AssetCompilerContractError(
        `${binding.asset_id}: game-data components are not one exact compact image`,
      );
    }
    cursor += component.length;
  }
  if (cursor !== binding.source_length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: sources do not cover the complete game-data input`,
    );
  }
  return {...input, components};
}

const PARAMETER_TABLE_CODECS = new Map([
  [VEHICLE_TRADE_COMPILER_ID, {assetSchema: vehicleTradeAssetSchema,
    componentSpecs: vehicleTradeComponentSpecs, fieldOwnerOnly: true,
    componentCodec: VEHICLE_TRADE_COMPONENT_CODEC}],
  [ELEVATOR_PARAMETERS_COMPILER_ID, {assetSchema: elevatorParameterAssetSchema,
    componentSpecs: elevatorParameterComponentSpecs, fieldOwnerOnly: true,
    componentCodec: ELEVATOR_PARAMETERS_COMPONENT_CODEC}],
  [UI_LAYOUT_COMPILER_ID, {assetSchema: uiLayoutAssetSchema, componentSpecs: uiLayoutComponentSpecs,
    fieldOwnerOnly: true, componentCodec: UI_LAYOUT_COMPONENT_CODEC}],
  [UI_COMMAND_DISPATCH_COMPILER_ID, {assetSchema: uiCommandDispatchAssetSchema,
    componentSpecs: uiCommandDispatchComponentSpecs, fieldOwnerOnly: true,
    componentCodec: UI_COMMAND_DISPATCH_COMPONENT_CODEC}],
  [BOOT_PARAMETER_COMPILER_ID, {assetSchema: bootParameterAssetSchema,
    componentSpecs: bootParameterComponentSpecs, fieldOwnerOnly: true,
    componentCodec: BOOT_PARAMETER_COMPONENT_CODEC}],
  [METATILE_COMPILER_ID, {assetSchema: metatileAssetSchema, componentSpecs: metatileComponentSpecs,
    fieldOwnerOnly: true, componentCodec: METATILE_COMPONENT_CODEC}],
  [LAUNCH_ANCHOR_COMPILER_ID, {assetSchema: launchAnchorAssetSchema, componentSpecs: launchAnchorComponentSpecs,
    fieldOwnerOnly: true, componentCodec: LAUNCH_ANCHOR_COMPONENT_CODEC}],
  [CONDITIONAL_AUDIO_COMPILER_ID, {assetSchema: conditionalAudioAssetSchema,
    componentSpecs: conditionalAudioComponentSpecs, fieldOwnerOnly: true,
    componentCodec: CONDITIONAL_AUDIO_COMPONENT_CODEC}],
  [DPCM_STORAGE_COMPILER_ID, {assetSchema: dpcmStorageAssetSchema, componentSpecs: dpcmStorageComponentSpecs,
    fieldOwnerOnly: true, componentCodec: DPCM_STORAGE_COMPONENT_CODEC}],
  [NARRATIVE_GLYPHS_COMPILER_ID, {assetSchema: narrativeGlyphAssetSchema, componentSpecs: narrativeGlyphComponentSpecs,
    fieldOwnerOnly: true, componentCodec: NARRATIVE_GLYPHS_COMPONENT_CODEC}],
  [RASTER_LATCH_COMPILER_ID, {assetSchema: rasterLatchAssetSchema, componentSpecs: rasterLatchComponentSpecs,
    fieldOwnerOnly: true, componentCodec: RASTER_LATCH_COMPONENT_CODEC}],
  [STATUS_SCHEDULER_COMPILER_ID, {assetSchema: statusSchedulerAssetSchema, componentSpecs: statusSchedulerComponentSpecs,
    fieldOwnerOnly: true, componentCodec: STATUS_SCHEDULER_COMPONENT_CODEC}],
  [CHR_PRESET_COMPILER_ID, {assetSchema: chrPresetAssetSchema, componentSpecs: chrPresetComponentSpecs,
    fieldOwnerOnly: true, componentCodec: CHR_PRESET_COMPONENT_CODEC}],
  [BATTLE_WEAPON_ROUTES_COMPILER_ID, {assetSchema: battleWeaponRoutesAssetSchema,
    componentSpecs: battleWeaponRoutesComponentSpecs, fieldOwnerOnly: true,
    componentCodec: BATTLE_WEAPON_ROUTES_COMPONENT_CODEC}],
  [AUDIO_VOICE_COMPILER_ID, {assetSchema: audioVoiceAssetSchema, componentSpecs: audioVoiceComponentSpecs, fieldOwnerOnly: true, componentCodec: AUDIO_VOICE_COMPONENT_CODEC}],
  [DPCM_COMPILER_ID, {assetSchema: dpcmAssetSchema, componentSpecs: dpcmComponentSpecs, fieldOwnerOnly: true, componentCodec: DPCM_COMPONENT_CODEC}],
  [AUDIO_PERIOD_COMPILER_ID, {assetSchema: audioPeriodAssetSchema,
    componentSpecs: audioPeriodComponentSpecs, fieldOwnerOnly: true,
    componentCodec: AUDIO_PERIOD_COMPONENT_CODEC}],
  [ENCOUNTER_MESSAGE_COMPILER_ID, {assetSchema: encounterMessageAssetSchema,
    componentSpecs: encounterMessageComponentSpecs, fieldOwnerOnly: true,
    componentCodec: ENCOUNTER_MESSAGE_COMPONENT_CODEC}],
  [FIELD_REWARD_PARAMETERS_COMPILER_ID, {assetSchema: fieldRewardParametersAssetSchema,
    componentSpecs: fieldRewardParametersComponentSpecs, fieldOwnerOnly: true,
    componentCodec: FIELD_REWARD_PARAMETERS_COMPONENT_CODEC}],
  [ACQUISITION_AUDIO_ITEMS_COMPILER_ID, {assetSchema: acquisitionAudioItemsAssetSchema,
    componentSpecs: acquisitionAudioItemsComponentSpecs, fieldOwnerOnly: true,
    componentCodec: ACQUISITION_AUDIO_ITEMS_COMPONENT_CODEC}],
  [EQUIPMENT_EFFECT_ITEMS_COMPILER_ID, {assetSchema: equipmentEffectItemsAssetSchema,
    componentSpecs: equipmentEffectItemsComponentSpecs, fieldOwnerOnly: true,
    componentCodec: EQUIPMENT_EFFECT_ITEMS_COMPONENT_CODEC}],
  [CHARACTER_GROWTH_COMPILER_ID, {assetSchema: characterGrowthAssetSchema,
    componentSpecs: characterGrowthComponentSpecs, fieldOwnerOnly: true,
    componentCodec: CHARACTER_GROWTH_COMPONENT_CODEC}],
  [BATTLE_AMOUNT_COMPILER_ID, {assetSchema: battleAmountAssetSchema,
    componentSpecs: battleAmountComponentSpecs, fieldOwnerOnly: true,
    componentCodec: BATTLE_AMOUNT_COMPONENT_CODEC}],
  [ITEM_SERVICE_COMPILER_ID, {assetSchema: itemServiceAssetSchema,
    componentSpecs: itemServiceComponentSpecs, fieldOwnerOnly: true,
    componentCodec: ITEM_SERVICE_COMPONENT_CODEC}],
  [BATTLE_SHARED_TABLES_COMPILER_ID, {assetSchema: battleSharedTableAssetSchema,
    componentSpecs: battleSharedTableComponentSpecs, fieldOwnerOnly: true,
    componentCodec: BATTLE_SHARED_TABLES_COMPONENT_CODEC}],
]);
// 逐字段写回的编译器：一个字段一个片段，槽覆盖按字段核（不按「一个槽一个片段」）。
// parameter-table 那一类一直如此；game-data 与 visual-core/v1 里符合条件的绑定自 3.3 起
// 同样只写被编辑且有许可的字段，判定见 perFieldObjectIds。
// 集合在首次使用时才建：fixed-text 的 id 出自与 asset-compiler 互引的模块，模块初始化期读不到。
let perFieldCompilerIdCache = null;

function perFieldCompilerIds() {
  return perFieldCompilerIdCache ||= new Set([...PARAMETER_TABLE_CODECS.keys(), GAME_DATA_COMPILER_ID,
    VISUAL_COMPILER_ID, FACILITY_CONFIG_COMPILER_ID, STORY_COMPILER_ID, FIXED_TEXT_COMPILER_ID,
    "story-farjump-code/v1", APPLICATION_READER_COMPILER, SCENE_MAP_READER_COMPILER, SCENE_INTERACTION_CODE_COMPILER,
    SAVE_EXTENSION_COMPILER]);
}

// 绑定是否逐字段写回：绑定上的每个 owner 都要能按字段序列化且不是聚合对象（聚合绑定按整资源
// 组装，单个字段的字节不自足）；带重定位的绑定不适用（字段序列化可能只给占位字节，真值由
// 链接期写入，如 battle-action 的 layout_reference）。
// 逐字段写回的共用件：注册表在调用编译器时注入，fixed-text 模块因此不必反向引用本模块。
const FIELD_WRITEBACK = Object.freeze({perFieldObjectIds, workingFieldFragments, workingFieldResourceIds});

function perFieldObjectIds(bindings) {
  return new Set(bindings.filter(binding => {
    if (!perFieldCompilerIds().has(binding.compiler_id)) return false;
    const ownerIds = fieldOwnerIds.filter(id => id === binding.asset_id
      || fieldOwner(id).bindingResourceId === binding.asset_id);
    return ownerIds.length > 0 && ownerIds.every(id => {
      const owner = fieldOwner(id);
      return owner.objects && owner.serializeField;
    });
  }).map(binding => binding.asset_id));
}

function parameterTableCodec(compilerId) {
  const codec = PARAMETER_TABLE_CODECS.get(compilerId);
  if (!codec) throw new AssetCompilerContractError("unknown parameter-table compiler");
  return codec;
}

function parameterTableInput(binding) {
  const codec = parameterTableCodec(binding.compiler_id);
  const input = strictObject(binding.input, [
    "resource_id", "asset_schema", "components", ...(Object.hasOwn(binding.input, 'extension') ? ['extension'] : []),
  ], `${binding.asset_id}.input`);
  if (input.resource_id !== binding.asset_id ||
      input.asset_schema !== codec.assetSchema(input.resource_id)) {
    throw new AssetCompilerContractError("parameter-table identity/schema mismatch");
  }
  const specs = [...codec.componentSpecs(input.resource_id), ...(input.extension === undefined ? []
    : conditionalAudioExtensionSpecs(input.resource_id, input.extension))];
  if (!Array.isArray(input.components) || input.components.length !== specs.length) {
    throw new AssetCompilerContractError("parameter-table component count mismatch");
  }
  let cursor = 0;
  input.components.forEach((raw, index) => {
    const component = strictObject(raw, [
      "fragment_id", "asset_offset", "length", "original_sha256",
    ], "parameter-table component");
    if (component.fragment_id !== specs[index].fragmentId ||
        component.length !== specs[index].length || component.asset_offset !== cursor ||
        !SHA256.test(component.original_sha256)) {
      throw new AssetCompilerContractError("parameter-table exact component geometry mismatch");
    }
    cursor += component.length;
  });
  if (cursor !== binding.source_length) {
    throw new AssetCompilerContractError("parameter-table source length mismatch");
  }
  return input;
}

function visualInput(binding) {
  const input = strictObject(binding.input, [
    "resource_id", "asset_schema", "components", "references",
  ], `${binding.asset_id}.input`);
  string(input.resource_id, `${binding.asset_id}.input.resource_id`);
  string(input.asset_schema, `${binding.asset_id}.input.asset_schema`);
  if (input.resource_id !== binding.asset_id ||
      !VISUAL_RESOURCE_IDS.includes(input.resource_id) ||
      input.asset_schema !== visualAssetSchema(input.resource_id)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Visual semantic identity/schema mismatch`,
    );
  }
  if (!Array.isArray(input.components) || !input.components.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Visual components must be a non-empty array`,
    );
  }
  if (!Array.isArray(input.references)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Visual references must be an array`,
    );
  }
  const references = input.references.map((raw, index) => {
    const reference = strictObject(raw, [
      "resource_id", "slot_id",
    ], `${binding.asset_id}.input.references[${index}]`);
    string(reference.resource_id, `${binding.asset_id}.reference.resource_id`);
    string(reference.slot_id, `${binding.asset_id}.reference.slot_id`);
    return {...reference};
  }).sort((left, right) => compareText(left.resource_id, right.resource_id));
  if (new Set(references.map(item => item.resource_id)).size !== references.length ||
      new Set(references.map(item => item.slot_id)).size !== references.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Visual reference resource/slot IDs must be unique`,
    );
  }
  const components = input.components.map((raw, index) => {
    const component = strictObject(raw, [
      "fragment_id", "asset_offset", "length", "original_sha256",
    ], `${binding.asset_id}.input.components[${index}]`);
    string(component.fragment_id,
      `${binding.asset_id}.component.fragment_id`);
    integer(component.asset_offset,
      `${binding.asset_id}.component.asset_offset`);
    integer(component.length, `${binding.asset_id}.component.length`, 1);
    hash(component.original_sha256,
      `${binding.asset_id}.component.original_sha256`);
    return {...component};
  }).sort((left, right) => left.asset_offset - right.asset_offset);
  const expected = visualComponentSpecs(input.resource_id);
  const expectedIds = expected.map(component => component.fragmentId).sort();
  const actualIds = components.map(component => component.fragment_id).sort();
  if (new Set(actualIds).size !== actualIds.length ||
      stableJson(expectedIds) !== stableJson(actualIds)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Visual component identity set mismatch`,
    );
  }
  const lengths = new Map(expected.map(component =>
    [component.fragmentId, component.length]));
  let cursor = 0;
  for (const component of components) {
    if (component.asset_offset !== cursor ||
        component.length !== lengths.get(component.fragment_id)) {
      throw new AssetCompilerContractError(
        `${binding.asset_id}: Visual components are not one exact compact image`,
      );
    }
    cursor += component.length;
  }
  if (cursor !== binding.source_length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: sources do not cover the complete Visual input`,
    );
  }
  return {...input, components, references};
}

function facilityConfigInput(binding) {
  const input = strictObject(binding.input, [
    "resource_id", "asset_schema", "component",
  ], `${binding.asset_id}.input`);
  string(input.resource_id, `${binding.asset_id}.input.resource_id`);
  string(input.asset_schema, `${binding.asset_id}.input.asset_schema`);
  if (binding.asset_id !== FACILITY_CONFIG_RESOURCE_ID ||
      input.resource_id !== FACILITY_CONFIG_RESOURCE_ID ||
      input.asset_schema !== FACILITY_CONFIG_ASSET_SCHEMA) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: facility semantic identity/schema mismatch`,
    );
  }
  const component = strictObject(input.component, [
    "fragment_id", "length", "original_sha256",
  ], `${binding.asset_id}.input.component`);
  string(component.fragment_id, `${binding.asset_id}.component.fragment_id`);
  integer(component.length, `${binding.asset_id}.component.length`, 1);
  hash(component.original_sha256,
    `${binding.asset_id}.component.original_sha256`);
  if (component.fragment_id !== FACILITY_CONFIG_FRAGMENT_ID ||
      component.length !== binding.source_length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: facility component identity/length mismatch`,
    );
  }
  return {...input, component: {...component}};
}

function storySequencesInput(binding) {
  const input = strictObject(binding.input, [
    "resource_id", "asset_schema", "components",
  ], `${binding.asset_id}.input`);
  string(input.resource_id, `${binding.asset_id}.input.resource_id`);
  string(input.asset_schema, `${binding.asset_id}.input.asset_schema`);
  if (input.resource_id !== binding.asset_id ||
      !STORY_RESOURCE_IDS.includes(input.resource_id) ||
      input.asset_schema !== storyAssetSchema(input.resource_id)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Story semantic identity/schema mismatch`,
    );
  }
  if (!Array.isArray(input.components) || !input.components.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Story components must be a non-empty array`,
    );
  }
  const components = input.components.map((raw, index) => {
    const component = strictObject(raw, [
      "fragment_id", "asset_offset", "length", "original_sha256",
      "runtime_address",
    ], `${binding.asset_id}.input.components[${index}]`);
    string(component.fragment_id,
      `${binding.asset_id}.component.fragment_id`);
    integer(component.asset_offset,
      `${binding.asset_id}.component.asset_offset`);
    integer(component.length, `${binding.asset_id}.component.length`, 1);
    hash(component.original_sha256,
      `${binding.asset_id}.component.original_sha256`);
    if (component.runtime_address !== null) {
      integer(component.runtime_address,
        `${binding.asset_id}.component.runtime_address`);
    }
    return {...component};
  }).sort((left, right) => left.asset_offset - right.asset_offset);
  const baseIds = storyComponentIds(input.resource_id);
  const expectedIds = [...baseIds, ...(components.length > baseIds.length && input.resource_id !== "world-event"
    ? farjumpComponentIds(input.resource_id) : [])].sort();
  const actualIds = components.map(component => component.fragment_id).sort();
  if (new Set(actualIds).size !== actualIds.length ||
      stableJson(expectedIds) !== stableJson(actualIds)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Story component identity set mismatch`,
    );
  }
  let cursor = 0;
  for (const component of components) {
    if (component.asset_offset !== cursor) {
      throw new AssetCompilerContractError(
        `${binding.asset_id}: Story components must form one compact image`,
      );
    }
    cursor += component.length;
  }
  if (cursor !== binding.source_length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: sources do not cover the complete Story input`,
    );
  }
  return {...input, components};
}

function storyCodeInput(binding) {
  const input = strictObject(binding.input, ["resource_id", "asset_schema", "components"], "剧情代码绑定");
  const expected = input.resource_id === SCENE_MAP_READER_ID ? SCENE_MAP_READER_PRODUCTS.map(([id]) => `${SCENE_MAP_READER_ID}.${id}`)
    : input.resource_id === "story-script-reader" ? ["story-script-reader.code"]
    : input.resource_id === APPLICATION_READER_ID ? APPLICATION_READER_PRODUCTS.map(([id]) => `${APPLICATION_READER_ID}.${id}`)
    : input.resource_id === "scene-actor-runtime" ? ["autonomous-gate", "interaction-gate", "glyph-guard", "interaction-call", "interaction-pointer"]
      .map(id => `scene-actor-runtime.${id}`) : [];
  const schema = input.resource_id === SCENE_MAP_READER_ID ? "metalmaxcn.field-ui-module.asset.scene-data-stream-service"
    : input.resource_id === "story-script-reader" ? "metalmaxcn.story.asset.reader"
    : input.resource_id === APPLICATION_READER_ID ? 'metalmaxcn.application.asset.reader'
    : "metalmaxcn.field-ui-module.asset.scene-actor-runtime";
  if (!expected.length || binding.asset_id !== input.resource_id || input.asset_schema !== schema
      || !Array.isArray(input.components) || input.components.length !== expected.length)
    throw new AssetCompilerContractError("剧情代码字段绑定身份无效");
  let cursor = 0;
  for (const component of input.components) {
    strictObject(component, ["fragment_id", "asset_offset", "length", "original_sha256", "runtime_address"], "剧情代码组件");
    hash(component.original_sha256);
    integer(component.length, "剧情代码长度", 1);
    integer(component.runtime_address, "剧情代码 CPU 地址");
    if (!expected.includes(component.fragment_id) || component.asset_offset !== cursor)
      throw new AssetCompilerContractError("剧情代码组件域无效");
    cursor += component.length;
  }
  if (new Set(input.components.map(row => row.fragment_id)).size !== expected.length || cursor !== binding.source_length)
    throw new AssetCompilerContractError("剧情代码绑定覆盖无效");
  return input;
}

async function storyFarjumpState(context) {
  if (!context.storyFarjumpState) context.storyFarjumpState = (async () => {
    const database = context.fieldDb || db;
    const manifest = await context.repository.getManifest();
    const snapshots = [], pages = new Map();
    for (const resourceId of ["story-autonomous-script", "story-interaction-script"]) {
      const snapshot = await database.readBuildFields(resourceId, context.repository, manifest.active_original_revision_id);
      snapshots.push(snapshot);
      pages.set(resourceId, [...fieldOwner(resourceId).encode(snapshot.fields)[0].remote_pages || [],
        ...await context.repository.getStoryPageRomPrograms?.(resourceId) || []]);
    }
    const policy = context.buildMap.story_farjump;
    const extension = await saveExtensionBuildState(context);
    for (const page of [...pages.values()].flat()) for (const cursor of page.instruction_boundaries || []) {
      if (page.payload[cursor] < 0x74 || page.payload[cursor] >= 0x78) continue;
      if (!extension.active || !extension.allocations[page.payload[cursor + 1]])
        throw new AssetCompilerContractError('剧情页引用的扩展位未分配');
    }
    let permitted = !!policy && [...pages.values()].some(pages => pages.length);
    for (const resourceId of ["story-script-reader", "scene-actor-runtime"]) {
      const snapshot = await database.readBuildFields(resourceId, context.repository, manifest.active_original_revision_id);
      snapshots.push(snapshot);
      for (const permission of policy.code.filter(row => context.slots.get(row.slot_id)?.owner === resourceId)) {
        const field = snapshot.fields.find(field => field.physical?.component?.fragment_id === permission.fragment_id);
        permitted &&= !!field && field.hasOverride && field.value === true && field.writeback?.state !== "unpermitted";
      }
    }
    return {permitted, pages, assertCurrent: async () => {for (const snapshot of snapshots) await snapshot.assertCurrent();}};
  })();
  return context.storyFarjumpState;
}

async function compileSceneMapReaderAssets(context, bindings) {
  const fragments = [], snapshots = [];
  for (const binding of bindings) {
    storyCodeInput(binding);
    if (context.expandedSceneMaps?.length) {
      const manifest = await context.repository.getManifest();
      const snapshot = await context.fieldDb.readBuildFields(SCENE_MAP_READER_ID, context.repository, manifest.active_original_revision_id);
      snapshots.push(snapshot);
      for (const permission of context.buildMap.scene_map_expansion.code) {
        const field = snapshot.fields.find(field => field.physical?.component.fragment_id === permission.fragment_id);
        if (!field?.hasOverride || field.value !== true || field.writeback?.state === 'unpermitted')
          throw new AssetCompilerContractError('场景地图缺读取器代码激活或许可');
        const payload = fieldOwner(SCENE_MAP_READER_ID).serializeField(field);
        fragments.push({asset_id: SCENE_MAP_READER_ID, fragment_id: permission.fragment_id,
          slot_id: permission.slot_id, payload, payload_sha256: await sha256Hex(payload),
          codec: 'scene-map-reader-code', codec_version: '1', alignment: 1, relocations: []});
      }
    }
  }
  context.workingFieldCoverage ||= new Map();
  context.workingFieldCoverage.set(SCENE_MAP_READER_ID, fragments.map(fragment =>
    [fragment.fragment_id, fragment.slot_id, undefined, fragment.payload.length]));
  for (const snapshot of snapshots) await snapshot.assertCurrent();
  return {compiler_id: SCENE_MAP_READER_COMPILER, compiled_asset_ids: [SCENE_MAP_READER_ID],
    changed_asset_ids: fragments.length ? [SCENE_MAP_READER_ID] : [],
    bundles: fragments.length ? [{schema: BUNDLE_SCHEMA, asset_id: SCENE_MAP_READER_ID,
      encoder: SCENE_MAP_READER_COMPILER, encoder_version: '1', input_sha256: await sha256Hex(fragments[0].payload), fragments}] : []};
}

async function compileApplicationReaderAssets(context, bindings) {
  if (context.buildMap.application_farjump?.programs) return compileApplicationReader(context, bindings);
  if (!context.buildMap.application_farjump || context.buildMap.application_farjump.active_entries.length)
    throw new AssetCompilerContractError('应用程序迁移未开放');
  context.workingFieldCoverage ||= new Map();
  for (const binding of bindings) {
    storyCodeInput(binding);
    context.workingFieldCoverage.set(binding.asset_id, []);
  }
  return {compiler_id: APPLICATION_READER_COMPILER,
    compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(), changed_asset_ids: [], bundles: []};
}

async function compileStoryCodeAssets(context, bindings) {
  const database = context.fieldDb || db, state = await storyFarjumpState(context);
  const extension = await saveExtensionBuildState(context);
  const bundles = [], changed = [];
  for (const binding of bindings) {
    const input = storyCodeInput(binding), sources = new Map();
    for (const component of input.components) {
      const source = gameDataComponentSource(component, binding.sources);
      if (source.slot.owner !== input.resource_id || source.slot.capacity !== component.length
          || source.slot.runtime_address !== component.runtime_address
          || await sha256Hex(context.baseline.subarray(source.file_offset, source.file_offset + source.length)) !== component.original_sha256)
        throw new AssetCompilerContractError("剧情代码绑定或原像改变");
      sources.set(component.fragment_id, source);
    }
    const working = state.permitted ? await workingFieldFragments({database, resourceId: input.resource_id,
      componentSources: sources, baseline: context.baseline, codec: "metalmaxcn.story-code", codecVersion: "1",
      workingResourceIds: await workingFieldResourceIds(context.repository)}) : {fragments: [], changed: false};
    if (!state.permitted) {
      context.workingFieldCoverage ||= new Map();
      context.workingFieldCoverage.set(input.resource_id, []);
    }
    const value = (await database.readResource(input.resource_id)).value;
    if (extension.active && input.resource_id === 'story-script-reader' && working.fragments.length) {
      const payload = Uint8Array.from(value.document.extension_bytes);
      if (payload.length !== 2048 || await sha256Hex(payload) !== context.buildMap.save_extension.story_reader_sha256)
        throw new AssetCompilerContractError('扩展剧情读取器变体未经审定');
      working.fragments[0] = {...working.fragments[0], payload, payload_sha256: await sha256Hex(payload)};
    }
    bundles.push({schema: BUNDLE_SCHEMA, asset_id: input.resource_id, encoder: "story-farjump-code/v1",
      encoder_version: "1", input_sha256: await sha256Hex(new TextEncoder().encode(stableJson(value))), fragments: working.fragments});
    if (working.changed) changed.push(input.resource_id);
  }
  await state.assertCurrent();
  await extension.assertCurrent();
  return {compiler_id: "story-farjump-code/v1", compiled_asset_ids: bindings.map(row => row.asset_id).sort(),
    changed_asset_ids: changed.sort(), bundles};
}

function sceneInteractionCodeInput(binding) {
  const input = strictObject(binding.input, ['resource_id', 'asset_schema', 'components'], '交互转接代码绑定');
  if (!SCENE_INTERACTION_CODE_OWNERS.includes(binding.asset_id)
    || input.resource_id !== binding.asset_id || input.asset_schema !== `metalmaxcn.field-ui-module.asset.${binding.asset_id}`
    || !Array.isArray(input.components) || !input.components.length)
    throw new AssetCompilerContractError('交互转接代码绑定身份无效');
  let cursor = 0;
  for (const component of input.components) {
    strictObject(component, ['fragment_id', 'asset_offset', 'length', 'original_sha256', 'runtime_address'], '交互转接代码组件');
    integer(component.length, '交互转接代码长度', 1);
    hash(component.original_sha256);
    if (!component.fragment_id.startsWith(`${binding.asset_id}.`) || component.asset_offset !== cursor)
      throw new AssetCompilerContractError('交互转接代码组件域无效');
    cursor += component.length;
  }
  if (cursor !== binding.source_length || new Set(input.components.map(row => row.fragment_id)).size !== input.components.length)
    throw new AssetCompilerContractError('交互转接代码覆盖无效');
  return input;
}

async function compileSceneInteractionCodeAssets(context, bindings) {
  const bundles = [], changed = [];
  context.workingFieldCoverage ||= new Map();
  for (const binding of bindings) {
    sceneInteractionCodeInput(binding);
    const fragments = await sceneInteractionCodeFragments(context, binding);
    context.workingFieldCoverage.set(binding.asset_id, fragments.map(fragment =>
      [fragment.fragment_id, fragment.slot_id, undefined, fragment.payload.length]));
    if (!fragments.length) continue;
    changed.push(binding.asset_id);
    bundles.push({schema: BUNDLE_SCHEMA, asset_id: binding.asset_id, encoder: SCENE_INTERACTION_CODE_COMPILER,
      encoder_version: '1', input_sha256: await sha256Hex(fragments[0].payload), fragments});
  }
  return {compiler_id: SCENE_INTERACTION_CODE_COMPILER, compiled_asset_ids: bindings.map(row => row.asset_id).sort(),
    changed_asset_ids: changed.sort(), bundles};
}

function sceneConfigInput(binding) {
  const input = strictObject(binding.input, [
    "catalog_path", "component_catalog_path", "components", "external_assets",
    ...(Object.hasOwn(binding.input, "expansion_slots") ? ["expansion_slots"] : []),
    ...(Object.hasOwn(binding.input, "actor_interaction_permission") ? ["actor_interaction_permission"] : []),
    ...(Object.hasOwn(binding.input, 'interaction_transfer') ? ['interaction_transfer'] : []),
  ], `${binding.asset_id}.input`);
  string(input.catalog_path, `${binding.asset_id}.input.catalog_path`);
  string(input.component_catalog_path,
    `${binding.asset_id}.input.component_catalog_path`);
  if (binding.asset_id !== SCENE_BUILD_ASSET_ID ||
      input.catalog_path !== SCENE_CATALOG_PATH ||
      input.component_catalog_path !== SCENE_COMPONENT_CATALOG_PATH) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Scene identity/catalog contract mismatch`,
    );
  }
  if (!Array.isArray(input.components) || !input.components.length ||
      !Array.isArray(input.external_assets)) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Scene component lists are invalid`,
    );
  }
  const components = input.components.map((raw, index) => {
    const item = strictObject(raw, [
      "component_id", "resource_id", "asset_offset", "length",
      "original_sha256",
    ], `${binding.asset_id}.input.components[${index}]`);
    string(item.component_id, `${binding.asset_id}.component.component_id`);
    string(item.resource_id, `${binding.asset_id}.component.resource_id`);
    integer(item.asset_offset, `${binding.asset_id}.component.asset_offset`);
    integer(item.length, `${binding.asset_id}.component.length`, 1);
    hash(item.original_sha256,
      `${binding.asset_id}.component.original_sha256`);
    return {...item};
  }).sort((left, right) => left.asset_offset - right.asset_offset);
  const externalAssets = input.external_assets.map((raw, index) => {
    const item = strictObject(raw, [
      "asset_id", "component_id", "path", "asset_offset", "length",
      "original_sha256",
    ], `${binding.asset_id}.input.external_assets[${index}]`);
    string(item.asset_id, `${binding.asset_id}.external.asset_id`);
    string(item.component_id, `${binding.asset_id}.external.component_id`);
    string(item.path, `${binding.asset_id}.external.path`);
    integer(item.asset_offset, `${binding.asset_id}.external.asset_offset`);
    integer(item.length, `${binding.asset_id}.external.length`, 1);
    hash(item.original_sha256,
      `${binding.asset_id}.external.original_sha256`);
    return {...item};
  }).sort((left, right) => left.asset_offset - right.asset_offset);
  const expansionSlots = (input.expansion_slots || []).map((item, index) => {
    strictObject(item, ['fragment_id', 'asset_offset', 'length', 'original_sha256'], '地图扩展绑定');
    const expected = [['directory', 2048], ['pool-0', 5120], ['pool-1', 8192]][index];
    if (!expected || item.fragment_id !== expected[0] || item.length !== expected[1])
      throw new AssetCompilerContractError('地图扩展输入形状不同');
    hash(item.original_sha256);
    return {...item, component_id: `scene.map.${item.fragment_id}`};
  });
  if (input.expansion_slots && expansionSlots.length !== 3) throw new AssetCompilerContractError('地图扩展输入不完整');
  const interactionComponents = (input.interaction_transfer?.components || []).map(item => {
    strictObject(item, ['component_id', 'resource_id', 'asset_offset', 'length', 'original_sha256'], '交互转接数据组件');
    integer(item.length, '交互转接数据长度', 12);
    hash(item.original_sha256);
    if (item.length % 12 || !item.component_id.startsWith('scene.interaction.')
      || !hasFieldOwner(item.resource_id) || fieldOwner(item.resource_id).bindingResourceId !== 'scene.config')
      throw new AssetCompilerContractError('交互转接数据身份无效');
    return {...item};
  });
  const all = [...components, ...externalAssets, ...expansionSlots, ...interactionComponents].sort((left, right) =>
    left.asset_offset - right.asset_offset);
  const componentIds = all.map(item => item.component_id);
  const externalIds = externalAssets.map(item => item.asset_id);
  if (new Set(componentIds).size !== componentIds.length ||
      new Set(externalIds).size !== externalIds.length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: Scene component/external IDs must be unique`,
    );
  }
  let cursor = 0;
  for (const item of all) {
    if (item.asset_offset !== cursor) {
      throw new AssetCompilerContractError(
        `${binding.asset_id}: Scene inputs must form one compact image`,
      );
    }
    cursor += item.length;
  }
  if (cursor !== binding.source_length) {
    throw new AssetCompilerContractError(
      `${binding.asset_id}: sources do not cover the complete Scene input`,
    );
  }
  return {...input, components: [...components, ...interactionComponents], external_assets: externalAssets};
}

async function validateCompilerResult(compilerId, bindings, result, context) {
  const fields = [
    "compiler_id", "compiled_asset_ids", "changed_asset_ids", "bundles",
    ...(compilerId === STORY_COMPILER_ID ? ["omitted_scripts"] : []),
  ];
  strictObject(result, fields, `${compilerId} result`);
  if (result.compiler_id !== compilerId ||
      !Array.isArray(result.compiled_asset_ids) ||
      !Array.isArray(result.changed_asset_ids) ||
      !Array.isArray(result.bundles)) {
    throw new AssetCompilerContractError(`${compilerId}: invalid compiler result`);
  }
  for (const [name, values] of [
    ["compiled_asset_ids", result.compiled_asset_ids],
    ["changed_asset_ids", result.changed_asset_ids],
  ]) {
    values.forEach((assetId, index) =>
      string(assetId, `${compilerId}.${name}[${index}]`));
    if (new Set(values).size !== values.length) {
      throw new AssetCompilerContractError(
        `${compilerId}: ${name} must not contain duplicates`,
      );
    }
  }
  const expected = bindings.map(binding => binding.asset_id).sort(compareText);
  if (compilerId === STORY_COMPILER_ID) {
    if (!Array.isArray(result.omitted_scripts)) throw new AssetCompilerContractError("剧情未写入脚本清单缺失");
    const handles = new Set();
    for (const script of result.omitted_scripts) {
      strictObject(script, ["script_id", "handle", "reason", "overflow_bytes"], "未写入脚本");
      const pageCapacity = /^脚本需要 ([0-9]+) 字节，远跳页上限为 256 字节$/.exec(script.reason);
      const validReason = script.reason === "容量不足" ? script.overflow_bytes >= 1
        : pageCapacity ? Number(pageCapacity[1]) > 256 && script.overflow_bytes === Number(pageCapacity[1]) - 256
        : ["缺写入许可", "跳转落在入口之前"].includes(script.reason) && script.overflow_bytes === 0;
      if (!Number.isInteger(script.script_id) || script.script_id < 0
          || !expected.some(resourceId => script.handle === `${resourceId}:script:${script.script_id.toString(16).toUpperCase().padStart(2, "0")}`)
          || handles.has(script.handle) || !validReason
          || !Number.isSafeInteger(script.overflow_bytes) || script.overflow_bytes < 0)
        throw new AssetCompilerContractError("剧情未写入脚本清单无效");
      handles.add(script.handle);
    }
  }
  const compiled = [...result.compiled_asset_ids].sort(compareText);
  if (stableJson(expected) !== stableJson(compiled) ||
      result.changed_asset_ids.some(assetId => !compiled.includes(assetId))) {
    throw new AssetCompilerContractError(
      `${compilerId}: compiler did not consume its exact binding set`,
    );
  }
  await validateCompilerBundles(context, bindings, result.bundles);
  return result;
}

function validateCompilerSlotCoverage(bindings, fragments, objectIds = new Set()) {
  const applicationIds = new Set(bindings.filter(binding => binding.compiler_id === APPLICATION_PROGRAM_COMPILER)
    .map(binding => binding.asset_id));
  bindings = bindings.filter(binding => !applicationIds.has(binding.asset_id));
  fragments = fragments.filter(fragment => !applicationIds.has(fragment.asset_id));
  const remoteBindings = bindings.filter(binding => binding.compiler_id === STORY_COMPILER_ID
    && binding.asset_id !== "world-event" && binding.input.components.length > 2);
  for (const binding of remoteBindings) {
    const expected = [], actual = fragments.filter(fragment => fragment.asset_id === binding.asset_id);
    const sourceFor = fragmentId => {
      const component = binding.input.components.find(row => row.fragment_id === fragmentId);
      return binding.sources.find(source => source.asset_offset === component?.asset_offset);
    };
    for (const pageId of farjumpComponentIds(binding.asset_id).filter(id => id.includes(".page."))) {
      const scriptId = Number.parseInt(pageId.slice(-2), 16);
      const [directoryId] = farjumpFragmentIds(binding.asset_id, scriptId);
      if (!actual.some(fragment => fragment.fragment_id === pageId)) continue;
      const pointerId = `${binding.asset_id}.pointer.${pageId.slice(-2)}`;
      const pointer = sourceFor(`${binding.asset_id}.pointer-table`), directory = sourceFor(directoryId), page = sourceFor(pageId);
      if (!pointer || !directory || !page) throw new AssetCompilerContractError("远跳片段未绑定");
      if (farjumpOriginalEntryIds(binding.asset_id).includes(scriptId))
        expected.push([pointerId, pointer.slot_id, (scriptId - (binding.asset_id === "story-interaction-script" ? 1 : 0)) * 2, 2]);
      expected.push([directoryId, directory.slot_id, 0, 4], [pageId, page.slot_id, 0, 256]);
    }
    const keys = actual.map(fragment => [fragment.fragment_id, fragment.slot_id,
      fragment.offset_in_slot || 0, fragment.payload.length]);
    if (stableJson(expected.sort()) !== stableJson(keys.sort()))
      throw new AssetCompilerContractError("远跳入口的指针、目录与整页覆盖不同");
  }
  const expansionSlots = new Set(bindings.filter(binding => binding.compiler_id === SCENE_COMPILER_ID)
    .flatMap(binding => (binding.input.expansion_slots || []).map(component =>
      binding.sources.find(source => source.asset_offset === component.asset_offset)?.slot_id)));
  bindings = bindings.map(binding => ({...binding, sources: binding.sources.filter(source => !expansionSlots.has(source.slot_id))}));
  fragments = fragments.filter(fragment => !expansionSlots.has(fragment.slot_id));
  const remoteIds = new Set(remoteBindings.map(binding => binding.asset_id));
  bindings = bindings.filter(binding => !remoteIds.has(binding.asset_id));
  fragments = fragments.filter(fragment => !remoteIds.has(fragment.asset_id));
  const objectSlots = new Set(bindings.filter(binding => objectIds.has(binding.asset_id))
    .flatMap(binding => binding.sources.map(source => source.slot_id)));
  const completeSlots = new Set(bindings.filter(binding => !objectIds.has(binding.asset_id)).flatMap(binding => binding.sources.map(source => source.slot_id)));
  const actualSlots = fragments.filter(fragment => !objectSlots.has(fragment.slot_id)).map(fragment => fragment.slot_id);
  if (new Set(actualSlots).size !== actualSlots.length ||
      stableJson([...completeSlots].sort()) !== stableJson([...actualSlots].sort())) {
    throw new AssetCompilerContractError("compiler slot coverage mismatch");
  }
}

function validateCompilerBundleOwners(context, bindings, bundles, fragments) {
  const expectedSlots = new Set(bindings.flatMap(binding =>
    binding.sources.map(source => source.slot_id)));
  const bundleIds = bundles.map(bundle => bundle.asset_id);
  if (new Set(bundleIds).size !== bundleIds.length) {
    throw new AssetCompilerContractError("compiler bundle IDs must be unique");
  }
  for (const fragment of fragments) {
    const slot = context.slots.get(fragment.slot_id);
    if (!slot || fragment.asset_id !== slot.owner ||
        !bundleIds.includes(fragment.asset_id)) {
      throw new AssetCompilerContractError(
        `${fragment.fragment_id}: fragment does not use its slot owner`,
      );
    }
  }
  for (const owner of new Set([...expectedSlots].map(slotId =>
    context.slots.get(slotId).owner))) {
    const relationshipRoot = slot =>
      slot.alias_of || slot.mirror_of || slot.slot_id;
    const expectedRoots = new Set(
      [...expectedSlots].map(slotId =>
        relationshipRoot(context.slots.get(slotId))),
    );
    const ownerRoots = new Set(
      [...context.slots.values()]
        .filter(slot => slot.owner === owner)
        .map(relationshipRoot),
    );
    if ([...ownerRoots].some(rootId => !expectedRoots.has(rootId))) {
      throw new AssetCompilerContractError(
        `bindings cover only part of owner group ${owner}`,
      );
    }
  }
}

// 完整槽片段须校验覆盖与归属，Working 字段覆盖由浏览器入口校验。
function validateCompleteCompilerBundles({slots, bindings, bundles}) {
  const context = {slots: slots instanceof Map ? slots : new Map(slots)};
  const fragments = bundles.flatMap(bundle => bundle.fragments || []);
  validateCompilerSlotCoverage(bindings, fragments, perFieldObjectIds(bindings));
  validateCompilerBundleOwners(context, bindings, bundles, fragments);
}

async function validateCompilerBundles(context, bindings, bundles) {
  const fragments = bundles.flatMap(bundle => bundle.fragments || []);
  // 逐字段写回的编译器（perFieldCompilerIds）按「一个字段一个片段」放置 Working
  // （字段片段 id 由对象、句柄与字段名拼出）；其余编解码器整组件重编后按组件产出片段，
  // 片段形状不同，逐字段覆盖率对它们不成立。
  const objectIds = perFieldObjectIds(bindings);
  // 只核有 Working 覆盖的绑定：未编辑的 owner 不取对象（大 owner 上万个对象）。
  const workingIds = await workingFieldResourceIds(context.repository);
  const objectBindings = bindings.filter(binding => objectIds.has(binding.asset_id)
    && (!workingIds || fieldOwnerIds.some(id => (id === binding.asset_id
      || fieldOwner(id).bindingResourceId === binding.asset_id) && workingIds.has(id))));
  validateCompilerSlotCoverage(bindings, fragments, objectIds);
  for (const binding of objectBindings) {
    let expected = context.workingFieldCoverage?.get(binding.asset_id);
    if (!expected) {
      expected = [];
      const ownerIds = fieldOwnerIds.filter(id => id === binding.asset_id
        || fieldOwner(id).bindingResourceId === binding.asset_id)
        .filter(id => !workingIds || workingIds.has(id));
      for (const ownerId of ownerIds) await forEachFieldObject(context.fieldDb || db, ownerId,
        object => {
          expected.push(...object.buildFields
            .flatMap(field => fieldWorkingCoverage(object, field)));
        });
    }
    const sourceSlots = new Set(binding.sources.map(source => source.slot_id));
    const actual = fragments.filter(fragment => sourceSlots.has(fragment.slot_id))
      .map(fragment => [fragment.fragment_id, fragment.slot_id, fragment.offset_in_slot, fragment.payload.length]);
    if (stableJson(expected.sort()) !== stableJson(actual.sort()))
      throw new AssetCompilerContractError("compiler Working field coverage mismatch "
        + JSON.stringify({asset: binding.asset_id, expected: expected.slice(0, 4), actual: actual.slice(0, 4)}));
  }
  validateCompilerBundleOwners(context, bindings, bundles, fragments);
}

class AssetCompilerRegistry {
  constructor() {
    this.compilers = new Map();
    this.inputReaders = new Map();
  }

  register(compilerId, compiler, inputReader = null) {
    string(compilerId, "compilerId");
    if (typeof compiler !== "function") throw new TypeError("compiler must be callable");
    if (this.compilers.has(compilerId)) {
      throw new AssetCompilerContractError(`compiler already registered: ${compilerId}`);
    }
    this.compilers.set(compilerId, compiler);
    if (inputReader) this.inputReaders.set(compilerId, inputReader);
    return this;
  }

  async compile(context, bindings, {onProgress = null} = {}) {
    const grouped = new Map();
    for (const binding of bindings) {
      if (!grouped.has(binding.compiler_id)) grouped.set(binding.compiler_id, []);
      grouped.get(binding.compiler_id).push(binding);
    }
    const results = [];
    for (const compilerId of [...grouped.keys()].sort()) {
      const compiler = this.compilers.get(compilerId);
      if (!compiler) {
        throw new MissingAssetCompilerError(
          `no AssetCompiler registered for ${compilerId}`,
        );
      }
      const selected = grouped.get(compilerId).sort((left, right) =>
        left.asset_id.localeCompare(right.asset_id));
      const result = await compiler(context, selected, {onProgress, writeback: FIELD_WRITEBACK});
      results.push(await validateCompilerResult(compilerId, selected, result, context));
    }
    return results;
  }
}

// 字段对象的物理位置可以没有（`project-db` 只读/语义字段的显式无地址形状）：
// 只读字段与写入许可未发布的字段都不参与构建，缺物理绑定不算违约；可写字段缺绑定仍报错。
function writableFieldWithoutBinding(field) {
  return !field.readOnly && field.writeback?.state !== "unpermitted";
}

// 组件须唯一映射到完整槽；零偏移使用组件的整数表示。
function gameDataComponentSource(component, sources) {
  const zero = typeof component.asset_offset === "bigint" ? 0n : 0;
  const selected = sources.filter(source =>
    component.asset_offset <= source.asset_offset &&
    source.asset_offset < component.asset_offset + component.length);
  if (selected.length !== 1) {
    throw new AssetCompilerContractError(
      `${component.fragment_id}: game-data component must map to exactly one slot`,
    );
  }
  const source = selected[0];
  if (source.asset_offset !== component.asset_offset ||
      source.length !== component.length || source.offset_in_slot !== zero) {
    throw new AssetCompilerContractError(
      `${component.fragment_id}: unsupported partial-slot mapping`,
    );
  }
  return source;
}

// 逐字段写回：只发被编辑、有物理位置且有写入许可的字段片段；其余字节来自基线。
// 片段按字段自己的 source 定位（含分列字节的 byteOffsets），与 parameter-table 同一形状。
async function fieldFragment(assetId, resourceId, object, field, source, offsetInFragment, payload, byteIndex, codec, codecVersion,
                             relocations = []) {
  const offsetInSlot = source.offset_in_slot + offsetInFragment;
  if (!Number.isInteger(offsetInSlot) || offsetInSlot < 0
      || offsetInSlot + payload.length > source.offset_in_slot + source.length) {
    throw new AssetCompilerContractError(
      `${resourceId}: field fragment escapes its source`,
    );
  }
  return {
    asset_id: assetId,
    fragment_id: JSON.stringify(byteIndex === null
      ? [object.id, field.entityHandle, field.fieldName]
      : [object.id, field.entityHandle, field.fieldName, byteIndex]),
    slot_id: source.slot_id,
    offset_in_slot: offsetInSlot,
    payload,
    payload_sha256: await sha256Hex(payload),
    codec,
    codec_version: codecVersion,
    alignment: 1,
    relocations,
  };
}

function fieldWorkingCoverage(object, field) {
  const physical = field.physical;
  const locations = physical.locations || [physical];
  if (locations.length > 1) return locations.map((location, index) => [
    JSON.stringify([object.id, field.entityHandle, field.fieldName, index]),
    location.source.slot_id, location.source.offset_in_slot + location.offsetInFragment, location.byteLength,
  ]);
  const base = physical.source.offset_in_slot;
  if (physical.byteOffsetsInFragment) return physical.byteOffsetsInFragment.map((offset, index) => [
    JSON.stringify([object.id, field.entityHandle, field.fieldName, index]),
    physical.source.slot_id, base + offset, 1,
  ]);
  return [[JSON.stringify([object.id, field.entityHandle, field.fieldName]),
    physical.source.slot_id, base + physical.offsetInFragment, physical.byteLength]];
}

// 只有 Working 里有覆盖的 owner 才需要扫对象：未编辑的 owner 一个字段都不会发。
async function workingFieldResourceIds(repository) {
  if (typeof repository?.listFieldWorkingResourceIds !== "function") return null;
  return new Set(await repository.listFieldWorkingResourceIds());
}

// 构建期按页扫字段对象：一次只驻留一页，避免大 owner（如 shared-chr-bank 上万个对象）撑爆内存。
const FIELD_OBJECT_PAGE = 256;

async function forEachFieldObject(database, resourceId, visit) {
  const count = await database.getFieldObjectCount(resourceId);
  const seen = new Set();
  for (let offset = 0; offset < count; offset += FIELD_OBJECT_PAGE) {
    const objects = await database.getFieldObjects(resourceId, {offset, limit: FIELD_OBJECT_PAGE});
    // 不吃分页参数的 owner 每次返回整份定义：带走重复项后即可收工。
    if (objects.length > FIELD_OBJECT_PAGE) {
      for (const object of objects) if (!seen.has(object.id)) { seen.add(object.id); await visit(object); }
      return;
    }
    for (const object of objects) {
      if (seen.has(object.id)) continue;
      seen.add(object.id);
      await visit(object);
    }
    if (!objects.length) return;
  }
}

async function workingFieldFragments({database, resourceId, assetId = resourceId, assetIdForSource = null,
                                              componentSources, baseline, codec, codecVersion,
                                              workingResourceIds, referenceTargets = null, expectedCoverage = null}) {
  const fragments = [];
  let changed = false;
  if (workingResourceIds && !workingResourceIds.has(resourceId)) return {fragments, changed};
  const targetAssetId = source => assetIdForSource ? assetIdForSource(source) : assetId;
  await forEachFieldObject(database, resourceId, async object => {
    if (expectedCoverage) expectedCoverage.push(...object.buildFields
      .flatMap(field => fieldWorkingCoverage(object, field)));
    if (!object.edited) return;
    for (const {field, payload} of object.serializeWorking()) {
      const physical = field.physical;
      const encoded = payload instanceof Uint8Array ? {bytes: payload, relocations: []} : payload;
      const bytes = encoded?.bytes ?? encoded?.payload;
      if (!(bytes instanceof Uint8Array) || !Array.isArray(encoded?.relocations || [])) {
        throw new AssetCompilerContractError(`${resourceId}: field serialization is invalid`);
      }
      const relocations = (encoded.relocations || []).map(relocation => {
        const target = referenceTargets?.get(relocation.target_resource_id);
        if (!target || relocation.offset < 0 || relocation.offset + 2 > bytes.length) {
          throw new AssetCompilerContractError(`${resourceId}: field relocation is invalid`);
        }
        return {type: "le16-pointer", offset: relocation.offset,
          target_slot_id: target.slot_id, target_offset: 0, addend: 0};
      });
      const locations = physical.locations || [physical];
      if (locations.length > 1) {
        const expectedLength = locations.reduce((total, location) => total + location.byteLength, 0);
        if (relocations.length || bytes.length !== expectedLength) {
          throw new AssetCompilerContractError(`${resourceId}: multi-fragment field payload is invalid`);
        }
        let cursor = 0;
        for (const [locationIndex, location] of locations.entries()) {
          const source = componentSources.get(location.component.fragment_id);
          if (!source) throw new AssetCompilerContractError(`${resourceId}: multi-fragment source is invalid`);
          const componentBaseline = baseline.subarray(source.file_offset, source.file_offset + source.length);
          if (componentBaseline.length !== location.component.length) {
            throw new AssetCompilerContractError(`${resourceId}: field component differs from baseline`);
          }
          if (typeof fieldOwner(resourceId).validatePreimage === "function") {
            object.validatePreimage(location.component.fragment_id, componentBaseline);
          }
          const fragmentPayload = bytes.subarray(cursor, cursor + location.byteLength);
          cursor += location.byteLength;
          changed ||= fragmentPayload.some((byte, index) =>
            byte !== componentBaseline[location.offsetInFragment + index]);
          fragments.push(await fieldFragment(targetAssetId(source), resourceId, object, field, source,
            location.offsetInFragment, fragmentPayload, locationIndex, codec, codecVersion));
        }
        continue;
      }
      const source = componentSources.get(physical.component.fragment_id);
      if (!source || bytes.length !== physical.byteLength) {
        throw new AssetCompilerContractError(`${resourceId}: field fragment is invalid`);
      }
      const componentBaseline = baseline.subarray(source.file_offset, source.file_offset + source.length);
      if (componentBaseline.length !== physical.component.length) {
        throw new AssetCompilerContractError(`${resourceId}: field component differs from baseline`);
      }
      // 该片段（整组件）的 Origin 原像必须与基线一致：未编辑的兄弟字段也不许漂移。
      // 域 owner 没提供原像校验时（如 actor-visual），其组件原像由调用方按 defaults 重编码核对。
      if (typeof fieldOwner(resourceId).validatePreimage === "function")
        object.validatePreimage(physical.component.fragment_id, componentBaseline);
      const byteOffsets = physical.byteOffsetsInFragment;
      if (byteOffsets) {
        if (relocations.length || byteOffsets.length !== bytes.length) {
          throw new AssetCompilerContractError(`${resourceId}: field byte offsets differ from payload length`);
        }
        for (const [index, offset] of byteOffsets.entries()) {
          if (!Number.isInteger(offset) || offset < 0 || offset + 1 > physical.component.length) {
            throw new AssetCompilerContractError(`${resourceId}: field fragment escapes its component`);
          }
          const byte = new Uint8Array([bytes[index]]);
          changed ||= byte[0] !== componentBaseline[offset];
          fragments.push(await fieldFragment(targetAssetId(source), resourceId, object, field, source, offset, byte, index, codec, codecVersion));
        }
        continue;
      }
      const offset = physical.offsetInFragment;
      if (offset + bytes.length > physical.component.length) {
        throw new AssetCompilerContractError(`${resourceId}: field fragment escapes its component`);
      }
      changed ||= bytes.some((byte, index) => byte !== componentBaseline[offset + index]);
      fragments.push(await fieldFragment(targetAssetId(source), resourceId, object, field, source, offset, bytes, null, codec, codecVersion,
        relocations));
    }
  });
  return {fragments, changed};
}

/** Exact browser port of Python compile_game_data_assets(). */
async function compileGameDataAssets(context, bindings, {
  onProgress = null,
} = {}) {
  if (bindings.some(binding => binding.compiler_id !== GAME_DATA_COMPILER_ID)) {
    throw new AssetCompilerContractError(
      "game-data/v1 received another compiler's binding",
    );
  }
  if (!context.repository || typeof context.repository.resolve !== "function") {
    throw new AssetCompilerError(
      "game-data/v1 requires repository.resolve(resourceId)",
    );
  }
  const bundles = [];
  const changedIds = new Set();
  for (const binding of bindings) {
    const input = gameDataInput(binding);
    const componentSources = new Map();
    for (const component of input.components) {
      const source = gameDataComponentSource(component, binding.sources);
      context.baseline.subarray(
        source.file_offset,
        source.file_offset + source.length,
      );
      componentSources.set(component.fragment_id, source);
    }

    const owner = hasFieldOwner(input.resource_id) ? fieldOwner(input.resource_id) : null;
    const database = context.fieldDb || db;
    const snapshot = owner ? await database.readBuildFields(input.resource_id, context.repository,
      (await context.repository.getManifest()).active_original_revision_id) : null;
    const resolved = owner ? await database.readResource(input.resource_id)
      : await context.repository.resolve(input.resource_id);
    if (!resolved || !Object.hasOwn(resolved, "value")) {
      throw new AssetCompilerError(
        `${input.resource_id}: browser project has no effective semantic value`,
      );
    }
    const asset = resolved.value;
    if (!asset || asset.resource_id !== input.resource_id) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: effective semantic asset identity/schema mismatch`,
      );
    }
    if (owner) {
      await validateGameDataComponentPreimages(asset, input.resource_id);
      for (const field of snapshot.fields) {
        const physical = field.physical;
        if (!physical && !writableFieldWithoutBinding(field)) continue;
        const component = input.components.find(row => row.fragment_id === physical?.component.fragment_id);
        const source = componentSources.get(component?.fragment_id);
        const slot = context.buildMap.slots.find(row => row.slot_id === source?.slot_id);
        if (!physical || physical.targetId !== context.targetProfileId || !component || !source
            || stableJson(physical.component) !== stableJson(component)
            || ["file_offset", "slot_id", "offset_in_slot", "asset_offset", "length"]
              .some(key => physical.source[key] !== source[key])
            || slot?.owner !== physical.slot?.owner
            || (slot.owner !== input.resource_id
              && (!slot.atomic_group || slot.owner !== `asset-group:${slot.atomic_group}`))
            || slot.capacity !== source.length
            || slot.file_offset !== source.file_offset)
          throw new AssetCompilerContractError(`${input.resource_id}: field physical binding changed`);
      }
    }
    const workingResourceIds = await workingFieldResourceIds(context.repository);
    const perField = owner ? perFieldObjectIds([binding]).has(input.resource_id) : false;
    if (!perField) {
      throw new AssetCompilerContractError(`${input.resource_id}: gameplay data requires field bindings`);
    }
    const fragments = [];
    // 只发被编辑且有许可的字段片段；未编辑的字节不动（合同 3.3）。
    const working = await workingFieldFragments({database, resourceId: input.resource_id,
      componentSources, baseline: context.baseline, codec: GAME_DATA_COMPONENT_CODEC,
      codecVersion: GAME_DATA_COMPONENT_CODEC_VERSION, workingResourceIds,
      assetIdForSource: source => context.slots.get(source.slot_id).owner});
    fragments.push(...working.fragments);
    const changed = working.changed;
    const inputSha256 = await gameDataAssetInputSha256(asset);
    await snapshot?.assertCurrent();
    for (const assetId of new Set(fragments.map(fragment => fragment.asset_id))) bundles.push({
      schema: BUNDLE_SCHEMA,
      asset_id: assetId,
      encoder: GAME_DATA_ENCODER,
      encoder_version: GAME_DATA_ENCODER_VERSION,
      input_sha256: inputSha256,
      fragments: fragments.filter(fragment => fragment.asset_id === assetId),
    });
    if (changed) changedIds.add(input.resource_id);
    if (onProgress) await onProgress({
      stage: "compile",
      event_type: "asset-compiled",
      status: changed ? "success" : "skipped-clean",
      asset_id: input.resource_id,
      encoder: GAME_DATA_COMPILER_ID,
      input_sha256: inputSha256,
      message: `${fragments.length} ROM fragment(s)`,
    });
  }
  return {
    compiler_id: GAME_DATA_COMPILER_ID,
    compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(),
    changed_asset_ids: [...changedIds].sort(),
    bundles,
  };
}

/** Exact browser port of Python compile_facility_config_assets(). */
async function compileFacilityConfigAssets(context, bindings, {
  onProgress = null,
} = {}) {
  if (bindings.length !== 1 ||
      bindings[0].compiler_id !== FACILITY_CONFIG_COMPILER_ID) {
    throw new AssetCompilerContractError(
      "facility-config/v1 requires exactly one facility binding",
    );
  }
  if (!context.repository || typeof context.repository.resolve !== "function") {
    throw new AssetCompilerError(
      "facility-config/v1 requires repository.resolve(resourceId)",
    );
  }
  const binding = bindings[0];
  const input = facilityConfigInput(binding);
  if (binding.sources.length !== 1) {
    throw new AssetCompilerContractError(
      "facility-config/v1 component must map to exactly one slot",
    );
  }
  const source = binding.sources[0];
  if (source.asset_offset !== 0 || source.offset_in_slot !== 0 ||
      source.length !== input.component.length) {
    throw new AssetCompilerContractError(
      "facility-config/v1 source does not cover its exact component",
    );
  }
  const original = context.baseline.subarray(
    source.file_offset,
    source.file_offset + source.length,
  );
  const database = context.fieldDb || db;
  const manifest = await context.repository.getManifest();
  const snapshot = await database.readBuildFields(input.resource_id, context.repository,
    manifest.active_original_revision_id);
  const resolved = await database.readResource(input.resource_id);
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== input.resource_id) {
    throw new AssetCompilerContractError(
      "facility-config/v1 effective semantic asset identity/schema mismatch",
    );
  }
  const slot = context.slots.get(source.slot_id);
  for (const field of snapshot.fields) {
    const physical = field.physical;
    if (!physical && !writableFieldWithoutBinding(field)) continue;
    if (!physical || physical.targetId !== context.targetProfileId
        || stableJson(physical.component) !== stableJson({...input.component, asset_offset: 0})
        || physical.source.file_offset !== source.file_offset || physical.source.slot_id !== source.slot_id
        || physical.source.offset_in_slot !== source.offset_in_slot || physical.source.asset_offset !== source.asset_offset
        || physical.source.length !== source.length || slot?.owner !== input.resource_id
        || slot.file_offset !== source.file_offset || slot.capacity !== source.length)
      throw new AssetCompilerContractError("设施字段物理引用与构建 binding 不一致");
  }
  const payload = encodeFacilityConfigurationFields(snapshot.fields)[0].payload;
  const before = encodeFacilityConfigurationFields(snapshot.fields, {defaults: true})[0].payload;
  if (before.length !== original.length || before.some((byte, index) => byte !== original[index])
      || await sha256Hex(original) !== input.component.original_sha256)
    throw new AssetCompilerContractError("设施字段 Original 与绑定原像不一致");
  if (payload.length !== source.length) {
    throw new AssetCompilerContractError(
      `facility-config/v1 encoded ${payload.length}; expected ${source.length}`,
    );
  }
  let fragments, changed;
  if (perFieldObjectIds([binding]).has(input.resource_id)) {
    // 只发被编辑且有许可的字段片段；未编辑的字节留在基线（合同 3.3）。
    const working = await workingFieldFragments({database, resourceId: input.resource_id,
      componentSources: new Map([[input.component.fragment_id, source]]),
      baseline: context.baseline, codec: FACILITY_CONFIG_COMPONENT_CODEC,
      codecVersion: FACILITY_CONFIG_COMPONENT_CODEC_VERSION,
      workingResourceIds: await workingFieldResourceIds(context.repository)});
    fragments = working.fragments;
    changed = working.changed;
  } else {
    changed = payload.some((byte, index) => byte !== original[index]);
    fragments = [{
      asset_id: binding.asset_id,
      fragment_id: input.component.fragment_id,
      slot_id: source.slot_id,
      payload,
      payload_sha256: await sha256Hex(payload),
      codec: FACILITY_CONFIG_COMPONENT_CODEC,
      codec_version: FACILITY_CONFIG_COMPONENT_CODEC_VERSION,
      alignment: 1,
      relocations: [],
    }];
  }
  const inputSha256 = await facilityConfigurationInputSha256(asset);
  await snapshot.assertCurrent();
  const bundle = {
    schema: BUNDLE_SCHEMA,
    asset_id: binding.asset_id,
    encoder: FACILITY_CONFIG_ENCODER,
    encoder_version: FACILITY_CONFIG_ENCODER_VERSION,
    input_sha256: inputSha256,
    fragments,
  };
  if (onProgress) await onProgress({
    stage: "compile",
    event_type: "asset-compiled",
    status: changed ? "success" : "skipped-clean",
    asset_id: binding.asset_id,
    encoder: FACILITY_CONFIG_COMPILER_ID,
    input_sha256: inputSha256,
    message: `${payload.length} byte facility configuration fragment`,
  });
  return {
    compiler_id: FACILITY_CONFIG_COMPILER_ID,
    compiled_asset_ids: [binding.asset_id],
    changed_asset_ids: changed ? [binding.asset_id] : [],
    bundles: [bundle],
  };
}

function resolvedRelocationPayload(context, fragment) {
  try {
    return resolveFragmentPayload({payload: fragment.payload, relocations: fragment.relocations,
      slots: context.slots});
  } catch (error) {
    if (!(error instanceof LinkerError)) throw error;
    throw new AssetCompilerContractError(`${fragment.fragment_id}: ${error.message}`);
  }
}

/** Exact browser port of Python compile_story_sequence_assets(). */
async function compileStorySequenceAssets(context, bindings, {
  onProgress = null,
} = {}) {
  if (bindings.some(binding => binding.compiler_id !== STORY_COMPILER_ID)) {
    throw new AssetCompilerContractError(
      "story-sequences/v1 received another compiler's binding",
    );
  }
  const selectedIds = bindings.map(binding => binding.asset_id).sort();
  if (stableJson(selectedIds) !== stableJson([...STORY_RESOURCE_IDS].sort())) {
    throw new AssetCompilerContractError(
      "story-sequences/v1 requires its complete three-resource binding set",
    );
  }
  if (!context.repository?.getManifest) {
    throw new AssetCompilerError(
      "story-sequences/v1 requires the field repository manifest",
    );
  }
  const database = context.fieldDb || db;
  const manifest = await context.repository.getManifest();
  const bundles = [];
  const changedIds = new Set();
  const omittedScripts = [];
  for (const binding of bindings) {
    const input = storySequencesInput(binding);
    const componentSources = new Map();
    for (const component of input.components) {
      const selected = binding.sources.filter(source =>
        component.asset_offset <= source.asset_offset &&
        source.asset_offset < component.asset_offset + component.length);
      if (selected.length !== 1) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Story component must map to exactly one slot`,
        );
      }
      const source = selected[0];
      if (source.asset_offset !== component.asset_offset ||
          source.offset_in_slot !== 0 ||
          source.length !== component.length ||
          source.slot.capacity !== component.length ||
          source.slot.runtime_address !== component.runtime_address) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Story source does not match its target slot`,
        );
      }
      componentSources.set(component.fragment_id, source);
    }

    const owner = fieldOwner(input.resource_id);
    if (owner.compilerId !== STORY_COMPILER_ID) {
      throw new AssetCompilerContractError("剧情字段 owner 与 compiler 不一致");
    }
    const snapshot = await database.readBuildFields(input.resource_id, context.repository,
      manifest.active_original_revision_id);
    for (const field of snapshot.fields) {
      const physical = field.physical;
      if (!physical && !writableFieldWithoutBinding(field)) continue;
      const component = input.components.find(item => item.fragment_id === physical?.component.fragment_id);
      const source = componentSources.get(component?.fragment_id);
      if (!physical || physical.targetId !== context.targetProfileId || !component || !source
          || stableJson(component) !== stableJson(physical.component)
          || source.file_offset !== physical.source.file_offset
          || source.asset_offset !== physical.source.asset_offset
          || source.offset_in_slot !== physical.source.offset_in_slot
          || source.length !== physical.source.length || source.slot_id !== physical.source.slot_id) {
        throw new AssetCompilerContractError("剧情字段物理引用与构建 binding 不一致");
      }
    }
    const resolved = await database.readResource(input.resource_id);
    const asset = resolved?.value;
    if (!asset || asset.resource_id !== input.resource_id) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: effective Story identity/schema mismatch`,
      );
    }
    const encoded = owner.encode(snapshot.fields);
    for (const component of encoded) for (const script of component.omitted_scripts || []) {
      omittedScripts.push(script);
      if (onProgress) await onProgress({stage: "compile", event_type: "story-script-omitted",
        status: "skipped-capacity", asset_id: input.resource_id, ...script,
        message: `${script.handle} 未进 ROM（${script.reason}），超出 ${script.overflow_bytes} 字节`});
    }
    const defaults = new Map(owner.encode(snapshot.fields, {defaults: true})
      .map(component => [component.fragment_id, component]));
    const expectedIds = storyComponentIds(input.resource_id).sort();
    const encodedIds = encoded.map(component => component.fragment_id).sort();
    if (stableJson(expectedIds) !== stableJson(encodedIds)) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: Story encoder component set drifted`,
      );
    }

    const componentRelocations = component => component.relocations.map(relocation => {
      const target = componentSources.get(relocation.target_fragment_id);
      if (!target) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Story relocation target is unbound`,
        );
      }
      return {
        type: "le16-pointer",
        offset: relocation.offset,
        target_slot_id: target.slot_id,
        target_offset: relocation.target_offset,
        addend: relocation.addend,
      };
    });
    const fragmentFor = (component, payload, relocations) => ({
      asset_id: input.resource_id,
      fragment_id: component.fragment_id,
      slot_id: componentSources.get(component.fragment_id).slot_id,
      payload,
      codec: STORY_COMPONENT_CODEC,
      codec_version: STORY_COMPONENT_CODEC_VERSION,
      alignment: 1,
      relocations,
    });

    // Origin 原像校验（只读）：每个组件的 defaults（含重定位渲染）必须与基线逐字节一致。
    // 逐字段路径与整组件路径共用这一条断言。
    for (const component of encoded) {
      const source = componentSources.get(component.fragment_id);
      if (!(component.payload instanceof Uint8Array) || component.payload.length > source.length) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: encoded Story payload exceeds its component`,
        );
      }
      const defaultComponent = defaults.get(component.fragment_id);
      if (!defaultComponent || !(defaultComponent.payload instanceof Uint8Array)) {
        throw new AssetCompilerContractError("剧情字段默认组件缺失");
      }
      const original = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
      const before = resolvedRelocationPayload(context, fragmentFor(component, defaultComponent.payload,
        componentRelocations(defaultComponent)));
      const declaration = input.components.find(item => item.fragment_id === component.fragment_id);
      if (before.length !== original.length || before.some((value, index) => value !== original[index])
          || await sha256Hex(original) !== declaration.original_sha256) {
        throw new AssetCompilerContractError("剧情字段 Original 与绑定原像不一致");
      }
    }

    const fragments = [];
    let changed = false;
    const nativePages = encoded.find(component => Object.hasOwn(component, "remote_pages"))?.remote_pages;
    const pagePrograms = await context.repository.getStoryPageRomPrograms?.(input.resource_id) || [];
    const remotePages = nativePages === undefined ? undefined : [...nativePages, ...pagePrograms];
    if (pagePrograms.length && nativePages === undefined) throw new AssetCompilerContractError('新剧情页缺少远跳写入许可');
    if (remotePages && new Set(remotePages.map(page => page.script_id)).size !== remotePages.length)
      throw new AssetCompilerContractError('新剧情页与现有剧情的入口 Working 冲突');
    if (remotePages) {
      if (!context.buildMap.story_farjump || input.components.length !== 2 + farjumpComponentIds(input.resource_id).length)
        throw new AssetCompilerContractError("远跳字段缺少完整目标绑定");
      const state = await storyFarjumpState(context);
      if (pagePrograms.length && !state.permitted) throw new AssetCompilerContractError('新剧情页缺少剧情读取器写入许可');
      for (const declaration of input.components.slice(2)) {
        const source = componentSources.get(declaration.fragment_id);
        if (source.slot.owner !== input.resource_id
            || await sha256Hex(context.baseline.subarray(source.file_offset, source.file_offset + source.length)) !== declaration.original_sha256)
          throw new AssetCompilerContractError("远跳目录或页原像改变");
      }
      if (!state.permitted) for (const page of remotePages) {
        const script = {script_id: page.script_id,
          handle: `${input.resource_id}:script:${page.script_id.toString(16).toUpperCase().padStart(2, "0")}`,
          reason: "缺写入许可", overflow_bytes: 0};
        omittedScripts.push(script);
        if (onProgress) await onProgress({stage: "compile", event_type: "story-script-omitted",
          status: "skipped-unpermitted", asset_id: input.resource_id, ...script,
          message: `${script.handle} 未进 ROM（${script.reason}）`});
      }
      else for (const page of remotePages) {
        const [directoryId, pageId] = farjumpFragmentIds(input.resource_id, page.script_id);
        const directory = componentSources.get(directoryId), targetPage = componentSources.get(pageId);
        const add = async (id, source, payload, extra = {}) => fragments.push({asset_id: input.resource_id,
          fragment_id: id, slot_id: source.slot_id, payload, payload_sha256: await sha256Hex(payload),
          codec: STORY_COMPONENT_CODEC, codec_version: STORY_COMPONENT_CODEC_VERSION,
          alignment: 1, relocations: [], ...extra});
        const pointerSource = componentSources.get(storyComponentIds(input.resource_id)[0]);
        if (farjumpOriginalEntryIds(input.resource_id).includes(page.script_id))
          await add(`${input.resource_id}.pointer.${page.script_id.toString(16).padStart(2, "0")}`, pointerSource,
          new Uint8Array(2), {offset_in_slot: (page.script_id - asset.first_valid_id) * 2,
            relocations: [{type: "le16-pointer", offset: 0, target_slot_id: directory.slot_id, target_offset: 0, addend: 0}]});
        await add(directoryId, directory, Uint8Array.from([0xFF, targetPage.slot.bank_index, 0,
          targetPage.slot.runtime_address >> 8]));
        await add(pageId, targetPage, page.payload, {instruction_boundaries: page.instruction_boundaries});
      }
      changed = fragments.length > 0;
      await state.assertCurrent();
    } else if (perFieldObjectIds([binding]).has(input.resource_id)) {
      // 字段序列化只给字段自身的字节：带内部重定位的资源退回整组件写回。
      if (encoded.some(component => componentRelocations(component).length)) {
        throw new AssetCompilerContractError(`${input.resource_id}: 逐字段写回的剧情资源不得带内部重定位`);
      }
      const working = await workingFieldFragments({database, resourceId: input.resource_id, componentSources,
        baseline: context.baseline, codec: STORY_COMPONENT_CODEC,
        codecVersion: STORY_COMPONENT_CODEC_VERSION,
        workingResourceIds: await workingFieldResourceIds(context.repository)});
      fragments.push(...working.fragments);
      changed = working.changed;
    } else for (const component of encoded) {
      const source = componentSources.get(component.fragment_id);
      const original = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
      const fragment = {...fragmentFor(component, component.payload, componentRelocations(component)),
        payload_sha256: await sha256Hex(component.payload)};
      const rendered = resolvedRelocationPayload(context, fragment);
      if (!changed && rendered.some((value, index) => value !== original[index])) {
        changed = true;
      }
      fragments.push(fragment);
    }
    const inputSha256 = await storyAssetInputSha256(asset);
    await snapshot.assertCurrent();
    bundles.push({
      schema: BUNDLE_SCHEMA,
      asset_id: input.resource_id,
      encoder: STORY_ENCODER,
      encoder_version: STORY_ENCODER_VERSION,
      input_sha256: inputSha256,
      fragments,
    });
    if (changed) changedIds.add(input.resource_id);
    if (onProgress) await onProgress({
      stage: "compile",
      event_type: "asset-compiled",
      status: changed ? "success" : "skipped-clean",
      asset_id: input.resource_id,
      encoder: STORY_COMPILER_ID,
      input_sha256: inputSha256,
      message: `${fragments.length} Story fragment(s)`,
    });
  }
  return {
    compiler_id: STORY_COMPILER_ID,
    compiled_asset_ids: selectedIds,
    changed_asset_ids: [...changedIds].sort(),
    bundles,
    omitted_scripts: omittedScripts,
  };
}

async function compileParameterTableAssets(context, bindings, {onProgress = null} = {}) {
  const compilerId = bindings[0]?.compiler_id;
  const codec = parameterTableCodec(compilerId);
  const bundles = [];
  const changedIds = [];
  if (!context.repository?.getOriginal || !context.repository?.resolve) {
    throw new AssetCompilerContractError("parameter-table requires Original and effective repository values");
  }
  for (const binding of bindings) {
    if (binding.compiler_id !== compilerId) {
      throw new AssetCompilerContractError("parameter-table received another compiler's binding");
    }
    const input = parameterTableInput(binding);
    let encoded, baselineEncoded, inputValue, fieldRead, objects;
    if (hasFieldOwner(input.resource_id)) {
      const owner = fieldOwner(input.resource_id);
      if (owner.compilerId !== compilerId) throw new AssetCompilerContractError("字段 owner 与 compiler 不一致");
      const manifest = await context.repository.getManifest();
      fieldRead = await (context.fieldDb || db).readBuildFields(input.resource_id,
        context.repository, manifest.active_original_revision_id);
      for (const field of fieldRead.fields) {
        const physical = field.physical;
        if (owner.objects && owner.serializeField && (!physical || field.writeback?.state === "unpermitted")) continue;
        const component = input.components.find(c => c.fragment_id === physical?.component.fragment_id);
        const source = binding.sources.find(s => s.slot_id === physical?.source.slot_id);
        if (!physical || physical.targetId !== context.targetProfileId || !component || !source
            || stableJson(component) !== stableJson(physical.component)
            || source.file_offset !== physical.source.file_offset
            || source.asset_offset !== physical.source.asset_offset
            || source.offset_in_slot !== physical.source.offset_in_slot
            || source.length !== physical.source.length) {
          throw new AssetCompilerContractError(
            `字段物理引用与构建 binding 不一致：${input.resource_id}/${field.entityHandle}/${field.fieldName}`,
          );
        }
      }
      if (owner.objects && owner.serializeField) {
        objects = await (context.fieldDb || db).getFieldObjects(input.resource_id);
      } else {
        encoded = owner.encode(fieldRead.fields);
        baselineEncoded = owner.encode(fieldRead.fields, {defaults: true});
      }
      inputValue = fieldRead.fields.map(field => [field.entityHandle, field.fieldName, field.value]);
    } else {
      if (codec.fieldOwnerOnly) throw new AssetCompilerContractError("编译器要求已登记的字段 owner");
      const resolved = await context.repository.resolve(input.resource_id);
      if (typeof resolved?.revision_id !== "string" || !resolved.revision_id) {
        throw new AssetCompilerContractError("parameter-table effective revision is missing");
      }
      const original = await context.repository.getOriginal(input.resource_id,
        {revisionId: resolved.revision_id});
      if (!original || original.revision_id !== resolved.revision_id) {
        throw new AssetCompilerContractError("parameter-table Original revision mismatch");
      }
      encoded = codec.encode(resolved.value, original.value);
      baselineEncoded = codec.encode(original.value, original.value);
      inputValue = resolved.value;
    }
    if (binding.sources.length !== input.components.length) {
      throw new AssetCompilerContractError("parameter-table must bind each component exactly once");
    }
    const componentSources = new Map();
    for (let index = 0; index < input.components.length; index += 1) {
      const component = input.components[index];
      const sources = binding.sources.filter(source => source.asset_offset === component.asset_offset);
      const source = sources[0];
      const slot = source && context.slots.get(source.slot_id);
      if (sources.length !== 1 || source.offset_in_slot !== 0 ||
          source.length !== component.length || slot?.capacity !== component.length ||
          slot.owner !== input.resource_id || slot.file_offset !== source.file_offset) {
        throw new AssetCompilerContractError("parameter-table component escapes its exact owner slot");
      }
      const baseline = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
      if (baseline.length !== component.length ||
          await sha256Hex(baseline) !== component.original_sha256 ||
          (!objects && baselineEncoded[index].payload.some((byte, offset) => byte !== baseline[offset]))) {
        throw new AssetCompilerContractError("parameter-table Original differs from bound baseline");
      }
      // 整资源原像扫描（既有断言，保留）：每个对象对每个组件核对 defaults。
      if (objects) for (const object of objects) object.validatePreimage(component.fragment_id, baseline);
      componentSources.set(component.fragment_id, source);
    }
    const fragments = [];
    let changed = false;
    if (objects) {
      // 只发被编辑且有许可的字段片段：一个字段一个片段，非相邻字节按字节各落一片段（共用件）。
      const working = await workingFieldFragments({database: context.fieldDb || db,
        resourceId: input.resource_id, componentSources, baseline: context.baseline,
        codec: codec.componentCodec, codecVersion: "1",
        workingResourceIds: await workingFieldResourceIds(context.repository)});
      fragments.push(...working.fragments);
      changed = working.changed;
    } else for (let index = 0; index < input.components.length; index += 1) {
      const component = input.components[index];
      const source = componentSources.get(component.fragment_id);
      const baseline = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
      const payload = encoded[index].payload;
      changed ||= payload.some((byte, offset) => byte !== baseline[offset]);
      fragments.push({asset_id: input.resource_id, fragment_id: component.fragment_id,
        slot_id: source.slot_id, payload, payload_sha256: await sha256Hex(payload),
        codec: codec.componentCodec, codec_version: "1", alignment: 1, relocations: []});
    }
    const inputSha256 = await sha256Hex(new TextEncoder().encode(stableJson(inputValue)));
    if (fieldRead) await fieldRead.assertCurrent();
    bundles.push({schema: BUNDLE_SCHEMA, asset_id: input.resource_id,
      encoder: compilerId, encoder_version: "1", input_sha256: inputSha256, fragments});
    if (changed) changedIds.push(input.resource_id);
    if (onProgress) await onProgress({stage: "compile", event_type: "asset-compiled",
      status: changed ? "success" : "skipped-clean", asset_id: input.resource_id,
      encoder: compilerId, input_sha256: inputSha256,
      message: `${fragments.length} parameter-table ROM fragment(s)`});
  }
  return {compiler_id: compilerId,
    compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(),
    changed_asset_ids: changedIds.sort(), bundles};
}

/** Exact browser port of Python compile_visual_asset_value(). */
async function compileVisualAssets(context, bindings, {
  onProgress = null,
} = {}) {
  if (bindings.some(binding => binding.compiler_id !== VISUAL_COMPILER_ID)) {
    throw new AssetCompilerContractError(
      "visual-core/v1 received another compiler's binding",
    );
  }
  if (!context.repository || typeof context.repository.resolve !== "function") {
    throw new AssetCompilerError(
      "visual-core/v1 requires repository.resolve(resourceId)",
    );
  }
  const bundles = [];
  const changedIds = new Set();
  const workingResourceIds = await workingFieldResourceIds(context.repository);
  for (const binding of bindings) {
    const input = visualInput(binding);
    const componentSources = new Map();
    const referenceTargets = new Map();
    for (const reference of input.references) {
      const target = context.slots.get(reference.slot_id);
      const targetOwnerMatches = target?.owner === reference.resource_id || (
        input.resource_id === "battle-action" &&
        /^battle-object-layout:[0-9A-F]{3}$/.test(reference.resource_id) &&
        target?.owner === "battle-object-layout"
      );
      if (!target || !targetOwnerMatches ||
          target.runtime_address === null ||
          !Number.isSafeInteger(target.runtime_address) ||
          target.alias_of !== null || target.mirror_of !== null) {
        throw new AssetCompilerContractError(
          `${reference.resource_id}: Visual reference does not match its target slot`,
        );
      }
      referenceTargets.set(reference.resource_id, target);
    }
    for (const component of input.components) {
      const selected = binding.sources.filter(source =>
        component.asset_offset <= source.asset_offset &&
        source.asset_offset < component.asset_offset + component.length);
      if (selected.length !== 1) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Visual component must map to exactly one slot`,
        );
      }
      const source = selected[0];
      if (source.asset_offset !== component.asset_offset ||
          source.offset_in_slot !== 0 ||
          source.length !== component.length ||
          source.slot.capacity !== component.length) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Visual source does not match its exact slot`,
        );
      }
      context.baseline.subarray(
        source.file_offset,
        source.file_offset + source.length,
      );
      componentSources.set(component.fragment_id, source);
    }

    const owner = hasFieldOwner(input.resource_id) ? fieldOwner(input.resource_id) : null;
    const database = context.fieldDb || db;
    const ownerIds = fieldOwnerIds.filter(id => id === input.resource_id
      || fieldOwner(id).bindingResourceId === input.resource_id);
    const snapshots = await Promise.all(ownerIds.map(async id => ({id, owner: fieldOwner(id),
      ...await database.readBuildFields(id, context.repository,
        (await context.repository.getManifest()).active_original_revision_id)})));
    const resolved = await database.readResource(input.resource_id);
    const asset = resolved?.value;
    if (!asset || asset.resource_id !== input.resource_id) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: effective Visual identity/schema mismatch`,
      );
    }
    if (input.resource_id === "battle-action") {
      for (const record of asset.document?.records || []) {
        if (record?.available !== true) continue;
        const target = referenceTargets.get(record.layout_reference);
        const columns = Number(record.columns);
        const rows = Number(record.rows);
        if (!target || !Number.isInteger(columns) || !Number.isInteger(rows)
            || 1 + columns * rows !== target.capacity) {
          throw new AssetCompilerContractError(
            `${record?.handle || "battle-action"}: config shape escapes its layout slot`,
          );
        }
      }
    }
    for (const snapshot of snapshots) for (const field of snapshot.fields) {
      const physical = field.physical;
      if (!physical && !writableFieldWithoutBinding(field)) continue;
      const component = input.components.find(row => row.fragment_id === physical?.component.fragment_id);
      const source = componentSources.get(component?.fragment_id);
      if (!physical || physical.targetId !== context.targetProfileId || !component || !source
          || stableJson(physical.component) !== stableJson(component)
          || ["file_offset", "slot_id", "offset_in_slot", "asset_offset", "length"]
            .some(key => physical.source[key] !== source[key]))
        throw new AssetCompilerContractError(`${input.resource_id}: field physical binding changed`);
    }
    // Origin 原像校验（只读）：每个组件的 defaults 必须与基线逐字节一致。整组件路径与逐字段
    // 路径共用这一条断言；逐字段路径因此不依赖 owner.validatePreimage。
    for (const snapshot of snapshots) {
      for (const component of snapshot.owner.encode(snapshot.fields, {defaults: true})) {
        const source = componentSources.get(component.fragment_id);
        const expected = input.components.find(row => row.fragment_id === component.fragment_id);
        const baseline = context.baseline.subarray(source.file_offset, source.file_offset + source.length);
        const relocations = component.relocations.map(relocation => {
          const target = referenceTargets.get(relocation.target_resource_id);
          integer(relocation.offset, `${component.fragment_id}.default-relocation.offset`);
          if (!target || relocation.offset + 2 > component.payload.length)
            throw new AssetCompilerContractError(`${component.fragment_id}: default relocation is unbound or out of range`);
          return {type: "le16-pointer", offset: relocation.offset,
            target_slot_id: target.slot_id, target_offset: 0, addend: 0};
        });
        const renderedDefault = resolvedRelocationPayload(context, {...component, relocations});
        if (renderedDefault.length !== baseline.length
            || !renderedDefault.every((value, index) => value === baseline[index])
            || await sha256Hex(renderedDefault) !== expected.original_sha256)
          throw new AssetCompilerContractError(`${component.fragment_id}: field defaults differ from ROM preimage`);
      }
    }
    if (perFieldObjectIds([binding]).has(input.resource_id)) {
      // 逐字段写回：只发被编辑且有写入许可的字段片段，未编辑的字节留在基线（合同 3.3）。
      const fragments = [];
      const expectedCoverage = [];
      let changed = false;
      for (const snapshot of snapshots) {
        const working = await workingFieldFragments({database, resourceId: snapshot.id, assetId: input.resource_id, componentSources,
          baseline: context.baseline, codec: VISUAL_COMPONENT_CODEC,
          codecVersion: VISUAL_COMPONENT_CODEC_VERSION, workingResourceIds, referenceTargets, expectedCoverage});
        fragments.push(...working.fragments);
        changed = changed || working.changed;
      }
      (context.workingFieldCoverage ||= new Map()).set(input.resource_id, expectedCoverage);
      fragments.sort((left, right) => compareText(left.fragment_id, right.fragment_id));
      const inputSha256 = await visualAssetInputSha256(asset);
      for (const snapshot of snapshots) await snapshot.assertCurrent();
      bundles.push({
        schema: BUNDLE_SCHEMA,
        asset_id: input.resource_id,
        encoder: VISUAL_ENCODER,
        encoder_version: VISUAL_ENCODER_VERSION,
        input_sha256: inputSha256,
        fragments,
      });
      if (changed) changedIds.add(input.resource_id);
      if (onProgress) await onProgress({
        stage: "compile",
        event_type: "asset-compiled",
        status: changed ? "success" : "skipped-clean",
        asset_id: input.resource_id,
        encoder: VISUAL_COMPILER_ID,
        input_sha256: inputSha256,
        message: `${fragments.length} Visual field fragment(s)`,
      });
      continue;
    }
    const fieldFragments = new Map();
    for (const snapshot of snapshots) {
      const fragments = snapshot.owner.encode(snapshot.fields);
      if (snapshot.owner.fragmentIds && stableJson(fragments.map(row => row.fragment_id).sort())
          !== stableJson([...snapshot.owner.fragmentIds].sort()))
        throw new AssetCompilerContractError(`${snapshot.id}: field fragment set drifted`);
      for (const component of fragments) {
        if (!componentSources.has(component.fragment_id) || fieldFragments.has(component.fragment_id))
          throw new AssetCompilerContractError(`${snapshot.id}: field fragment is unbound or duplicated`);
        fieldFragments.set(component.fragment_id, component);
      }
    }
    if (!owner || owner.aggregate) {
      throw new AssetCompilerContractError(`${input.resource_id}: Visual requires complete field owners`);
    }
    const encoded = [...fieldFragments.values()];
    const encodedById = new Map(encoded.map(component =>
      [component.fragment_id, component]));
    if (encodedById.size !== input.components.length) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: Visual encoder component set drifted`,
      );
    }

    const fragments = [];
    const consumedReferences = new Set();
    let changed = false;
    for (const component of input.components) {
      const source = componentSources.get(component.fragment_id);
      const encodedComponent = encodedById.get(component.fragment_id);
      const payload = encodedComponent?.payload;
      if (!(payload instanceof Uint8Array) ||
          payload.length !== component.length) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Visual encoder returned an invalid payload`,
        );
      }
      const logicalRelocations = encodedComponent.relocations;
      if (!Array.isArray(logicalRelocations)) {
        throw new AssetCompilerContractError(
          `${component.fragment_id}: Visual relocations must be an array`,
        );
      }
      const relocations = logicalRelocations.map(relocation => {
        const target = referenceTargets.get(relocation.target_resource_id);
        if (!target) {
          throw new AssetCompilerContractError(
            `${component.fragment_id}: Visual relocation target is unbound`,
          );
        }
        integer(relocation.offset, `${component.fragment_id}.relocation.offset`);
        if (relocation.offset + 2 > payload.length) {
          throw new AssetCompilerContractError(
            `${component.fragment_id}: Visual relocation escapes its fragment`,
          );
        }
        consumedReferences.add(relocation.target_resource_id);
        return {
          type: "le16-pointer",
          offset: relocation.offset,
          target_slot_id: target.slot_id,
          target_offset: 0,
          addend: 0,
        };
      });
      const fragment = {
        asset_id: input.resource_id,
        fragment_id: component.fragment_id,
        slot_id: source.slot_id,
        payload,
        payload_sha256: await sha256Hex(payload),
        codec: VISUAL_COMPONENT_CODEC,
        codec_version: VISUAL_COMPONENT_CODEC_VERSION,
        alignment: 1,
        relocations,
      };
      const rendered = resolvedRelocationPayload(context, fragment);
      const original = context.baseline.subarray(
        source.file_offset,
        source.file_offset + source.length,
      );
      if (!changed && rendered.some((value, index) => value !== original[index])) {
        changed = true;
      }
      fragments.push(fragment);
    }
    if (stableJson([...consumedReferences].sort()) !==
        stableJson([...referenceTargets.keys()].sort())) {
      throw new AssetCompilerContractError(
        `${input.resource_id}: Visual reference binding set drifted`,
      );
    }
    fragments.sort((left, right) =>
      compareText(left.fragment_id, right.fragment_id));
    const inputSha256 = await visualAssetInputSha256(asset);
    for (const snapshot of snapshots) await snapshot.assertCurrent();
    bundles.push({
      schema: BUNDLE_SCHEMA,
      asset_id: input.resource_id,
      encoder: VISUAL_ENCODER,
      encoder_version: VISUAL_ENCODER_VERSION,
      input_sha256: inputSha256,
      fragments,
    });
    if (changed) changedIds.add(input.resource_id);
    if (onProgress) await onProgress({
      stage: "compile",
      event_type: "asset-compiled",
      status: changed ? "success" : "skipped-clean",
      asset_id: input.resource_id,
      encoder: VISUAL_COMPILER_ID,
      input_sha256: inputSha256,
      message: `${fragments.length} Visual fragment(s)`,
    });
  }
  return {
    compiler_id: VISUAL_COMPILER_ID,
    compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(),
    changed_asset_ids: [...changedIds].sort(),
    bundles,
  };
}

/** Exact browser port of Python compile_scene_config_assets(). */
async function compileSceneConfigAssets(context, bindings, {
  onProgress = null,
} = {}) {
  if (bindings.length !== 1 ||
      bindings[0].compiler_id !== SCENE_COMPILER_ID) {
    throw new AssetCompilerContractError(
      "scene-config/v1 requires exactly one scene.config binding",
    );
  }
  if (!context.repository ||
      typeof context.repository.resolve !== "function" ||
      typeof context.repository.getBlob !== "function") {
    throw new AssetCompilerError(
      "scene-config/v1 requires repository.resolve() and getBlob()",
    );
  }
  const binding = bindings[0];
  const input = sceneConfigInput(binding);
  const interaction = await sceneInteractionBuildState(context);
  const slices = [];
  const componentPreimages = new Map();
  const descriptorsById = new Map(input.components.map(item => [item.component_id, item]));
  const sourcesById = new Map();
  const orderedSources = binding.sources.slice().sort((left, right) => left.asset_offset - right.asset_offset);
  const workingIds = await workingFieldResourceIds(context.repository);
  const manifest = await context.repository.getManifest();

  const appendSlices = async descriptor => {
    const start = descriptor.asset_offset;
    const end = start + descriptor.length;
    let low = 0, high = orderedSources.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (orderedSources[middle].asset_offset < start) low = middle + 1;
      else high = middle;
    }
    const selected = [];
    for (let index = low; index < orderedSources.length && orderedSources[index].asset_offset < end; index++) {
      selected.push(orderedSources[index]);
    }
    sourcesById.set(descriptor.component_id, selected);
    const original = new Uint8Array(descriptor.length);
    let cursor = 0;
    for (const source of selected) {
      const componentOffset = source.asset_offset - start;
      if (componentOffset !== cursor || source.asset_offset + source.length > end) {
        throw new AssetCompilerContractError(
          `${descriptor.component_id}: Scene source has a gap/overlap`,
        );
      }
      original.set(context.baseline.subarray(
        source.file_offset,
        source.file_offset + source.length,
      ), cursor);
      slices.push({
        component_id: descriptor.component_id,
        component_offset: componentOffset,
        slot_id: source.slot_id,
        slot_offset: source.offset_in_slot,
        length: source.length,
      });
      cursor += source.length;
    }
    if (cursor !== descriptor.length) {
      throw new AssetCompilerContractError(
        `${descriptor.component_id}: Scene source is incomplete`,
      );
    }
    componentPreimages.set(descriptor.component_id, original);
  };

  for (const descriptor of input.components) await appendSlices(descriptor);
  for (const descriptor of input.external_assets) await appendSlices(descriptor);

  const resourceIds = [...new Set(input.components.map(item => item.resource_id))]
    .sort();
  // 未编辑片段保留基线原像；只读取有 Working 的字段对象。
  const fieldComponents = new Map(input.components.map(descriptor => [descriptor.component_id, {
    component_id: descriptor.component_id, resource_id: descriptor.resource_id,
    payload: componentPreimages.get(descriptor.component_id),
  }]));
  const snapshots = [];
  const workingMapIds = new Set();
  for (const resourceId of resourceIds) {
    const owner = hasFieldOwner(resourceId) ? fieldOwner(resourceId) : null;
    if (!owner) throw new AssetCompilerContractError(`${resourceId}: Scene 构建要求已登记的字段 owner`);
    if (owner) {
      const database = context.fieldDb || (await import('./prg-loaders-DnCSmXk9.js').then(function (n) { return n.projectDb; })).db;
      if (owner.compilerId !== SCENE_COMPILER_ID
          || (owner.physicalWriteback !== false && owner.bindingResourceId !== binding.asset_id))
        throw new AssetCompilerContractError(`${resourceId}: Scene field compiler/binding mismatch`);
      if (owner.physicalWriteback === false) throw new AssetCompilerContractError(`${resourceId}: Scene 字段 owner 尚未接通物理写回`);
      if (workingIds && !workingIds.has(resourceId)) continue;
      const snapshot = await database.readBuildFields(resourceId, context.repository, manifest.active_original_revision_id);
      for (const field of snapshot.fields) {
        const physical = field.physical;
        if (!physical && !writableFieldWithoutBinding(field)) continue;
        const componentId = physical?.component.component_id;
        const descriptor = descriptorsById.get(componentId);
        const expectedSources = sourcesById.get(componentId) || [];
        const locations = physical?.locations || (physical ? [physical] : []);
        if (!descriptor || descriptor.resource_id !== resourceId || physical.binding.asset_id !== binding.asset_id
          || physical.targetId !== context.targetProfileId || physical.component.length !== descriptor.length
          || locations.length !== expectedSources.length
          || locations.some((location, index) => ["slot_id", "file_offset", "length", "asset_offset", "offset_in_slot"]
            .some(key => location.source[key] !== expectedSources[index]?.[key])))
          throw new AssetCompilerContractError(`${resourceId}: Scene field physical binding changed`);
      }
      const fragmentIds = new Set(snapshot.fields.filter(field =>
        field.hasOverride && field.physical && field.writeback?.state !== "unpermitted")
        .map(field => field.physical.component.component_id));
      if (resourceId === 'scene-actor' && snapshot.fields.some(field => field.fieldName === 'interaction_binding'
        && field.hasOverride && field.interactionKey && field.writeback?.state !== 'unpermitted'))
        fragmentIds.add('scene.actor.record-region');
      for (const field of snapshot.fields) {
        if (field.mapCodec && field.hasOverride && field.physical
            && field.writeback?.state !== "unpermitted")
          workingMapIds.add(field.physical.component.component_id);
      }
      // 同一片段的全部字段参与序列化。
      for (const component of owner.encode(snapshot.fields, {defaults: true, fragmentIds})) {
        const original = componentPreimages.get(component.fragment_id);
        if (!original || original.length !== component.payload.length
            || !original.every((value, index) => value === component.payload[index]))
          throw new AssetCompilerContractError(`${resourceId}: Scene field defaults differ from ROM preimage`);
      }
      const encodedFragments = new Set();
      for (const component of owner.encode(snapshot.fields, {fragmentIds, bindingTargets: interaction.targets})) {
        if (!fragmentIds.has(component.fragment_id)) continue;
        if (encodedFragments.has(component.fragment_id)) {
          throw new AssetCompilerContractError(`${resourceId}: duplicate Scene Working component`);
        }
        encodedFragments.add(component.fragment_id);
        fieldComponents.set(component.fragment_id, {component_id: component.fragment_id,
          resource_id: resourceId, payload: component.payload});
      }
      if ([...fragmentIds].some(id => !encodedFragments.has(id))) {
        throw new AssetCompilerContractError(`${resourceId}: Scene Working component set drifted`);
      }
      snapshots.push(snapshot);
      continue;
    }
  }
  const semanticComponents = await collectSceneComponentFields(
    fieldComponents.values(),
    input.components,
  );
  const encodedById = new Map(semanticComponents.map(item =>
    [item.component_id, item]));
  if (encodedById.size !== input.components.length) {
    throw new AssetCompilerContractError(
      "scene-config/v1 semantic component set drifted",
    );
  }
  for (const descriptor of input.components) {
    const item = encodedById.get(descriptor.component_id);
    if (!item || item.resource_id !== descriptor.resource_id ||
        (item.payload.length !== descriptor.length && !workingMapIds.has(descriptor.component_id))) {
      throw new AssetCompilerContractError(
        `${descriptor.component_id}: Scene component identity/length drifted`,
      );
    }
  }

  const externalComponents = [];
  for (const descriptor of input.external_assets) {
    const blobId = bindingAssetBlobId(
      context.targetProfileId,
      descriptor.asset_id,
    );
    const record = await context.repository.getBlob(blobId);
    if (!record?.data || typeof record.data.arrayBuffer !== "function") {
      throw new AssetCompilerError(
        `${descriptor.asset_id}: browser project is missing ${blobId}`,
      );
    }
    const payload = new Uint8Array(await record.data.arrayBuffer());
    if (payload.length !== descriptor.length) {
      throw new AssetCompilerContractError(
        `${descriptor.asset_id}: Scene external length changed`,
      );
    }
    const payloadSha256 = await sha256Hex(payload);
    externalComponents.push({
      component_id: descriptor.component_id,
      resource_id: descriptor.asset_id,
      payload,
      payload_sha256: payloadSha256,
      original_sha256: descriptor.original_sha256,
      changed: payloadSha256 !== descriptor.original_sha256,
    });
  }

  const slotPreimages = new Map();
  for (const slice of slices) {
    if (slotPreimages.has(slice.slot_id)) continue;
    const slot = context.slots.get(slice.slot_id);
    if (!slot) {
      throw new AssetCompilerContractError(
        `${slice.component_id}: Scene slice targets an unknown slot`,
      );
    }
    slotPreimages.set(slice.slot_id, context.baseline.slice(
      slot.file_offset,
      slot.file_offset + slot.capacity,
    ));
  }
  const components = [...semanticComponents, ...externalComponents]
    .sort((left, right) => left.component_id.localeCompare(right.component_id));
  const remoteMaps = components.filter(item => workingMapIds.has(item.component_id));
  const remoteIds = new Set(remoteMaps.map(item => item.component_id));
  const localComponents = components.map(item => remoteIds.has(item.component_id)
    ? {...item, payload: componentPreimages.get(item.component_id), changed: false, payload_sha256: item.original_sha256} : item);
  const bundle = await compileSceneAssetFields({components: localComponents, slices, slotPreimages});
  context.expandedSceneMaps = remoteMaps;
  if (remoteMaps.length) {
    if (!context.buildMap.scene_map_expansion) throw new AssetCompilerContractError('场景地图缺扩展绑定');
    bundle.fragments.push(...await planExpandedSceneMaps(remoteMaps, context.buildMap.scene_map_expansion, context.slots));
  }
  for (const snapshot of snapshots) await snapshot.assertCurrent();
  await interaction.assertCurrent();
  if (bundle.asset_id !== binding.asset_id) {
    throw new AssetCompilerContractError(
      "scene-config/v1 emitted an invalid bundle identity",
    );
  }
  const changed = remoteMaps.length > 0 || components.some(item => item.changed);
  const mapBudget = remoteMaps.length ? sceneMapExpansionBudget(context.buildMap.scene_map_expansion, context.slots) : null;
  if (onProgress) await onProgress({
    stage: "compile",
    event_type: "asset-compiled",
    status: changed ? "success" : "skipped-clean",
    asset_id: binding.asset_id,
    encoder: SCENE_COMPILER_ID,
    input_sha256: bundle.input_sha256,
    message: `${components.length} Scene components into ` +
      `${bundle.fragments.length} complete slot fragments` + (mapBudget
        ? `；${remoteMaps.length} 张地图写入扩展区 ${remoteMaps.reduce((sum, item) => sum + item.payload.length, 0)}/${mapBudget.capacity} 字节；全部 ${mapBudget.mapCount} 张地图按原分配估算 ${mapBudget.estimatedBytes} 字节`
        : ''),
  });
  return {
    compiler_id: SCENE_COMPILER_ID,
    compiled_asset_ids: [binding.asset_id],
    changed_asset_ids: changed ? [binding.asset_id] : [],
    bundles: [bundle],
  };
}

function createDefaultAssetCompilerRegistry() {
  return new AssetCompilerRegistry()
    .register(VEHICLE_TRADE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(ELEVATOR_PARAMETERS_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(UI_COMMAND_DISPATCH_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(BOOT_PARAMETER_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(METATILE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(LAUNCH_ANCHOR_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(NARRATIVE_GLYPHS_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(CONDITIONAL_AUDIO_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(FIXED_TEXT_COMPILER_ID, compileFixedTextFields, fixedTextInput)
    .register(ITEM_SERVICE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(BATTLE_SHARED_TABLES_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(BATTLE_AMOUNT_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(CHARACTER_GROWTH_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(ACQUISITION_AUDIO_ITEMS_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(STATUS_SCHEDULER_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(UI_LAYOUT_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(RASTER_LATCH_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(CHR_PRESET_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(EQUIPMENT_EFFECT_ITEMS_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(DPCM_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(DPCM_STORAGE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(AUDIO_VOICE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(AUDIO_PERIOD_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(ENCOUNTER_MESSAGE_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(BATTLE_WEAPON_ROUTES_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(FIELD_REWARD_PARAMETERS_COMPILER_ID, compileParameterTableAssets, parameterTableInput)
    .register(FACILITY_CONFIG_COMPILER_ID, compileFacilityConfigAssets, facilityConfigInput)
    .register(GAME_DATA_COMPILER_ID, compileGameDataAssets, gameDataInput)
    .register(SCENE_COMPILER_ID, compileSceneConfigAssets, sceneConfigInput)
    .register(STORY_COMPILER_ID, compileStorySequenceAssets, storySequencesInput)
    .register("story-farjump-code/v1", compileStoryCodeAssets, storyCodeInput)
    .register(SCENE_INTERACTION_CODE_COMPILER, compileSceneInteractionCodeAssets, sceneInteractionCodeInput)
    .register(SCENE_MAP_READER_COMPILER, compileSceneMapReaderAssets, storyCodeInput)
    .register(APPLICATION_READER_COMPILER, compileApplicationReaderAssets, storyCodeInput)
    .register(APPLICATION_PROGRAM_COMPILER, compileApplicationPrograms, applicationProgramInput)
    .register(SAVE_EXTENSION_COMPILER, compileSaveExtension, saveExtensionInput)
    .register(VISUAL_COMPILER_ID, compileVisualAssets, visualInput);
}

/** Inspect the same binding/slot/input contracts used by compilation; no ROM writes. */
function inspectAssetWriteback({targetProfileId, target, buildMap, bindings,
  compilerRegistry = createDefaultAssetCompilerRegistry()}) {
  const document = normalizeBindingDocument(bindings, targetProfileId, target, buildMap);
  const byResource = new Map();
  for (const binding of document.bindings) {
    const registered = compilerRegistry.compilers.has(binding.compiler_id);
    const readInput = compilerRegistry.inputReaders.get(binding.compiler_id);
    if (registered && readInput) readInput(binding);
    const missing = !registered ? ["encoder"] : !readInput ? ["constraints"] : [];
    const capability = {target: "rom", state: missing.length ? "missing" : "bound",
      missing, compiler_id: binding.compiler_id, asset_id: binding.asset_id};
    const resourceIds = binding.input.resource_id ? [binding.input.resource_id]
      : [...new Set((binding.input.components || []).map(item => item.resource_id))];
    for (const resourceId of resourceIds) byResource.set(resourceId, capability);
  }
  return byResource;
}

async function verifyExcludedAssetBytes(excludedAssets, readBytes, onProgress) {
  const ordered = [...excludedAssets].sort((left, right) =>
    compareText(left.asset_id, right.asset_id));
  for (const excluded of ordered) {
    const bytes = await readBytes(excluded);
    const digest = await sha256Hex(bytes);
    if (digest !== excluded.original_sha256) {
      throw new ExcludedAssetModifiedError(
        `${excluded.asset_id}: excluded asset was modified; ` +
        `reason=${excluded.reason}`,
      );
    }
  }
  return ordered.map(excluded => excluded.asset_id);
}

// 离线排除资产须校验基线切片，path 只标识语义出处。
async function verifyExcludedBaselineAssets({baseline, excluded_assets: excludedAssets}) {
  return verifyExcludedAssetBytes(excludedAssets, excluded => {
    const end = excluded.file_offset + excluded.length;
    if (end > baseline.length) {
      throw new ExcludedAssetModifiedError(
        `excluded asset ${JSON.stringify(excluded.asset_id)} escapes the immutable baseline`,
      );
    }
    return baseline.subarray(excluded.file_offset, end);
  });
}

function referencedStrings(value, found = new Set()) {
  if (typeof value === "string") found.add(value);
  else if (Array.isArray(value)) value.forEach(item => referencedStrings(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach(item => referencedStrings(item, found));
  return found;
}

// 有 Working 的资源；依赖被编辑时依赖方也算被编辑。取不到清单时返回 null（全量编译）。
async function editedResourceIds(repository) {
  await repository.assertStoryPageWorking?.();
  if (typeof repository.listWorking !== "function"
      || typeof repository.listFieldWorkingResourceIds !== "function") return null;
  const [documents, fields] = await Promise.all([
    repository.listWorking(), repository.listFieldWorkingResourceIds(),
  ]);
  const edited = new Set([...documents.map(record => record.resource_id), ...fields]);
  let expanded;
  do {
    expanded = false;
    for (const ownerId of fieldOwnerIds) {
      const owner = fieldOwner(ownerId);
      if (!edited.has(ownerId) && !(owner.dependencies || []).some(dependency => edited.has(dependency))) continue;
      for (const id of [ownerId, owner.bindingResourceId].filter(Boolean)) {
        if (edited.has(id)) continue;
        edited.add(id);
        expanded = true;
      }
    }
  } while (expanded);
  return edited;
}

// 独立绑定只编译被编辑资源；跨绑定合同与原子组保持整组。
// 被编辑资源映射不到任何绑定而又声明了编译器时，保守地全量编译。
function editedBindings(bindings, edited, buildMap) {
  if (edited === null) return bindings;
  const references = new Map(bindings.map(binding => [binding, referencedStrings(binding.input)]));
  const covered = new Set([...references.values()].flatMap(ids => [...ids]));
  if ([...edited].some(id => hasFieldOwner(id) && fieldOwner(id).compilerId &&
      !covered.has(id) && !covered.has(fieldOwner(id).bindingResourceId))) return bindings;
  const selected = new Set(bindings.filter(binding =>
    [...references.get(binding)].some(id => edited.has(id))));
  if (!selected.size) return [];
  const byOwner = new Map(bindings.map(binding => [binding.asset_id, binding]));
  const groups = new Map();
  for (const slot of buildMap.slots) {
    if (slot.atomic_group === null) continue;
    if (!groups.has(slot.atomic_group)) groups.set(slot.atomic_group, new Set());
    groups.get(slot.atomic_group).add(slot.owner);
  }
  const sharedGroups = [...groups.values()].filter(group => group.size > 1);
  let expanded;
  do {
    expanded = false;
    if (buildMap.save_extension && [...selected].some(binding => binding.compiler_id === STORY_COMPILER_ID)) {
      for (const binding of bindings) if (binding.compiler_id === SAVE_EXTENSION_COMPILER && !selected.has(binding)) {
        selected.add(binding); expanded = true;
      }
    }
    if (buildMap.scene_interaction_transfer && [...selected].some(binding => binding.compiler_id === SCENE_COMPILER_ID)) {
      for (const binding of bindings) if (binding.compiler_id === SCENE_INTERACTION_CODE_COMPILER && !selected.has(binding)) {
        selected.add(binding); expanded = true;
      }
    }
    if (buildMap.scene_map_expansion && [...selected].some(binding => [SCENE_COMPILER_ID, SCENE_MAP_READER_COMPILER].includes(binding.compiler_id))) {
      for (const binding of bindings) if ([SCENE_COMPILER_ID, SCENE_MAP_READER_COMPILER].includes(binding.compiler_id) && !selected.has(binding)) {
        selected.add(binding); expanded = true;
      }
    }
    if ([...selected].some(binding => binding.compiler_id === SCENE_COMPILER_ID || binding.compiler_id === APPLICATION_PROGRAM_COMPILER
        || binding.compiler_id === APPLICATION_READER_COMPILER) && buildMap.application_farjump?.programs) {
      for (const binding of bindings) {
        if (![APPLICATION_PROGRAM_COMPILER, APPLICATION_READER_COMPILER].includes(binding.compiler_id) || selected.has(binding)) continue;
        selected.add(binding); expanded = true;
      }
    }
    if ([...selected].some(binding => binding.compiler_id === STORY_COMPILER_ID || binding.compiler_id === SAVE_EXTENSION_COMPILER
        || (buildMap.story_farjump && binding.compiler_id === "story-farjump-code/v1"))) {
      for (const binding of bindings) {
        if ((binding.compiler_id !== STORY_COMPILER_ID
            && !(buildMap.story_farjump && binding.compiler_id === "story-farjump-code/v1")) || selected.has(binding)) continue;
        selected.add(binding);
        expanded = true;
      }
    }
    for (const owners of sharedGroups) {
      if (![...owners].some(owner => selected.has(byOwner.get(owner)))) continue;
      for (const owner of owners) {
        const binding = byOwner.get(owner);
        if (!binding || selected.has(binding)) continue;
        selected.add(binding);
        expanded = true;
      }
    }
  } while (expanded);
  return bindings.filter(binding => selected.has(binding));
}

/** Compile the bindings of edited resources into one ROM build plan. */
async function compileAssetBindings({
  repository,
  fieldDb = db,
  targetProfileId,
  target,
  buildMap,
  bindings: input,
  baseline,
  onProgress = null,
  compilerRegistry = createDefaultAssetCompilerRegistry(),
}) {
  if (!repository || typeof repository.getBlob !== "function") {
    throw new TypeError("repository must implement getBlob(blobId)");
  }
  if (!(compilerRegistry instanceof AssetCompilerRegistry)) {
    throw new TypeError("compilerRegistry must be an AssetCompilerRegistry");
  }
  if (!(baseline instanceof Uint8Array)) {
    throw new TypeError("baseline must be a Uint8Array");
  }
  const document = normalizeBindingDocument(
    input,
    targetProfileId,
    object(target, "target"),
    object(buildMap, "BuildMap"),
  );
  const context = {
    repository,
    fieldDb,
    targetProfileId,
    target,
    buildMap,
    baseline,
    slots: document.slots,
    bindings: document.bindings,
  };
  const selectedBindings = editedBindings(document.bindings, await editedResourceIds(repository), buildMap);
  const progressCurrent = {verify: 0, compile: 0};
  const progressTotal = {
    verify: 0,
    compile: selectedBindings.length,
  };
  const reportProgress = onProgress ? async event => {
    const progressStage = event.event_type === "excluded-asset-verified"
      ? "verify" : "compile";
    progressCurrent[progressStage] += 1;
    await onProgress({
      ...event,
      stage: progressStage,
      progress_current: progressCurrent[progressStage],
      progress_total: progressTotal[progressStage],
    });
  } : null;
  const verifiedExcludedAssets = [];
  const results = await compilerRegistry.compile(
    context,
    selectedBindings,
    {onProgress: reportProgress},
  );
  const bundles = results.flatMap(result => result.bundles);
  const bundleIds = bundles.map(bundle => bundle.asset_id);
  if (new Set(bundleIds).size !== bundleIds.length) {
    throw new AssetCompilerContractError(
      "different compilers emitted the same bundle asset_id",
    );
  }
  return {
    bundles,
    compiler_results: results,
    verified_excluded_assets: verifiedExcludedAssets,
  };
}

var assetCompiler = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AssetCompilerContractError: AssetCompilerContractError,
  FACILITY_CONFIG_COMPILER_ID: FACILITY_CONFIG_COMPILER_ID,
  FIXED_TEXT_COMPILER_ID: FIXED_TEXT_COMPILER_ID,
  GAME_DATA_COMPILER_ID: GAME_DATA_COMPILER_ID,
  ITEM_SERVICE_COMPILER_ID: ITEM_SERVICE_COMPILER_ID,
  SCENE_COMPILER_ID: SCENE_COMPILER_ID,
  STORY_COMPILER_ID: STORY_COMPILER_ID,
  VISUAL_COMPILER_ID: VISUAL_COMPILER_ID,
  bindingAssetBlobId: bindingAssetBlobId,
  compileAssetBindings: compileAssetBindings,
  gameDataComponentSource: gameDataComponentSource,
  inspectAssetWriteback: inspectAssetWriteback,
  perFieldObjectIds: perFieldObjectIds,
  resolvedRelocationPayload: resolvedRelocationPayload,
  validateBindingDocument: validateBindingDocument,
  validateCompilerBundles: validateCompilerBundles,
  validateCompleteCompilerBundles: validateCompleteCompilerBundles,
  verifyExcludedBaselineAssets: verifyExcludedBaselineAssets,
  workingFieldFragments: workingFieldFragments
});

export { assetCompiler, buildBrowserRom, configureBrowserRomBuildProvider, createProjectStoreRomBuildProvider, publishBuildState, reportBuildState, romHeaderSizes, runLatestBrowserRomButton };
