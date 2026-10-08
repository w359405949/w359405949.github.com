// @editor-module 剧情预览注入当前仓库，页面只保留预览选项。
import {createSceneActionCore} from "../../core/scene-action-core.js";
import {state} from "../../core/state.js";
import {db} from "../../core/project-db.js";
import {peekActorAppearance} from "../../render/actor-atlas.js";
import {paintScenePreviewTiles} from '../../modules/scene/preview.js';
import {readSaveField, saveFieldBindings} from '../../core/save-codec.js';
import {playerTileFromSaveCamera} from '../../core/save-position.js';
import {sceneCameraCoordinate} from '../../core/story-camera.js';

const core = createSceneActionCore({readProject: () => state.project, database: db,
  repositoryIdentity: () => state.projectRepository, actorAppearance: peekActorAppearance});
export const storyVmCompilationCache = core.storyVmCompilationCache;
export const storyVmSequenceCompilationCache = core.storyVmSequenceCompilationCache;
export const storyBrowserVm = (...args) => core.storyBrowserVm(...args);
export const storyActorIsVisible = (...args) => core.storyActorIsVisible(...args);
export const storyVmEntryVariant = (...args) => core.storyVmEntryVariant(...args);
export const storyPartyMembers = (...args) => core.storyPartyMembers(...args);
export const storySnapshotActors = (...args) => core.storySnapshotActors(...args);
export const storyVmCurrentPrograms = (...args) => core.storyVmCurrentPrograms(...args);
export const storyVmBlockingUiResolver = (...args) => core.storyVmBlockingUiResolver(...args);
export const storyVmSemanticsMap = (...args) => core.storyVmSemanticsMap(...args);
export const storyAudioCommand = (...args) => core.storyAudioCommand(...args);
export const storyAudioControl = (...args) => core.storyAudioControl(...args);
export const storyVmAllActorLists = (...args) => core.storyVmAllActorLists(...args);
export const storyVmSequences = (...args) => core.storyVmSequences(...args);
export const storyVmStage = (...args) => core.storyVmStage(...args);
export const storyCompiledDialogueRuns = (...args) => core.storyCompiledDialogueRuns(...args);
export const buildStoryVmSequence = (...args) => core.buildStoryVmSequence(...args);

/** 剧情队伍槽优先取预览覆盖，其次取匹配存档，最后取人物初值。 */
export function storyPartySlotsForSequence(sequenceId, includePreview = true) {
  const key = String(sequenceId || "");
  const override = state.storyPartyPreviewSlots.get(key);
  const slots = override instanceof Set ? new Set(override) : new Set(storySavedRuntimeOverrides(key).partySlots
    || storyPartyMembers().filter(member => member.defaultRendered).map(member => member.slot));
  for (const member of includePreview ? state.storyBranchPreviewConditions.get(key)?.party || [] : []) {
    if (member.state === "absent") slots.delete(member.slot);
    else if (member.state !== undefined) slots.add(member.slot);
  }
  return slots;
}

/** 切换某位成员是否参与本段剧情的运行时分支与舞台渲染。 */
export function setStoryPartySlotForSequence(sequenceId, slot, rendered) {
  const key = String(sequenceId || "");
  const id = Number(slot);
  if (!key || !Number.isInteger(id) || id < 0) return;
  const slots = storyPartySlotsForSequence(key);
  if (rendered) slots.add(id);
  else slots.delete(id);
  state.storyPartyPreviewSlots.set(key, slots);
  const conditions = state.storyBranchPreviewConditions.get(key);
  if (conditions?.party?.some(member => member.slot === id)) {
    state.storyBranchPreviewConditions.set(key, {...conditions,
      party: conditions.party.map(member => member.slot === id ? {...member,
        state: rendered ? member.state === "dead" ? "dead" : "present" : "absent"} : member),
    });
  }
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
}

/** 供工作台、播放器和时间轴共用的 VM 入口覆盖。 */
export function storyPartyRuntimeOverrides(sequenceId, includePreview = true) {
  const saved = storySavedRuntimeOverrides(sequenceId);
  const vehicles = state.storyPartyPreviewVehicles.get(String(sequenceId));
  return {
    ...saved,
    waitAssumptions: [...(state.storyWaitPreviewAssumptions.get(String(sequenceId)) || [])],
    previewFieldInputs: state.storyPlayerPreviewInputs.get(String(sequenceId)),
    partySlots: [...storyPartySlotsForSequence(sequenceId, includePreview)]
      .sort((left, right) => left - right),
    partyMembers: (saved.partyMembers || storyPartyMembers()).map(member => vehicles?.has(member.slot)
      ? {...member, ridingVehicle: true, vehicleSlot: vehicles.get(member.slot)} : member),
    ...(includePreview && state.storyBranchPreviewConditions.has(String(sequenceId))
      ? {previewConditions: state.storyBranchPreviewConditions.get(String(sequenceId))} : {}),
  };
}

