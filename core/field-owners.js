// @editor-module 登记已接入字段 Working 的 owner，复用各域编码器的身份与校验。
import {mountFieldObjectControls, fieldObjectControls} from "./field-object.js";
import {withCodeSegmentFields} from "./code-segment-field-objects.js";
import {uiCommandDispatchFieldOwner} from './ui-command-dispatch-owner.js';
import {STORY_READER_OWNER, storyScriptReaderFieldOwner} from "./story-script-reader-owner.js";
import {SCENE_MAP_READER_ID, sceneMapReaderFieldOwner} from './scene-map-reader-owner.js';
import {APPLICATION_READER_ID, applicationScriptReaderFieldOwner} from './application-script-reader-owner.js';
import {withStoryFarjumpGateFields} from "./story-script-gate-owner.js";
import {runtimeWorkspaceFieldOwner} from "./runtime-workspace-owner.js";
import {sceneActorFieldOwner, sceneActorObjects} from "./scene-actor-compiler.js";
import {sceneDirectionTransformFieldOwner, sceneDirectionTransformObjects,
  serializeSceneDirectionTransformField} from "./scene-direction-transform-compiler.js";
import {indexStrideTableFieldOwner, indexStrideTableObjects,
  serializeIndexStrideTableField} from "./index-stride-table-compiler.js";
import {fieldItemDispatchFieldOwner, fieldItemDispatchObjects,
  serializeFieldItemDispatchField} from "./field-item-dispatch-compiler.js";
import {applicationCommandFieldOwner, applicationCommandObjects,
  serializeApplicationCommandField} from "./application-command-compiler.js";
import {APPLICATION_COMMAND_RECORD_IDS, applicationCommandRecordFieldOwner}
  from "./application-command-record-owner.js";
import {applicationProgramFieldOwner} from './application-program.js';
import {INVESTIGATION_COMMAND_RESOURCE_IDS, investigationCommandFieldOwner}
  from "./investigation-command-owner.js";
import {UI_FACILITY_DATA_RESOURCE_IDS, uiFacilityRecordFieldOwner}
  from "./ui-facility-record-owner.js";
import {uiFacilityBlockFieldOwner, uiFacilityBlockObjects,
  serializeUiFacilityBlockField} from "./ui-facility-block-owner.js";
import {UI_FACILITY_ROUTINE_RESOURCE_IDS, uiFacilityRoutineFieldOwner}
  from "./ui-facility-routine-owner.js";
import {encounterEventFlagMapFieldOwner, encounterEventFlagMapObjects,
  serializeEncounterEventFlagMapField} from "./encounter-event-flag-map-compiler.js";
import {sharedIndexedByteOverlaysFieldOwner, sharedIndexedByteOverlaysObjects,
  serializeSharedIndexedByteOverlaysField} from "./shared-indexed-byte-overlays-compiler.js";
import {packedAttributeQuadrantMaskSetFieldOwner, packedAttributeQuadrantMaskSetObjects,
  serializePackedAttributeQuadrantMaskSetField} from "./packed-attribute-quadrant-mask-set-compiler.js";
import {fieldScrollCoordinateDeltaSetFieldOwner, fieldScrollCoordinateDeltaSetObjects,
  serializeFieldScrollCoordinateDeltaSetField} from "./field-scroll-coordinate-delta-set-compiler.js";
import {selectionLayoutFieldOwner} from './selection-layout-owner.js';
import {uiVehicleLayoutFieldOwner} from './ui-vehicle-layout-owner.js';
import {paletteFieldOwner, paletteObjects, serializePaletteField} from "./palette-compiler.js";
import {bootPresentationFieldOwner, bootPresentationObjects,
  serializeBootPresentationField} from "./boot-presentation-owner.js";
import {fieldItemUseFieldOwner} from "./field-item-use-owner.js";
import {assetFieldOwner} from "./asset-owner.js";
import {battleResultScriptFieldOwner, directFrameFieldOwner,
  encounterFormationFieldOwner} from "./module-records-owners.js";
import {enemyActionSelectionFieldOwner} from "./enemy-action-selection-owner.js";
import {uiNameEntryOwner} from "./ui-name-entry-owner.js";
import {uiWantedFieldOwner,
  uiTileRectangleServiceFieldOwner, textRenderRuntimeFieldOwner,
  uiRoleStatusFieldOwner, uiEquipmentControlFieldOwner,
  uiPartyPairedSelectorFieldOwner,
  saveSlotRuntimeServiceFieldOwner} from "./field-ui-block-owners.js";
import {coreLatinFieldOwner} from "./core-latin-owner.js";
import {metatilePageFieldOwner, metatilePageObjects,
  serializeMetatilePageField} from "./metatile-page-compiler.js";
import {metatileSetFieldOwner, metatileSetObjects,
  serializeMetatileSetField} from "./metatile-set-compiler.js";
import {audioCommandFieldOwner, audioCommandObjects,
  serializeAudioCommandField} from "./audio-command-compiler.js";
import {audioSequenceGraphFieldOwner} from "./audio-sequence-graph-fields.js";
import {saveVehicleTemplateFieldOwner} from "./save-vehicle-template-fields.js";
import {spritePaletteFieldOwner, spritePaletteObjects,
  serializeSpritePaletteField} from "./sprite-palette-compiler.js";
import {characterMapFieldDescriptions, validateCharacterMapFieldOverrides,
  projectCharacterMapFieldView, characterMapObjects} from "./character-map-project.js";
import {VISUAL_COMPILER_ID, attackVisualFieldDescriptions, validateAttackVisualFieldOverrides,
  encodeAttackVisualFields, serializeAttackVisualField, projectAttackVisualFieldView, visualChrFieldDescriptions, validateVisualChrFieldOverrides,
  encodeVisualChrFields, visualChrObjects, visualChrObjectCount, visualChrDocumentScopes, visualChrFieldScope, serializeVisualChrField, validateVisualChrPreimage,
  vehicleSelectorFieldDescriptions, validateVehicleSelectorFieldOverrides,
  encodeVehicleSelectorFields, vehicleSelectorObjects, serializeVehicleSelectorField, validateVehicleSelectorPreimage,
  enemyActionPatternFieldDescriptions, validateEnemyActionPatternFieldOverrides,
  encodeEnemyActionPatternFields, battleObjectLayoutFieldDescriptions, validateBattleObjectLayoutFieldOverrides,
  encodeBattleObjectLayoutFields, battleActionFieldDescriptions, validateBattleActionFieldOverrides,
  battleActionObjects, serializeBattleActionField, validateBattleActionPreimage,
  encodeBattleActionFields, battleObjectLayoutObjects, serializeBattleObjectLayoutField,
  validateBattleObjectLayoutPreimage, metaspriteFieldDescriptions, validateMetaspriteFieldOverrides,
  encodeMetaspriteFields, metaspriteObjects, metaspriteGenericObject, serializeMetaspriteField, validateMetaspritePreimage,
  metaspriteReferenceFieldDescriptions, metaspriteReferenceObjects,
  validateMetaspriteReferenceFieldOverrides, serializeMetaspriteReferenceField,
  enemyActionFieldDescriptions, validateEnemyActionFieldOverrides,
  encodeEnemyActionFields, projectEnemyActionFieldView, enemyActionObjects, serializeEnemyActionField,
  validateEnemyActionPreimage, enemyActionPatternObjects, serializeEnemyActionPatternField,
  validateEnemyActionPatternPreimage, auxiliaryScriptFieldDescriptions,
  validateAuxiliaryScriptFieldOverrides, encodeAuxiliaryScriptFields, serializeAuxiliaryScriptField, projectAuxiliaryScriptFieldView, attackVisualObjects, auxiliaryScriptObjects} from "./visual-compiler.js";
