// @editor-module 按 target bindings 调度资产编译器，产出逻辑片段并检查写回能力。
import {db} from "./project-db.js";
import {VEHICLE_TRADE_COMPILER_ID, VEHICLE_TRADE_COMPONENT_CODEC,
  vehicleTradeAssetSchema, vehicleTradeComponentSpecs} from './vehicle-trade-parameters.js';
import {ELEVATOR_PARAMETERS_COMPILER_ID, ELEVATOR_PARAMETERS_COMPONENT_CODEC,
  elevatorParameterAssetSchema, elevatorParameterComponentSpecs} from './elevator-parameters.js';
import {UI_LAYOUT_COMPILER_ID, UI_LAYOUT_COMPONENT_CODEC, uiLayoutAssetSchema,
  uiLayoutComponentSpecs} from './ui-layout-data.js';
import {UI_COMMAND_DISPATCH_COMPILER_ID, UI_COMMAND_DISPATCH_COMPONENT_CODEC,
  uiCommandDispatchAssetSchema, uiCommandDispatchComponentSpecs} from './ui-command-dispatch-owner.js';
import {farjumpComponentIds, farjumpFragmentIds, farjumpOriginalEntryIds} from "./story-farjump-format.js";
import {SCENE_MAP_READER_ID, SCENE_MAP_READER_COMPILER, SCENE_MAP_READER_PRODUCTS} from './scene-map-reader-owner.js';
import {planExpandedSceneMaps, sceneMapExpansionBudget} from './scene-map-expansion.js';
import {APPLICATION_READER_ID, APPLICATION_READER_COMPILER, APPLICATION_READER_PRODUCTS}
  from './application-script-reader-owner.js';
import {APPLICATION_PROGRAM_COMPILER} from './application-program.js';
import {compileApplicationPrograms, compileApplicationReader, applicationProgramInput} from './application-program-compiler.js';
import {BOOT_PARAMETER_COMPILER_ID, BOOT_PARAMETER_COMPONENT_CODEC,
  bootParameterAssetSchema, bootParameterComponentSpecs} from "./boot-presentation-owner.js";
import {LAUNCH_ANCHOR_COMPILER_ID, LAUNCH_ANCHOR_COMPONENT_CODEC,
  launchAnchorAssetSchema, launchAnchorComponentSpecs} from "./attack-launch-anchor-compiler.js";
import {CONDITIONAL_AUDIO_COMPILER_ID, CONDITIONAL_AUDIO_COMPONENT_CODEC,
  conditionalAudioAssetSchema, conditionalAudioComponentSpecs} from "./conditional-audio-compiler.js";
import {fieldOwner, hasFieldOwner, fieldOwnerIds} from "./field-owners.js";
import {NARRATIVE_GLYPHS_COMPILER_ID, NARRATIVE_GLYPHS_COMPONENT_CODEC, narrativeGlyphAssetSchema, narrativeGlyphComponentSpecs} from "./narrative-glyphs-compiler.js";
import {METATILE_COMPILER_ID, METATILE_COMPONENT_CODEC, metatileAssetSchema, metatileComponentSpecs} from "./metatile-writeback.js";
import {RASTER_LATCH_COMPILER_ID, RASTER_LATCH_COMPONENT_CODEC, rasterLatchAssetSchema, rasterLatchComponentSpecs} from "./raster-latch-parameters-compiler.js";
import {STATUS_SCHEDULER_COMPILER_ID, STATUS_SCHEDULER_COMPONENT_CODEC, statusSchedulerAssetSchema, statusSchedulerComponentSpecs} from "./status-scheduler-parameters-compiler.js";
import {CHR_PRESET_COMPILER_ID, CHR_PRESET_COMPONENT_CODEC, chrPresetAssetSchema, chrPresetComponentSpecs} from "./chr-preset-parameters-compiler.js";
import {AUDIO_VOICE_COMPILER_ID, AUDIO_VOICE_COMPONENT_CODEC, audioVoiceAssetSchema, audioVoiceComponentSpecs} from "./audio-voice-parameters-compiler.js";
import {DPCM_COMPILER_ID, DPCM_COMPONENT_CODEC, dpcmAssetSchema, dpcmComponentSpecs} from "./dpcm-parameters-compiler.js";
import {DPCM_STORAGE_COMPILER_ID, DPCM_STORAGE_COMPONENT_CODEC, dpcmStorageAssetSchema, dpcmStorageComponentSpecs} from "./dpcm-storage-compiler.js";
import {AUDIO_PERIOD_COMPILER_ID, AUDIO_PERIOD_COMPONENT_CODEC,
  audioPeriodAssetSchema, audioPeriodComponentSpecs} from "./audio-period-parameters-compiler.js";