let savedRuntimeCache = null;
function storySavedRuntimeOverrides(sequenceId) {
  if (!['loaded', 'edited'].includes(state.saveCurrentSource) || !state.saveCurrentBytes || !state.saveByteMapDocument) return {};
  const sequence = core.storyVmSequences().find(row => row.id === sequenceId);
  const variant = core.storyVmAllActorLists().find(row => row.id === sequence?.entry_variant_id);
  const slot = state.savePageSlot || 1, prefix = `save.slot.${slot}.`;
  const read = field => readSaveField(state.saveCurrentBytes, prefix + field, state.saveByteMapDocument);
  const scene = read('scene_id');
  if (!variant?.scene_contexts?.some(context => context.scene_id === scene)) return {};
  const revision = ['character-initial-record', 'actor-visual', 'party-field-actor-type-map', 'vehicle-visual-selector']
    .map(id => db.fieldRevision(id)).join(':');
  if (savedRuntimeCache?.bytes === state.saveCurrentBytes && savedRuntimeCache.document === state.saveByteMapDocument
      && savedRuntimeCache.slot === slot && savedRuntimeCache.repository === state.projectRepository
      && savedRuntimeCache.revision === revision) return savedRuntimeCache.value;
  const x = read('camera_x'), y = read('camera_y'), player = playerTileFromSaveCamera(x, y);
  const partyMembers = storyPartyMembers().map(member => {
    const role = `role.${member.slug}.`, present = read(role + 'present');
    return {...member, defaultRendered: Boolean(present), status: read(role + 'status'),
      currentHp: read(role + 'current_hp'), level: read(role + 'level'),
      ridingVehicle: Boolean(present & 128), vehicleSlot: read(role + 'current_vehicle')};
  });
  const eventFlags = [...saveFieldBindings(state.saveByteMapDocument).keys()]
    .filter(id => id.startsWith(prefix + 'global_event_flag.') && readSaveField(state.saveCurrentBytes, id, state.saveByteMapDocument))
    .map(id => parseInt(id.split('.').at(-1), 16)).filter(id => id >= 8);
  const value = {playerMapX: player.x, playerMapY: player.y, playerDirection: 'up', cameraTileOriginX: sceneCameraCoordinate(scene, x),
    cameraTileOriginY: sceneCameraCoordinate(scene, y), partyMembers, partySlots: partyMembers.filter(member => member.defaultRendered).map(member => member.slot), eventFlags};
  savedRuntimeCache = {bytes: state.saveCurrentBytes, document: state.saveByteMapDocument,
    repository: state.projectRepository, slot, revision, value};
  return value;
}

export function setStoryPartyVehicleForSequence(sequenceId, slot, vehicleSlot) {
  const vehicles = new Map(state.storyPartyPreviewVehicles.get(String(sequenceId)) || []);
  if (vehicleSlot === null) vehicles.delete(Number(slot));
  else if (Number.isInteger(vehicleSlot) && vehicleSlot >= 0 && vehicleSlot < 8)
    vehicles.set(Number(slot), vehicleSlot);
  else throw new TypeError("剧情预览战车槽无效");
  state.storyPartyPreviewVehicles.set(String(sequenceId), vehicles);
  storyVmCompilationCache.clear();
  storyVmSequenceCompilationCache.clear();
}

export function drawStoryFieldTileOverlay(canvas, snapshot, context, stage) {
  return paintScenePreviewTiles(canvas, {tiles: snapshot.fieldTiles, sceneId: snapshot.sceneId,
    cameraX: Number(snapshot.cameraTileOriginX || 0), cameraY: Number(snapshot.cameraTileOriginY || 0),
    scrollOffsetY: Number(snapshot.screenScrollOffsetY || 0), animationPhase: snapshot.backgroundAnimationPhase,
    paletteDecrement: Number(snapshot.fieldPresentation?.paletteDecrement) || 0,
    backgroundFlash: Boolean(snapshot.fieldPresentation?.backgroundFlash), context, stage});
}