import {LAUNCH_ANCHOR_COMPILER_ID, launchAnchorFieldDescriptions,
  validateLaunchAnchorFieldOverrides, encodeLaunchAnchorFields, projectLaunchAnchorFieldView,
  launchAnchorObjects, serializeLaunchAnchorField,
  validateLaunchAnchorPreimage} from "./attack-launch-anchor-compiler.js";
import {SPARSE_ARRAY_FORMAT, encodeImportedDocumentFields} from "./field-codec.js";
import {monsterPaletteFieldOwner, monsterPaletteObjects, serializeMonsterPaletteField} from "./monster-palette-compiler.js";
import {monsterPalettePairFieldOwner, monsterPalettePairObjects, serializeMonsterPalettePairField} from "./monster-palette-pair-compiler.js";
import {monsterFigureFieldOwner} from "./monster-figure-compiler.js";
import {MONSTER_GRAPHIC_FRAGMENTS, monsterGraphicFieldDescriptions,
  validateMonsterGraphicFieldOverrides, encodeMonsterGraphicFields,
  monsterGraphicObjects, serializeMonsterGraphicField} from "./monster-graphic-owner.js";
import {sceneEncounterFieldOwner} from "./scene-encounter-compiler.js";
import {SCENE_CONFIG_RESOURCE_IDS, sceneConfigFieldOwner} from "./scene-config-owner.js";
import {TILE_ACTION_OWNER, sceneTileActionFieldOwner} from "./scene-tile-action-owner.js";
import {WORLD_TIDE_OWNER, worldTideFieldOwner} from './world-tide-owner.js';
import {fieldMapQueryTableOwner, sceneActorRuntimeTableOwner}
  from "./scene-interaction-table-owners.js";
import {terrainWhitelistOwner} from "./terrain-whitelist-owner.js";
import {APPLICATION_CONFIG_FAMILY_RESOURCE_IDS, applicationConfigFamilyFieldOwner}
  from "./application-config-family-compiler.js";
import {PARTY_ACTOR_TYPE_MAP_OWNER, partyActorTypeMapFieldOwner}
  from "./party-actor-type-map-compiler.js";
import {audioOpcodeFieldOwner} from "./audio-opcode-owner.js";
import {BATTLE_SYSTEM_DATA_IDS, battleSystemDataFieldOwner}
  from "./battle-system-data-owner.js";
import {FIXED_TEXT_COMPILER_ID, fixedTextFieldDescriptions, fixedTextDocumentScopes, fixedTextFieldScope,
  validateFixedTextFieldOverrides, encodeFixedTextFields, fixedTextObjects, serializeFixedTextField} from "./fixed-text-compiler.js";
import {fixedSlotTextFieldDescriptions, validateFixedSlotTextFieldOverrides,
  encodeFixedSlotTextFields, fixedSlotTextObjects, serializeFixedSlotTextField,
  validateFixedSlotTextPreimage} from "./fixed-slot-text-owner.js";
import {projectTextRecordFieldView} from "./text-record-project.js";
import {GAME_DATA_COMPILER_ID, characterFieldDescriptions, validateCharacterFieldOverrides,
  encodeCharacterFields, characterObjects, serializeCharacterField, validateCharacterPreimage,
  wantedFieldDescriptions, validateWantedFieldOverrides,
  encodeWantedFields, wantedObjects, serializeWantedField, validateWantedPreimage,
  shellPriceFieldDescriptions, validateShellPriceFieldOverrides,
  encodeShellPriceFields, projectShellPriceView, shellObjects, serializeShellField,
  battleTestFieldDescriptions, validateBattleTestFieldOverrides,
  vehicleFieldDescriptions, validateVehicleFieldOverrides, encodeVehicleFields, projectVehicleFieldView,
  vehicleObjects, serializeVehicleField, validateVehiclePreimage,
  encodeBattleTestFields, projectBattleTestFieldView, battleTestObjects, serializeBattleTestField,
  validateBattleTestPreimage, monsterFieldDescriptions,
  validateMonsterFieldOverrides, encodeMonsterFields, projectMonsterFieldView,
  monsterObjects, serializeMonsterField,
  itemFieldDescriptions, validateItemFieldOverrides, encodeItemFields, projectItemFieldView,
  itemObjects, serializeItemField} from "./game-data-compiler.js";
import {FACILITY_CONFIG_COMPILER_ID, facilityConfigurationFieldDescriptions,
  validateFacilityConfigurationFieldOverrides, encodeFacilityConfigurationFields,
  facilityConfigurationObjects, serializeFacilityConfigurationField,
  validateFacilityConfigurationPreimage} from "./facility-config-compiler.js";
import {ACQUISITION_AUDIO_ITEMS_COMPILER_ID, acquisitionAudioItemsFieldDescriptions,
  validateAcquisitionAudioItemsFieldOverrides, encodeAcquisitionAudioItemsFields,
  acquisitionAudioItemsObjects, serializeAcquisitionAudioItemField,
  acquisitionAudioItemsReferenceRule,
  validateAcquisitionAudioItemsPreimage} from "./acquisition-audio-items-compiler.js";
import {BATTLE_WEAPON_ROUTES_COMPILER_ID, battleWeaponRoutesFieldDescriptions,
  validateBattleWeaponRoutesFieldOverrides, encodeBattleWeaponRoutesFields, battleWeaponRoutesObjects,
  battleWeaponRoutesReferenceRule,
  serializeBattleWeaponRouteField, validateBattleWeaponRoutesPreimage} from "./battle-weapon-routes-compiler.js";