import {BATTLE_WEAPON_ROUTES_COMPILER_ID, BATTLE_WEAPON_ROUTES_COMPONENT_CODEC,
  battleWeaponRoutesAssetSchema, battleWeaponRoutesComponentSpecs} from "./battle-weapon-routes-compiler.js";
import {ENCOUNTER_MESSAGE_COMPILER_ID, ENCOUNTER_MESSAGE_COMPONENT_CODEC,
  encounterMessageAssetSchema, encounterMessageComponentSpecs} from "./encounter-message-parameters-compiler.js";
import {FIELD_REWARD_PARAMETERS_COMPILER_ID, FIELD_REWARD_PARAMETERS_COMPONENT_CODEC,
  fieldRewardParametersAssetSchema, fieldRewardParametersComponentSpecs} from "./field-reward-parameters-compiler.js";
import {ACQUISITION_AUDIO_ITEMS_COMPILER_ID, ACQUISITION_AUDIO_ITEMS_COMPONENT_CODEC,
  acquisitionAudioItemsAssetSchema, acquisitionAudioItemsComponentSpecs} from "./acquisition-audio-items-compiler.js";
import {EQUIPMENT_EFFECT_ITEMS_COMPILER_ID, EQUIPMENT_EFFECT_ITEMS_COMPONENT_CODEC,
  equipmentEffectItemsAssetSchema, equipmentEffectItemsComponentSpecs} from "./equipment-effect-items-compiler.js";
import {CHARACTER_GROWTH_COMPILER_ID, CHARACTER_GROWTH_COMPONENT_CODEC,
  characterGrowthAssetSchema, characterGrowthComponentSpecs} from "./character-growth-compiler.js";
// Target-driven browser AssetCompiler registry.
//
// This is the JavaScript counterpart of engine/tools/mm_build.py. Compilers
// consume target bindings and project data, emit logical EncodedAssetBundle
// values, and never receive permission to write a ROM buffer. Physical ranges
// come only from asset-bindings.json + BuildMap.

