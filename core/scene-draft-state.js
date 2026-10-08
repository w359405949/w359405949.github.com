// @editor-module 场景画布草稿与已保存字段的差异状态。
import {changedSceneActors} from "./scene-actors.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {state} from "./state.js";

function different(left, right) {
  if (left === undefined || right === undefined) return left !== right;
  return !canonicalJsonEqual(left, right);
}

export function refreshSceneDraftDirty() {
  state.sceneEncounterDirty = different(
    state.sceneEncounter,
    state.sceneOriginalEncounter,
  );
  state.sceneDirty = different(state.scene?.map, state.sceneOriginalMap)
    || different(state.sceneLogic, state.sceneOriginalLogic)
    || changedSceneActors().length > 0
    || different(state.vehicleDraft?.placement, state.vehicleOriginal?.placement)
    || state.sceneEncounterDirty;
  return state.sceneDirty;
}