import {DPCM_STORAGE_COMPILER_ID, dpcmStorageFieldDescriptions,
  validateDpcmStorageFieldOverrides, encodeDpcmStorageFields, dpcmStorageObjects,
  serializeDpcmStorageField, validateDpcmStoragePreimage} from "./dpcm-storage-compiler.js";
import {ITEM_SERVICE_COMPILER_ID, itemServiceFieldDescriptions,
  validateItemServiceFieldOverrides, encodeItemServiceFields, itemServiceObjects,
  serializeItemServiceField, validateItemServicePreimage} from "./item-service-compiler.js";
import {CHARACTER_GROWTH_COMPILER_ID, characterGrowthFieldDescriptions,
  validateCharacterGrowthFieldOverrides, encodeCharacterGrowthFields, characterGrowthObjects,
  serializeCharacterGrowthField, validateCharacterGrowthPreimage} from "./character-growth-compiler.js";
import {AUDIO_VOICE_COMPILER_ID, audioVoiceFieldDescriptions,
  validateAudioVoiceFieldOverrides, encodeAudioVoiceFields, audioVoiceObjects,
  serializeAudioVoiceField, validateAudioVoicePreimage} from "./audio-voice-parameters-compiler.js";
import {CHR_PRESET_COMPILER_ID, chrPresetFieldDescriptions,
  validateChrPresetFieldOverrides, encodeChrPresetFields, chrPresetFieldObjectCodec} from "./chr-preset-parameters-compiler.js";
import {RASTER_LATCH_COMPILER_ID, rasterLatchFieldDescriptions,
  validateRasterLatchFieldOverrides, encodeRasterLatchFields, rasterLatchFieldObjectCodec} from "./raster-latch-parameters-compiler.js";
import {STATUS_SCHEDULER_COMPILER_ID, statusSchedulerFieldDescriptions,
  validateStatusSchedulerFieldOverrides, encodeStatusSchedulerFields, statusSchedulerObjects,
  serializeStatusSchedulerField, validateStatusSchedulerPreimage} from "./status-scheduler-parameters-compiler.js";
import {EQUIPMENT_EFFECT_ITEMS_COMPILER_ID, equipmentEffectItemsFieldDescriptions,
  validateEquipmentEffectItemsFieldOverrides, encodeEquipmentEffectItemsFields, equipmentEffectItemsObjects,
  serializeEquipmentEffectItemField, validateEquipmentEffectItemsPreimage} from "./equipment-effect-items-compiler.js";
import {ENCOUNTER_MESSAGE_COMPILER_ID, encounterMessageFieldDescriptions,
  validateEncounterMessageFieldOverrides, encodeEncounterMessageFields, encounterMessageFieldObjectCodec,
  encounterMessageObjects} from "./encounter-message-parameters-compiler.js";
import {BATTLE_SHARED_TABLES_COMPILER_ID, battleSharedTableFieldDescriptions,
  validateBattleSharedTableFieldOverrides, encodeBattleSharedTableFields, battleSharedTableFieldObjectCodec} from "./battle-shared-tables-compiler.js";
import {DPCM_COMPILER_ID, dpcmFieldDescriptions, validateDpcmFieldOverrides, encodeDpcmFields, dpcmFieldObjectCodec} from "./dpcm-parameters-compiler.js";
import {FIELD_REWARD_PARAMETERS_COMPILER_ID, fieldRewardFieldDescriptions,
  validateFieldRewardFieldOverrides, encodeFieldRewardFields, fieldRewardObjects,
  serializeFieldRewardField, validateFieldRewardPreimage} from "./field-reward-parameters-compiler.js";
import {NARRATIVE_GLYPHS_COMPILER_ID, narrativeGlyphFieldDescriptions,
  narrativeGlyphDocumentScopes, narrativeGlyphFieldScope,
  validateNarrativeGlyphFieldOverrides, encodeNarrativeGlyphFields, narrativeGlyphObjects,
  narrativeGlyphObjectCount,
  serializeNarrativeGlyphField, validateNarrativeGlyphPreimage} from "./narrative-glyphs-compiler.js";
import {AUDIO_PERIOD_COMPILER_ID, audioPeriodFieldDescriptions,
  validateAudioPeriodFieldOverrides, encodeAudioPeriodFields, audioPeriodObjects,
  serializeAudioPeriodField, validateAudioPeriodPreimage} from "./audio-period-parameters-compiler.js";
import {BATTLE_AMOUNT_COMPILER_ID, battleScalingFieldDescriptions,
  validateBattleScalingFieldOverrides, encodeBattleScalingFields, battleRandomFieldDescriptions,
  validateBattleRandomFieldOverrides, encodeBattleRandomFields, battleScalingFieldObjectCodec,
  battleRandomFieldObjectCodec} from "./battle-amount-parameters-compiler.js";
import {CONDITIONAL_AUDIO_COMPILER_ID} from "./conditional-audio-compiler.js";
import {fieldSceneRuleDescriptions, validateFieldSceneRuleOverrides, encodeFieldSceneRules,
  fieldSceneRuleObjects, serializeFieldSceneRule, validateFieldSceneRulePreimage} from './scene-remap-owner.js';
import {visualActorsFieldDescriptions, validateVisualActorsFieldOverrides,
  encodeVisualActorsFields, visualActorsObjects, serializeVisualActorsField} from "./visual-compiler.js";
import {visualMonstersFieldOwner, visualMonstersObjects, serializeVisualMonstersField} from "./visual-monsters-owner.js";
import {STORY_COMPILER_ID, worldEventFieldDescriptions, validateWorldEventFieldOverrides,
  encodeWorldEventFields, worldEventObjects, serializeWorldEventField, validateWorldEventPreimage,
  storyScriptFieldDescriptions, validateStoryScriptFieldOverrides,
  encodeStoryScriptFields, storyScriptObjects} from "./story-compiler.js";

