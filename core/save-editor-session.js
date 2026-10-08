// @editor-module 在页面装载期间准备同一份存档字段会话与 Working。
import {db} from "./project-db.js";
import {state} from "./state.js";
import {createSaveCurrentFieldObjects, openSaveWorkspace} from "./save-build.js";
import {saveVehicleAcquisitionTemplate, saveRentalVehicleTemplate} from "./save-codec.js";

let callbacks = {};
export function configureSaveEditorCallbacks(next) {callbacks = next;}
export const saveFields = createSaveCurrentFieldObjects(state, {
  rentalVehicleTemplate: presetId => saveRentalVehicleTemplate(presetId, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  vehicleAcquisitionTemplate: vehicle => saveVehicleAcquisitionTemplate(vehicle, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  onChanged: message => callbacks.onChanged?.(message),
  onError: error => {
    state.saveError = String(error?.message || error);
    callbacks.onError?.(error);
  },
});

let preparing = null;
async function prepareWorkspace({physical}) {
  if (!saveFields.loaded()) {
    if (state.saveByteMapLoading || state.saveByteMapAttempted) return;
    state.saveByteMapLoading = true;
    state.saveByteMapAttempted = true;
    try {
      await saveFields.load(physical ? {allPages: !state.saveRomInitialBytes} : {runtime: true});
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
    } finally {
      state.saveByteMapLoading = false;
    }
  }
  if (!saveFields.loaded()) return;
  if (physical && !saveFields.complete())
    await saveFields.load({allPages: true});
  // 存档深链须补齐目标页的语义记录。
  const selectedOffset = Number(state.saveSelectedOffset ?? 0);
  if (physical && saveFields.pendingPage(selectedOffset)) {
    await saveFields.load({pageOffsets: [selectedOffset]});
  }
  // 双槽初值只从项目 Origin 语义资产生成。
  if (!state.saveRomInitialBytes) {
    try {
      if (physical && !saveFields.complete()) await saveFields.load({allPages: true});
      const initial = await saveFields.initial(state.projectRepository);
      await openSaveWorkspace(state, initial, {
        message: "已生成",
      });
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
      state.saveMessage = `ROM 初始存档生成失败：${state.saveError}`;
    }
  }
}
export function prepareSaveEditorWorkspace({physical = ['save', 'bytemap-sram'].includes(state.view)} = {}) {
  if (!preparing) preparing = prepareWorkspace({physical}).finally(() => {preparing = null;});
  return preparing.then(() => physical && saveFields.loaded() && !saveFields.complete()
    ? prepareSaveEditorWorkspace({physical: true}) : undefined);
}