import {BUNDLE_SCHEMA, LinkerError, resolveFragmentPayload, sha256Hex} from "./rom-linker.js";
import {FIXED_TEXT_COMPILER_ID, compileFixedTextFields, fixedTextInput} from "./fixed-text-compiler.js";
import {
  itemServiceAssetSchema, itemServiceComponentSpecs,
  ITEM_SERVICE_COMPILER_ID, ITEM_SERVICE_COMPONENT_CODEC,
} from "./item-service-compiler.js";
import {
  battleSharedTableAssetSchema, battleSharedTableComponentSpecs,
  BATTLE_SHARED_TABLES_COMPILER_ID, BATTLE_SHARED_TABLES_COMPONENT_CODEC,
} from "./battle-shared-tables-compiler.js";
import {
  battleAmountAssetSchema, battleAmountComponentSpecs,
  BATTLE_AMOUNT_COMPILER_ID, BATTLE_AMOUNT_COMPONENT_CODEC,
} from "./battle-amount-parameters-compiler.js";
import {
  validateGameDataComponentPreimages,
  gameDataAssetInputSha256,
  gameDataAssetSchema,
  gameDataComponentSpecs,
  GAME_DATA_COMPILER_ID,
  GAME_DATA_COMPONENT_CODEC,
  GAME_DATA_COMPONENT_CODEC_VERSION,
  GAME_DATA_ENCODER,
  GAME_DATA_ENCODER_VERSION,
} from "./game-data-compiler.js";
import {
  encodeFacilityConfigurationFields,
  facilityConfigurationInputSha256,
  FACILITY_CONFIG_ASSET_SCHEMA,
  FACILITY_CONFIG_COMPILER_ID,
  FACILITY_CONFIG_COMPONENT_CODEC,
  FACILITY_CONFIG_COMPONENT_CODEC_VERSION,
  FACILITY_CONFIG_ENCODER,
  FACILITY_CONFIG_ENCODER_VERSION,
  FACILITY_CONFIG_FRAGMENT_ID,
  FACILITY_CONFIG_RESOURCE_ID,
} from "./facility-config-compiler.js";
import {
  storyAssetInputSha256,
  storyAssetSchema,
  storyComponentIds,
  STORY_COMPILER_ID,
  STORY_COMPONENT_CODEC,
  STORY_COMPONENT_CODEC_VERSION,
  STORY_ENCODER,
  STORY_ENCODER_VERSION,
  STORY_RESOURCE_IDS,
} from "./story-compiler.js";
import {
  collectSceneComponentFields,
  compileSceneAssetFields,
  SCENE_BUILD_ASSET_ID,
  SCENE_CATALOG_PATH,
  SCENE_COMPONENT_CATALOG_PATH,
  SCENE_COMPILER_ID,
} from "./scene-compiler.js";
import {
  visualAssetComponents,
  visualAssetInputSha256,
  visualAssetSchema,
  visualComponentSpecs,
  VISUAL_COMPILER_ID,
  VISUAL_COMPONENT_CODEC,
  VISUAL_COMPONENT_CODEC_VERSION,
  VISUAL_ENCODER,
  VISUAL_ENCODER_VERSION,
  VISUAL_RESOURCE_IDS,
} from "./visual-compiler.js";

export {
  FIXED_TEXT_COMPILER_ID,
  ITEM_SERVICE_COMPILER_ID,
  FACILITY_CONFIG_COMPILER_ID,
  GAME_DATA_COMPILER_ID,
  SCENE_COMPILER_ID,
  STORY_COMPILER_ID,
  VISUAL_COMPILER_ID,
};

const SHA256 = /^[0-9a-f]{64}$/;

class AssetCompilerError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "AssetCompilerError";
  }
}

class MissingAssetCompilerError extends AssetCompilerError {}
export class AssetCompilerContractError extends AssetCompilerError {}
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

export function bindingAssetBlobId(targetProfileId, assetId) {
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
  hash(document.build_map_sha256, "bindings.build_map_sha256");
  if (document.build_map_sha256 !== target.build_map_sha256) {
    throw new AssetCompilerContractError(
      "bindings BuildMap hash does not match the target profile",
    );
  }
  string(document.annotations_path, "bindings.annotations_path");
  hash(document.annotations_sha256, "bindings.annotations_sha256");
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
export function validateBindingDocument(document, targetProfileId, target, buildMap) {
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
    "story-farjump-code/v1", APPLICATION_READER_COMPILER, SCENE_MAP_READER_COMPILER]);
}

// 绑定是否逐字段写回：绑定上的每个 owner 都要能按字段序列化且不是聚合对象（聚合绑定按整资源
// 组装，单个字段的字节不自足）；带重定位的绑定不适用（字段序列化可能只给占位字节，真值由
// 链接期写入，如 battle-action 的 layout_reference）。
// 逐字段写回的共用件：注册表在调用编译器时注入，fixed-text 模块因此不必反向引用本模块。
const FIELD_WRITEBACK = Object.freeze({perFieldObjectIds, workingFieldFragments, workingFieldResourceIds});