const owners = new Map([
  ['application-program', applicationProgramFieldOwner],
  [STORY_READER_OWNER, storyScriptReaderFieldOwner],
  [APPLICATION_READER_ID, applicationScriptReaderFieldOwner],
  [SCENE_MAP_READER_ID, sceneMapReaderFieldOwner],
  ["scene-actor", Object.freeze({...sceneActorFieldOwner,
    objects: sceneActorObjects, controls: mountFieldObjectControls})],
  ["scene-direction-transform", Object.freeze({...sceneDirectionTransformFieldOwner,
    objects: sceneDirectionTransformObjects, serializeField: serializeSceneDirectionTransformField,
    controls: mountFieldObjectControls})],
  ["index-stride-table", Object.freeze({...indexStrideTableFieldOwner,
    objects: indexStrideTableObjects, serializeField: serializeIndexStrideTableField,
    controls: mountFieldObjectControls})],
  ["field-item-dispatch", Object.freeze({...fieldItemDispatchFieldOwner,
    objects: fieldItemDispatchObjects, serializeField: serializeFieldItemDispatchField,
    controls: mountFieldObjectControls})],
  ["application-command", Object.freeze({...applicationCommandFieldOwner,
    objects: applicationCommandObjects, serializeField: serializeApplicationCommandField,
    controls: mountFieldObjectControls})],
  ["ui-facility", Object.freeze({...uiFacilityBlockFieldOwner,
    objects: uiFacilityBlockObjects, serializeField: serializeUiFacilityBlockField,
    controls: mountFieldObjectControls, objectPageSize: 1})],
  ["encounter-event-flag-map", Object.freeze({...encounterEventFlagMapFieldOwner,
    objects: encounterEventFlagMapObjects, serializeField: serializeEncounterEventFlagMapField,
    controls: mountFieldObjectControls})],
  ["shared-indexed-byte-overlays", Object.freeze({...sharedIndexedByteOverlaysFieldOwner,
    objects: sharedIndexedByteOverlaysObjects, serializeField: serializeSharedIndexedByteOverlaysField,
    controls: mountFieldObjectControls})],
  ["packed-attribute-quadrant-mask-set", Object.freeze({...packedAttributeQuadrantMaskSetFieldOwner,
    objects: packedAttributeQuadrantMaskSetObjects,
    serializeField: serializePackedAttributeQuadrantMaskSetField,
    controls: mountFieldObjectControls})],
  ["field-scroll-coordinate-delta-set", Object.freeze({...fieldScrollCoordinateDeltaSetFieldOwner,
    objects: fieldScrollCoordinateDeltaSetObjects,
    serializeField: serializeFieldScrollCoordinateDeltaSetField,
    controls: mountFieldObjectControls})],
  ['selection-layout', Object.freeze({...selectionLayoutFieldOwner, controls: mountFieldObjectControls})],
  ["field-item-use", Object.freeze({...fieldItemUseFieldOwner})],
  ["asset", Object.freeze({...assetFieldOwner})],
  ["battle-result-script", Object.freeze({...battleResultScriptFieldOwner})],
  ["encounter-formation", Object.freeze({...encounterFormationFieldOwner})],
  ["direct-frame", Object.freeze({...directFrameFieldOwner})],
  ["enemy-action-selection-service", enemyActionSelectionFieldOwner],
  ["ui-name-entry", Object.freeze({...uiNameEntryOwner.fieldOwner,
    objects: uiNameEntryOwner.objects, serializeField: uiNameEntryOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["ui-wanted", Object.freeze({...uiWantedFieldOwner.fieldOwner,
    objects: uiWantedFieldOwner.objects, serializeField: uiWantedFieldOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["ui-vehicle-status", Object.freeze({...uiVehicleLayoutFieldOwner,
    controls: mountFieldObjectControls})],
  ["ui-tile-rectangle-service", Object.freeze({...uiTileRectangleServiceFieldOwner.fieldOwner,
    objects: uiTileRectangleServiceFieldOwner.objects,
    serializeField: uiTileRectangleServiceFieldOwner.serializeField,
    controls: uiTileRectangleServiceFieldOwner.fieldOwner.controls})],
  ["text-render-runtime", Object.freeze({...textRenderRuntimeFieldOwner.fieldOwner,
    objects: textRenderRuntimeFieldOwner.objects,
    serializeField: textRenderRuntimeFieldOwner.serializeField,
    controls: textRenderRuntimeFieldOwner.fieldOwner.controls})],
  ["ui-role-status", Object.freeze({...uiRoleStatusFieldOwner.fieldOwner,
    objects: uiRoleStatusFieldOwner.objects,
    serializeField: uiRoleStatusFieldOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["ui-equipment-control", Object.freeze({...uiEquipmentControlFieldOwner.fieldOwner,
    objects: uiEquipmentControlFieldOwner.objects,
    serializeField: uiEquipmentControlFieldOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["ui-party-paired-selector", Object.freeze({...uiPartyPairedSelectorFieldOwner.fieldOwner,
    objects: uiPartyPairedSelectorFieldOwner.objects,
    serializeField: uiPartyPairedSelectorFieldOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["save-slot-runtime-service", Object.freeze({...saveSlotRuntimeServiceFieldOwner.fieldOwner,
    objects: saveSlotRuntimeServiceFieldOwner.objects,
    serializeField: saveSlotRuntimeServiceFieldOwner.serializeField,
    controls: mountFieldObjectControls})],
  ["core-latin", Object.freeze({...coreLatinFieldOwner.fieldOwner,
    objects: coreLatinFieldOwner.objects, serializeField: coreLatinFieldOwner.serializeField,
    controls: fieldObjectControls('core-latin')})],
  ["boot-presentation", Object.freeze({...bootPresentationFieldOwner,
    objects: bootPresentationObjects, serializeField: serializeBootPresentationField,
    controls: mountFieldObjectControls})],
  ["palette", Object.freeze({...paletteFieldOwner, objects: paletteObjects,
    serializeField: serializePaletteField, controls: mountFieldObjectControls})],
  ["metatile-page", Object.freeze({...metatilePageFieldOwner, objects: metatilePageObjects,
    serializeField: serializeMetatilePageField, controls: mountFieldObjectControls})],
  ["metatile-set", Object.freeze({...metatileSetFieldOwner, objects: metatileSetObjects,
    serializeField: serializeMetatileSetField, controls: mountFieldObjectControls})],
  ["audio-command", Object.freeze({...audioCommandFieldOwner, objects: audioCommandObjects,
    serializeField: serializeAudioCommandField, controls: mountFieldObjectControls})],
  ["sprite-palette", Object.freeze({...spritePaletteFieldOwner, objects: spritePaletteObjects,
    serializeField: serializeSpritePaletteField, controls: mountFieldObjectControls})],
  ["monster-figure", monsterFigureFieldOwner],
  ["monster-palette", Object.freeze({...monsterPaletteFieldOwner,
    objects: monsterPaletteObjects, serializeField: serializeMonsterPaletteField,
    controls: mountFieldObjectControls})],
  ["monster-palette-pair", Object.freeze({...monsterPalettePairFieldOwner,
    objects: monsterPalettePairObjects, serializeField: serializeMonsterPalettePairField,
    controls: mountFieldObjectControls})],
  ["monster-graphic", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    bindingResourceId: "monster-visual-layout", fragmentIds: MONSTER_GRAPHIC_FRAGMENTS,
    describe: monsterGraphicFieldDescriptions, validate: validateMonsterGraphicFieldOverrides,
    encode: encodeMonsterGraphicFields, objects: monsterGraphicObjects,
    serializeField: serializeMonsterGraphicField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["monster-visual-layout", Object.freeze({...visualMonstersFieldOwner,
    objects: visualMonstersObjects, serializeField: serializeVisualMonstersField,
    controls: mountFieldObjectControls})],
  ["scene-encounter-zone", Object.freeze({...sceneEncounterFieldOwner,
    controls: fieldObjectControls('scene-encounter-zone')})],
  ["weapon-attack-parameter", Object.freeze({compilerId: LAUNCH_ANCHOR_COMPILER_ID,
    describe: launchAnchorFieldDescriptions, validate: validateLaunchAnchorFieldOverrides,
    encode: encodeLaunchAnchorFields, projectView: projectLaunchAnchorFieldView,
    objects: launchAnchorObjects, serializeField: serializeLaunchAnchorField,
    validatePreimage: validateLaunchAnchorPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["audio-sequence", audioSequenceGraphFieldOwner],
  ["save-vehicle", saveVehicleTemplateFieldOwner],
  ["text-record", Object.freeze({compilerId: FIXED_TEXT_COMPILER_ID,
    describe: fixedTextFieldDescriptions, validate: validateFixedTextFieldOverrides,
    documentScopes: fixedTextDocumentScopes, fieldScope: fixedTextFieldScope, materializeOnRead: true,
    projectView: projectTextRecordFieldView, projectViewReadonly: true,
    workingFormat: SPARSE_ARRAY_FORMAT,
    dependencies: Object.freeze(["text.character-map"]),
    encode: encodeFixedTextFields, objects: fixedTextObjects, serializeField: serializeFixedTextField,
    controls: fieldObjectControls('text-record'),
    documentView: true, legacyClosed: true})],
  ["attack-visual", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: attackVisualFieldDescriptions, validate: validateAttackVisualFieldOverrides,
    encode: encodeAttackVisualFields, projectView: projectAttackVisualFieldView,
    objects: attackVisualObjects, serializeField: serializeAttackVisualField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["attack-visual-aux-script", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: auxiliaryScriptFieldDescriptions, validate: validateAuxiliaryScriptFieldOverrides,
    encode: encodeAuxiliaryScriptFields, projectView: projectAuxiliaryScriptFieldView,
    projectImportView: projectAuxiliaryScriptFieldView,
    objects: auxiliaryScriptObjects, serializeField: serializeAuxiliaryScriptField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["monster-profile", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: monsterFieldDescriptions, validate: validateMonsterFieldOverrides,
    encode: encodeMonsterFields, projectView: projectMonsterFieldView,
    projectImportView: projectMonsterFieldView, objects: monsterObjects,
    serializeField: serializeMonsterField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["character-initial-record", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: characterFieldDescriptions, validate: validateCharacterFieldOverrides,
    encode: encodeCharacterFields, objects: characterObjects, serializeField: serializeCharacterField,
    validatePreimage: validateCharacterPreimage, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["fixed-text-slot", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: fixedSlotTextFieldDescriptions, validate: validateFixedSlotTextFieldOverrides,
    encode: encodeFixedSlotTextFields, objects: fixedSlotTextObjects,
    serializeField: serializeFixedSlotTextField,
    validatePreimage: validateFixedSlotTextPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["item-entry", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: itemFieldDescriptions, validate: validateItemFieldOverrides,
    encode: encodeItemFields, projectView: projectItemFieldView, objects: itemObjects,
    serializeField: serializeItemField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["vehicle-preset", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: vehicleFieldDescriptions, validate: validateVehicleFieldOverrides,
    encode: encodeVehicleFields, projectView: projectVehicleFieldView,
    objects: vehicleObjects, serializeField: serializeVehicleField,
    validatePreimage: validateVehiclePreimage, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["enemy-action", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: enemyActionFieldDescriptions, validate: validateEnemyActionFieldOverrides,
    encode: encodeEnemyActionFields, projectView: projectEnemyActionFieldView,
    projectImportView: projectEnemyActionFieldView, objects: enemyActionObjects,
    serializeField: serializeEnemyActionField, validatePreimage: validateEnemyActionPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["metasprite-record", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    genericObject: metaspriteGenericObject,
    describe: metaspriteFieldDescriptions, validate: validateMetaspriteFieldOverrides,
    encode: encodeMetaspriteFields, objects: metaspriteObjects,
    serializeField: serializeMetaspriteField, validatePreimage: validateMetaspritePreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["metasprite", Object.freeze({compilerId: null, defaultSourceKind: "annotation",
    describe: metaspriteReferenceFieldDescriptions, validate: validateMetaspriteReferenceFieldOverrides,
    objects: metaspriteReferenceObjects, serializeField: serializeMetaspriteReferenceField,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["battle-action", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: battleActionFieldDescriptions, validate: validateBattleActionFieldOverrides,
    encode: encodeBattleActionFields, objects: battleActionObjects,
    serializeField: serializeBattleActionField, validatePreimage: validateBattleActionPreimage,
    controls: fieldObjectControls('battle-action'), documentView: true, legacyClosed: true})],
  ["battle-object-layout", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: battleObjectLayoutFieldDescriptions, validate: validateBattleObjectLayoutFieldOverrides,
    encode: encodeBattleObjectLayoutFields, objects: battleObjectLayoutObjects,
    serializeField: serializeBattleObjectLayoutField, validatePreimage: validateBattleObjectLayoutPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["enemy-action-pattern", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: enemyActionPatternFieldDescriptions, validate: validateEnemyActionPatternFieldOverrides,
    encode: encodeEnemyActionPatternFields, objects: enemyActionPatternObjects,
    serializeField: serializeEnemyActionPatternField, validatePreimage: validateEnemyActionPatternPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["text.character-map", Object.freeze({compilerId: null, defaultSourceKind: "annotation",
    describe: characterMapFieldDescriptions, validate: validateCharacterMapFieldOverrides,
    encode: () => [], projectView: projectCharacterMapFieldView, objects: characterMapObjects,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["vehicle-visual-selector", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: vehicleSelectorFieldDescriptions, validate: validateVehicleSelectorFieldOverrides,
    encode: encodeVehicleSelectorFields, objects: vehicleSelectorObjects,
    serializeField: serializeVehicleSelectorField, validatePreimage: validateVehicleSelectorPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["shared-chr-bank", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: visualChrFieldDescriptions, validate: validateVisualChrFieldOverrides,
    documentScopes: visualChrDocumentScopes,
    fieldScope: visualChrFieldScope,
    encode: encodeVisualChrFields, objects: visualChrObjects,
    objectCount: visualChrObjectCount,
    serializeField: serializeVisualChrField, validatePreimage: validateVisualChrPreimage,
    controls: fieldObjectControls('shared-chr-bank'),
    documentView: true, legacyClosed: true})],
  ["actor-visual", Object.freeze({compilerId: VISUAL_COMPILER_ID,
    describe: visualActorsFieldDescriptions, validate: validateVisualActorsFieldOverrides,
    encode: encodeVisualActorsFields, objects: visualActorsObjects,
    serializeField: serializeVisualActorsField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["battle-test-point", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: battleTestFieldDescriptions, validate: validateBattleTestFieldOverrides,
    encode: encodeBattleTestFields, projectView: projectBattleTestFieldView, objects: battleTestObjects,
    serializeField: serializeBattleTestField, validatePreimage: validateBattleTestPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["shell-record", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: shellPriceFieldDescriptions, validate: validateShellPriceFieldOverrides,
    encode: encodeShellPriceFields, projectView: projectShellPriceView, objects: shellObjects,
    serializeField: serializeShellField, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["wanted-record", Object.freeze({compilerId: GAME_DATA_COMPILER_ID,
    describe: wantedFieldDescriptions, validate: validateWantedFieldOverrides,
    encode: encodeWantedFields, objects: wantedObjects, serializeField: serializeWantedField,
    validatePreimage: validateWantedPreimage, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["facility-config", Object.freeze({compilerId: FACILITY_CONFIG_COMPILER_ID,
    describe: facilityConfigurationFieldDescriptions, validate: validateFacilityConfigurationFieldOverrides,
    encode: encodeFacilityConfigurationFields, objects: facilityConfigurationObjects,
    serializeField: serializeFacilityConfigurationField, validatePreimage: validateFacilityConfigurationPreimage,
    controls: fieldObjectControls('facility-config'), documentView: true, legacyClosed: true})],
  ["item-acquisition-service", Object.freeze({compilerId: ACQUISITION_AUDIO_ITEMS_COMPILER_ID,
    describe: acquisitionAudioItemsFieldDescriptions, validate: validateAcquisitionAudioItemsFieldOverrides,
    encode: encodeAcquisitionAudioItemsFields, objects: acquisitionAudioItemsObjects,
    serializeField: serializeAcquisitionAudioItemField, validatePreimage: validateAcquisitionAudioItemsPreimage,
    referenceCandidates: acquisitionAudioItemsReferenceRule,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["battle-engine", Object.freeze({compilerId: BATTLE_WEAPON_ROUTES_COMPILER_ID,
    describe: battleWeaponRoutesFieldDescriptions, validate: validateBattleWeaponRoutesFieldOverrides,
    encode: encodeBattleWeaponRoutesFields, objects: battleWeaponRoutesObjects,
    serializeField: serializeBattleWeaponRouteField, validatePreimage: validateBattleWeaponRoutesPreimage,
    referenceCandidates: battleWeaponRoutesReferenceRule,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["dpcm-storage", Object.freeze({compilerId: DPCM_STORAGE_COMPILER_ID,
    describe: dpcmStorageFieldDescriptions, validate: validateDpcmStorageFieldOverrides,
    encode: encodeDpcmStorageFields, objects: dpcmStorageObjects,
    serializeField: serializeDpcmStorageField, validatePreimage: validateDpcmStoragePreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["battle-item-service", Object.freeze({compilerId: ITEM_SERVICE_COMPILER_ID,
    describe: itemServiceFieldDescriptions, validate: validateItemServiceFieldOverrides,
    encode: encodeItemServiceFields, objects: itemServiceObjects,
    serializeField: serializeItemServiceField, validatePreimage: validateItemServicePreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["party-healing-service", Object.freeze({compilerId: ITEM_SERVICE_COMPILER_ID,
    describe: itemServiceFieldDescriptions, validate: validateItemServiceFieldOverrides,
    encode: encodeItemServiceFields, objects: itemServiceObjects,
    serializeField: serializeItemServiceField, validatePreimage: validateItemServicePreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["character-growth", Object.freeze({compilerId: CHARACTER_GROWTH_COMPILER_ID,
    describe: characterGrowthFieldDescriptions, validate: validateCharacterGrowthFieldOverrides,
    encode: encodeCharacterGrowthFields, objects: characterGrowthObjects, controls: mountFieldObjectControls,
    serializeField: serializeCharacterGrowthField, validatePreimage: validateCharacterGrowthPreimage,
    documentView: true, legacyClosed: true})],
  ["audio-voice", Object.freeze({compilerId: AUDIO_VOICE_COMPILER_ID,
    describe: audioVoiceFieldDescriptions, validate: validateAudioVoiceFieldOverrides,
    encode: encodeAudioVoiceFields, objects: audioVoiceObjects,
    serializeField: serializeAudioVoiceField, validatePreimage: validateAudioVoicePreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["chr-bank-mapping-service", Object.freeze({compilerId: CHR_PRESET_COMPILER_ID,
    describe: chrPresetFieldDescriptions, validate: validateChrPresetFieldOverrides,
    encode: encodeChrPresetFields, ...chrPresetFieldObjectCodec, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["raster-interrupt-runtime-service", Object.freeze({compilerId: RASTER_LATCH_COMPILER_ID,
    describe: rasterLatchFieldDescriptions, validate: validateRasterLatchFieldOverrides,
    encode: encodeRasterLatchFields, ...rasterLatchFieldObjectCodec, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["battle-status-scheduler", Object.freeze({compilerId: STATUS_SCHEDULER_COMPILER_ID,
    describe: statusSchedulerFieldDescriptions, validate: validateStatusSchedulerFieldOverrides,
    encode: encodeStatusSchedulerFields, objects: statusSchedulerObjects,
    serializeField: serializeStatusSchedulerField, validatePreimage: validateStatusSchedulerPreimage,
    controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["role-equipment-derived", Object.freeze({compilerId: EQUIPMENT_EFFECT_ITEMS_COMPILER_ID,
    describe: equipmentEffectItemsFieldDescriptions, validate: validateEquipmentEffectItemsFieldOverrides,
    encode: encodeEquipmentEffectItemsFields, objects: equipmentEffectItemsObjects,
    serializeField: serializeEquipmentEffectItemField, validatePreimage: validateEquipmentEffectItemsPreimage,
    controls: mountFieldObjectControls, documentView: true, legacyClosed: true})],
  ["encounter-trigger-runtime", Object.freeze({compilerId: ENCOUNTER_MESSAGE_COMPILER_ID,
    describe: encounterMessageFieldDescriptions, validate: validateEncounterMessageFieldOverrides,
    encode: encodeEncounterMessageFields, ...encounterMessageFieldObjectCodec,
    objects: encounterMessageObjects,
    controls: fieldObjectControls('encounter-trigger-runtime'), documentView: true, legacyClosed: true})],
  ["battle-party-vertical-layout", Object.freeze({compilerId: BATTLE_SHARED_TABLES_COMPILER_ID,
    describe: battleSharedTableFieldDescriptions, validate: validateBattleSharedTableFieldOverrides,
    encode: encodeBattleSharedTableFields, ...battleSharedTableFieldObjectCodec("battle-party-vertical-layout"), controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["battle-probability-thresholds", Object.freeze({compilerId: BATTLE_SHARED_TABLES_COMPILER_ID,
    describe: battleSharedTableFieldDescriptions, validate: validateBattleSharedTableFieldOverrides,
    encode: encodeBattleSharedTableFields, ...battleSharedTableFieldObjectCodec("battle-probability-thresholds"), controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["dpcm-sample", Object.freeze({compilerId: DPCM_COMPILER_ID,
    describe: dpcmFieldDescriptions, validate: validateDpcmFieldOverrides,
    encode: encodeDpcmFields, ...dpcmFieldObjectCodec, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["field-reward-resolution-service", Object.freeze({compilerId: FIELD_REWARD_PARAMETERS_COMPILER_ID,
    describe: fieldRewardFieldDescriptions, validate: validateFieldRewardFieldOverrides,
    encode: encodeFieldRewardFields, objects: fieldRewardObjects,
    serializeField: serializeFieldRewardField, validatePreimage: validateFieldRewardPreimage, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["battle-random-amount-service", Object.freeze({compilerId: BATTLE_AMOUNT_COMPILER_ID,
    describe: battleRandomFieldDescriptions, validate: validateBattleRandomFieldOverrides,
    encode: encodeBattleRandomFields, ...battleRandomFieldObjectCodec, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["field-scene-lifecycle-service", Object.freeze({compilerId: CONDITIONAL_AUDIO_COMPILER_ID,
    describe: fieldSceneRuleDescriptions, validate: validateFieldSceneRuleOverrides,
    encode: encodeFieldSceneRules, objects: fieldSceneRuleObjects, controls: mountFieldObjectControls,
    serializeField: serializeFieldSceneRule, validatePreimage: validateFieldSceneRulePreimage, documentView: true, legacyClosed: true})],
  ["battle-amount-scaling-service", Object.freeze({compilerId: BATTLE_AMOUNT_COMPILER_ID,
    describe: battleScalingFieldDescriptions, validate: validateBattleScalingFieldOverrides,
    encode: encodeBattleScalingFields, ...battleScalingFieldObjectCodec, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["char", Object.freeze({compilerId: NARRATIVE_GLYPHS_COMPILER_ID,
    describe: narrativeGlyphFieldDescriptions, validate: validateNarrativeGlyphFieldOverrides,
    documentScopes: narrativeGlyphDocumentScopes, fieldScope: narrativeGlyphFieldScope, materializeOnRead: true,
    encode: encodeNarrativeGlyphFields, objects: narrativeGlyphObjects,
    objectCount: narrativeGlyphObjectCount,
    serializeField: serializeNarrativeGlyphField, validatePreimage: validateNarrativeGlyphPreimage,
    controls: fieldObjectControls('char'),
    documentView: true, legacyClosed: true})],
  ["audio-driver-section", Object.freeze({compilerId: AUDIO_PERIOD_COMPILER_ID,
    describe: audioPeriodFieldDescriptions, validate: validateAudioPeriodFieldOverrides,
    encode: encodeAudioPeriodFields, objects: audioPeriodObjects, controls: mountFieldObjectControls,
    serializeField: serializeAudioPeriodField, validatePreimage: validateAudioPeriodPreimage,
    documentView: true, legacyClosed: true})],
  ["world-event", Object.freeze({compilerId: STORY_COMPILER_ID,
    describe: (document, {asset} = {}) => worldEventFieldDescriptions(document === undefined ? asset : document),
    validate: validateWorldEventFieldOverrides,
    encode: encodeWorldEventFields,
    objects: (document, {asset} = {}) => worldEventObjects(document === undefined ? asset : document),
    serializeField: serializeWorldEventField,
    validatePreimage: validateWorldEventPreimage, controls: mountFieldObjectControls,
    documentView: true, legacyClosed: true})],
  ["story-autonomous-script", Object.freeze({compilerId: STORY_COMPILER_ID,
    describe: (document, {asset} = {}) => storyScriptFieldDescriptions(document === undefined ? asset : document, "story-autonomous-script"),
    validate: validateStoryScriptFieldOverrides,
    encode: encodeStoryScriptFields, documentView: true, legacyClosed: true,
    objects: (document, {asset} = {}) => storyScriptObjects(document === undefined ? asset : document, "story-autonomous-script"),
    controls: mountFieldObjectControls})],
  ["story-interaction-script", Object.freeze({compilerId: STORY_COMPILER_ID,
    describe: (document, {asset} = {}) => storyScriptFieldDescriptions(document === undefined ? asset : document, "story-interaction-script"),
    validate: validateStoryScriptFieldOverrides,
    encode: encodeStoryScriptFields, documentView: true, legacyClosed: true,
    objects: (document, {asset} = {}) => storyScriptObjects(document === undefined ? asset : document, "story-interaction-script"),
    controls: mountFieldObjectControls})],
]);
for (const resourceId of SCENE_CONFIG_RESOURCE_IDS) {
  owners.set(resourceId, Object.freeze({...sceneConfigFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
// 每份族资源各是一个 u16 指针字段对象：清单里 16 份，逐个登记。
for (const resourceId of APPLICATION_CONFIG_FAMILY_RESOURCE_IDS) {
  owners.set(resourceId, Object.freeze({...applicationConfigFamilyFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
for (const resourceId of INVESTIGATION_COMMAND_RESOURCE_IDS) {
  owners.set(resourceId, Object.freeze({...investigationCommandFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
for (const resourceId of APPLICATION_COMMAND_RECORD_IDS) {
  owners.set(resourceId, Object.freeze({...applicationCommandRecordFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
for (const resourceId of UI_FACILITY_DATA_RESOURCE_IDS) {
  owners.set(resourceId, Object.freeze({...uiFacilityRecordFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
for (const resourceId of UI_FACILITY_ROUTINE_RESOURCE_IDS) {
  owners.set(resourceId, Object.freeze({...uiFacilityRoutineFieldOwner(resourceId),
    controls: mountFieldObjectControls}));
}
owners.set("field-map-query-service", Object.freeze({...fieldMapQueryTableOwner.fieldOwner,
  objects: fieldMapQueryTableOwner.objects,
  serializeField: fieldMapQueryTableOwner.serializeField,
  controls: mountFieldObjectControls}));
owners.set("runtime-workspace", runtimeWorkspaceFieldOwner);
owners.set("scene-actor-runtime", withStoryFarjumpGateFields(Object.freeze({...sceneActorRuntimeTableOwner.fieldOwner,
  objects: sceneActorRuntimeTableOwner.objects,
  serializeField: sceneActorRuntimeTableOwner.serializeField,
  controls: mountFieldObjectControls})));
owners.set("field-terrain-behavior-service", Object.freeze({...terrainWhitelistOwner.fieldOwner,
  objects: terrainWhitelistOwner.objects,
  serializeField: terrainWhitelistOwner.serializeField,
  controls: mountFieldObjectControls}));
// 队伍形象类型映射：6 个已发布 actor-type 引用，写入许可未发布。
owners.set(PARTY_ACTOR_TYPE_MAP_OWNER, Object.freeze({...partyActorTypeMapFieldOwner(),
  controls: mountFieldObjectControls}));
const CODE_SEGMENT_RESOURCE_IDS = Object.freeze([
  "attack-visual-runtime", "battle-damage-fraction-service", "battle-message-service", "battle-party-entity-sync-service",
  "battle-presentation-service", "raster-interrupt-runtime-service", "party-damage-and-defeat-service", "frame-nmi-runtime-service", "code-module",
  "facility-property-storage", "rental-vehicle-lifecycle-service", "role-equipment-service", "vehicle-equipment-service",
  "ui-tile-rectangle-service", "cutscene", "text-render-runtime", "terminal-presentation-service",
  "ui-item-session-service", "scene-transition-runtime", "palette-runtime-service", "ppu-transfer-runtime-service",
  "scene-actor-runtime", "scene-data-stream-service", "field-vehicle-boarding-service",
  "battle-enemy-group-state-service", "battle-target-context-service", "battle-target-hp-update-service",
  "eight-slot-inventory-service", "enemy-action-targeting-service", "field-exploration-runtime",
  "field-interaction-dispatch-service", "field-movement-execution-service", "field-movement-resolution-service",
  "field-rendering-service", "field-status-damage-service", "field-step-resolution-service",
  "field-terrain-behavior-service", "field-vehicle-acquisition-and-tow-service", "global-random-service",
  "indirect-control-transfer-service", "integer-arithmetic-service", "inventory-ui-working-set",
  "linear-memory-copy-service", "nametable-attribute-coordinate-service", "nearby-object-investigation-service",
  "new-game-bootstrap", "oam-object-rendering-service", "party-entity-selection-provider",
  "party-vehicle-selection-provider", "prg-bank-mapping-service", "prg-bank-window-restore-service",
  "ui-adventure-data-mode", "ui-equipment-control", "ui-party-overview", "ui-party-paired-selector",
  "ui-party-status", "ui-role-status", "ui-tool-inventory-control", "ui-vehicle-armor-tile-removal",
  "ui-vehicle-shells", "vehicle-field-driveability", "vehicle-sp-damage-service",
  "world-map-landmine-runtime-service", "world-map-random-investigation-reward",
  "application-command", "audio-driver-section", "battle-engine", "battle-result-script",
  "boot-presentation", "character-growth", "chr-bank-mapping-service", "battle-test-point",
  "item-entry", "encounter-trigger-runtime", "enemy-action-selection-service", "field-item-use",
  "field-scene-lifecycle-service", "party-healing-service", "ui-facility", "ui-name-entry", "ui-wanted",
  "application-command:33", "scene:6F", "scene:70", "scene:8D", "scene:D1",
  "ui-facility:teleport-terminal:routine:02",
  "ui-facility:teleport-terminal:routine:01",
  "ui-facility:frog-race:routine:01",
  "battle-enemy-palette-refresh-service", "inventory-discard-policy",
  "inventory-transfer-feedback", "story-action-handler", "vehicle-wash-service",
]);
owners.set("audio-opcode", Object.freeze({...audioOpcodeFieldOwner,
  controls: mountFieldObjectControls}));
for (const moduleId of BATTLE_SYSTEM_DATA_IDS) {
  owners.set(moduleId, Object.freeze({...battleSystemDataFieldOwner(moduleId),
    controls: mountFieldObjectControls}));
}
const codeSegmentIds = new Set(CODE_SEGMENT_RESOURCE_IDS);
owners.set('code-module', Object.freeze({...uiCommandDispatchFieldOwner, controls: mountFieldObjectControls}));
codeSegmentIds.add('code-module:application-dialogue-flow-vm');
codeSegmentIds.add('ui-vehicle-status');
codeSegmentIds.add('ui-party-paired-selector');
owners.set(TILE_ACTION_OWNER, sceneTileActionFieldOwner);
owners.set(WORLD_TIDE_OWNER, worldTideFieldOwner);
const registeredOwners = new Map([...new Set([...owners.keys(), ...codeSegmentIds])].map(resourceId => [
  resourceId, codeSegmentIds.has(resourceId)
    ? withCodeSegmentFields(resourceId, owners.get(resourceId)) : owners.get(resourceId),
]));
export const fieldOwnerIds = Object.freeze([...registeredOwners.keys()]);
export const hasFieldOwner = resourceId => registeredOwners.has(resourceId);
export function fieldOwner(resourceId) {
  const owner = registeredOwners.get(resourceId);
  if (!owner) throw new TypeError(`未登记字段 owner：${resourceId}`);
  return owner;
}
export const hasFieldDocumentView = resourceId => registeredOwners.get(resourceId)?.documentView === true;

export const closesLegacyResource = resourceId => registeredOwners.get(resourceId)?.legacyClosed === true;

// Offline import boundary: project documents become a validated field snapshot.
// Browser builds use DB-owned instances through readBuildFields instead.
export function encodeImportedFields(asset, original, dependencies = {}) {
  return encodeImportedDocumentFields(asset, original, fieldOwner(original?.resource_id), dependencies);
}

export function hasFieldObjects(resourceId, {controlsOnly = false} = {}) {
  const owner = registeredOwners.get(resourceId);
  return (typeof owner?.objects === "function" || typeof owner?.loadObjects === "function")
    && (!controlsOnly || typeof owner.controls === "function");
}

export function fieldObjectResourceIds(options) {return [...registeredOwners.keys()].filter(id => hasFieldObjects(id, options)).sort();}
