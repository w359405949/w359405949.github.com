// @editor-module 场景画布草稿经字段对象统一保存到 Working。
import {createAutoSave} from "./auto-save.js";
import {requireBrowserProjectRepository} from "./project-data.js";
import {db} from "./project-db.js";
import {sceneConfigFieldChanges} from "./scene-config-owner.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {saveSceneActors, sceneActorSaveSnapshot} from "./scene-actors.js";
import {refreshSceneDraftDirty} from "./scene-draft-state.js";
import {state} from "./state.js";

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function sceneResourceId(entry = state.sceneEntry) {
  return `scene:${Number(entry?.id || 0).toString(16).toUpperCase().padStart(2, "0")}`;
}

function sceneProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sessionMatches(payload) {
  return state.projectRepository === payload.repository
    && sceneProjectRevision() === payload.revision
    && state.project === payload.project
    && state.sceneDraftRepository === payload.repository
    && state.scene === payload.sceneDraft
    && state.sceneLogic === payload.logicDraft;
}

export function createSceneWorkbenchAutoSave({vehicleDirty, vehicleSnapshot, saveVehicle, updateState}) {
  function snapshot() {
    if (!state.scene || !state.sceneLogic || !state.sceneEntry) return null;
    const sceneChanged = !canonicalJsonEqual(state.scene.map, state.sceneOriginalMap)
      || !canonicalJsonEqual(state.sceneLogic, state.sceneOriginalLogic);
    const actors = sceneActorSaveSnapshot();
    const vehicles = vehicleDirty("player") ? vehicleSnapshot("player") : null;
    refreshSceneDraftDirty();
    if (!sceneChanged && !actors && !vehicles) return null;
    return {
      repository: requireBrowserProjectRepository(state),
      revision: sceneProjectRevision(),
      project: state.project,
      sceneDraft: state.scene,
      logicDraft: state.sceneLogic,
      resourceId: sceneResourceId(),
      scene: sceneChanged ? {map: cloneJson(state.scene.map), logic: cloneJson(state.sceneLogic)} : null,
      sceneBefore: sceneChanged ? {map: cloneJson(state.sceneOriginalMap), logic: cloneJson(state.sceneOriginalLogic)} : null,
      actors,
      vehicles,
    };
  }

  async function write(payload) {
    let completed = false;
    try {
      if (payload.actors) await saveSceneActors(payload.actors);
      if (payload.vehicles) await saveVehicle(payload.vehicles.viewId, payload.vehicles);
      if (payload.scene) {
        const objects = await db.getFieldObjects(payload.resourceId);
        const fields = objects.flatMap(object => object.fields);
        const document = {
          scene: {map: cloneJson(payload.scene.map)},
          logic: {layers: cloneJson(payload.scene.logic.layers)},
        };
        const changes = sceneConfigFieldChanges(fields, document, {previousDocument: {
          scene: {map: payload.sceneBefore.map}, logic: {layers: payload.sceneBefore.logic.layers},
        }});
        if (changes.length) await db.writeFields(changes, {expectedVersion: fields[0].version});
        const saved = await db.readResource(payload.resourceId);
        if (sessionMatches(payload)) {
          state.sceneAssetVersion = saved.version;
          state.sceneOriginalMap = cloneJson(saved.value.document.scene.map);
          state.sceneOriginalLogic = cloneJson(saved.value.document.logic);
          if (canonicalJsonEqual(state.scene.map, payload.scene.map))
            state.scene.map = cloneJson(state.sceneOriginalMap);
          if (canonicalJsonEqual(state.sceneLogic, payload.scene.logic))
            state.sceneLogic = cloneJson(state.sceneOriginalLogic);
        }
      }
      completed = true;
    } finally {
      if (sessionMatches(payload)) {
        refreshSceneDraftDirty();
        updateState();
        if (completed && state.sceneDirty) queue();
      }
    }
  }

  const autosave = createAutoSave(write, {
    onError: (error, sceneDraft) => {
      if (state.scene === sceneDraft) updateState(`保存失败：${error?.message || error}`);
    },
  });

  function queue() {
    const key = state.scene;
    if (!key || state.sceneDraftRepository !== state.projectRepository) return;
    try {
      const payload = snapshot();
      if (!payload) {
        autosave.cancel(key);
        state.sceneDirty = false;
        updateState();
        return;
      }
      updateState();
      autosave.commit(key, payload);
    } catch (error) {
      autosave.cancel(key);
      updateState(`保存失败：${error?.message || error}`);
    }
  }

  async function cancel() {
    const key = state.scene;
    if (key) autosave.cancel(key);
    await autosave.settled();
    if (key) autosave.cancel(key);
  }

  return Object.freeze({queue, cancel});
}