export function perFieldObjectIds(bindings) {
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
    "resource_id", "asset_schema", "components",
  ], `${binding.asset_id}.input`);
  if (input.resource_id !== binding.asset_id ||
      input.asset_schema !== codec.assetSchema(input.resource_id)) {
    throw new AssetCompilerContractError("parameter-table identity/schema mismatch");
  }
  const specs = codec.componentSpecs(input.resource_id);
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
    hash(component.original_sha256, "剧情代码原像");
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
    bundles.push({schema: BUNDLE_SCHEMA, asset_id: input.resource_id, encoder: "story-farjump-code/v1",
      encoder_version: "1", input_sha256: await sha256Hex(new TextEncoder().encode(stableJson(value))), fragments: working.fragments});
    if (working.changed) changed.push(input.resource_id);
  }
  await state.assertCurrent();
  return {compiler_id: "story-farjump-code/v1", compiled_asset_ids: bindings.map(row => row.asset_id).sort(),
    changed_asset_ids: changed.sort(), bundles};
}

function sceneConfigInput(binding) {
  const input = strictObject(binding.input, [
    "catalog_path", "component_catalog_path", "components", "external_assets",
    ...(Object.hasOwn(binding.input, "expansion_slots") ? ["expansion_slots"] : []),
    ...(Object.hasOwn(binding.input, "actor_interaction_permission") ? ["actor_interaction_permission"] : []),
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
    hash(item.original_sha256, '地图扩展原像');
    return {...item, component_id: `scene.map.${item.fragment_id}`};
  });
  if (input.expansion_slots && expansionSlots.length !== 3) throw new AssetCompilerContractError('地图扩展输入不完整');
  const all = [...components, ...externalAssets, ...expansionSlots].sort((left, right) =>
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
  return {...input, components, external_assets: externalAssets};
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
export function validateCompleteCompilerBundles({slots, bindings, bundles}) {
  const context = {slots: slots instanceof Map ? slots : new Map(slots)};
  const fragments = bundles.flatMap(bundle => bundle.fragments || []);
  validateCompilerSlotCoverage(bindings, fragments, perFieldObjectIds(bindings));
  validateCompilerBundleOwners(context, bindings, bundles, fragments);
}

export async function validateCompilerBundles(context, bindings, bundles) {
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
export function gameDataComponentSource(component, sources) {
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

export async function workingFieldFragments({database, resourceId, assetId = resourceId, assetIdForSource = null,
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
      const original = context.baseline.subarray(
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

export function resolvedRelocationPayload(context, fragment) {
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
      const original = context.baseline.subarray(
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
      const database = context.fieldDb || (await import("./project-db.js")).db;
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
      for (const component of owner.encode(snapshot.fields, {fragmentIds})) {
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
    .register(SCENE_MAP_READER_COMPILER, compileSceneMapReaderAssets, storyCodeInput)
    .register(APPLICATION_READER_COMPILER, compileApplicationReaderAssets, storyCodeInput)
    .register(APPLICATION_PROGRAM_COMPILER, compileApplicationPrograms, applicationProgramInput)
    .register(VISUAL_COMPILER_ID, compileVisualAssets, visualInput);
}

/** Inspect the same binding/slot/input contracts used by compilation; no ROM writes. */
export function inspectAssetWriteback({targetProfileId, target, buildMap, bindings,
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
    if (onProgress) await onProgress({
      stage: "validate",
      event_type: "excluded-asset-verified",
      status: "skipped-clean",
      asset_id: excluded.asset_id,
      input_sha256: digest,
      message: excluded.reason,
    });
  }
  return ordered.map(excluded => excluded.asset_id);
}

// 离线排除资产须校验基线切片，path 只标识语义出处。
export async function verifyExcludedBaselineAssets({baseline, excluded_assets: excludedAssets}) {
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
    if ([...selected].some(binding => binding.compiler_id === STORY_COMPILER_ID
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
export async function compileAssetBindings({
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
