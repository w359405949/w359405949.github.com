// @editor-module 衔接项目 ROM 初值与当前存档，恢复和持久化存档 Working。
// Browser SAVE build companion for the ROM linker.
//
// The project repository owns the original ROM semantic assets. The unified
// byte map owns every SRAM address and codec. This module only joins those two
// authorities and restores/persists the one current save through Working.

import {SaveCodecError, changedSaveOffsets, createRomInitialSave, equipSaveVehicleCarryMain,
  normalizeSaveDraftFieldValue, patchSaveFields,
  readSaveField, readSaveBoundField, saveAnnotations, saveCurrentBytes, saveCurrentDrafts, saveCurrentValue,
  saveAddressSpace, saveFieldBindings, setSaveSlotActivation, getSaveSlotStatus,
  recomputeSaveChecksums, applySaveCurrentChanges, saveVehicleAcquisitionField, saveVehicleAcquisitionFlag,
  saveVehicleAcquired, setSaveVehicleAcquisition, fillSaveRentalVehicle} from "./save-codec.js";
import {createAutoSave} from "./auto-save.js";
import {decodeFixedRuntimeText, fixedRuntimeTextBytes, saveNameTextSource} from "./text-record-project.js";
import {createSavePhysicalFieldObjects, projectSavePhysicalAnnotations}
  from "./save-physical-field-objects.js";

export const SAVE_BUILD_BLOB_PREFIX = "save-build:";
export const SAVE_BUILD_MEDIA_TYPE = "application/octet-stream";

export function saveWorkspaceChanged(state_) {
  return state_.saveRomInitialBytes instanceof Uint8Array
    && state_.saveCurrentBytes instanceof Uint8Array
    && (Boolean(Object.keys(state_.saveDraftFields || {}).length)
      || !equalBytes(state_.saveRomInitialBytes, state_.saveCurrentBytes));
}

const workingQueues = new WeakMap();
const workspaceListeners = new WeakMap();
const workspaceBindings = new WeakMap();

function notifySaveWorkspace(state_) {
  for (const binding of workspaceBindings.get(state_) || []) {
    const target = binding.target.deref();
    if (!target || target.isConnected === false) {workspaceBindings.get(state_).delete(binding); continue;}
    const value = JSON.stringify([binding.object.value, binding.object.edited]);
    if (value === binding.value) continue;
    binding.value = value;
    try {binding.render(target);} catch (error) {console.error(error);}
  }
  workspaceListeners.get(state_)?.();
}

function applySaveChanges(state_, current, previous, next, fieldIds = []) {
  const value = applySaveCurrentChanges(current, previous, next, state_.saveByteMapDocument, fieldIds);
  if (state_.saveByteMapDocument && !equalBytes(Uint8Array.from(value.bytes), Uint8Array.from(next.bytes))) {
    let bytes = recomputeSaveChecksums(Uint8Array.from(value.bytes), state_.saveByteMapDocument);
    for (const slot of [1, 2]) bytes = restoreInitialSlotMetadata(bytes, state_.saveRomInitialBytes, state_.saveByteMapDocument, slot);
    value.bytes = Array.from(bytes);
  }
  return value;
}

function publishSaveValue(state_, value, initial) {
  state_.saveCurrentBytes = saveCurrentBytes(value, initial);
  state_.saveDraftFields = saveCurrentDrafts(value, state_.saveByteMapDocument);
  state_.saveCurrentName = value.name;
  state_.saveCurrentSource = saveWorkspaceChanged(state_) ? "edited" : "rom-initial";
}

function saveWorkingQueue(state_) {
  const repository = state_.projectRepository;
  if (!repository?.resolveSaveCurrent || !repository?.saveSaveCurrent) {
    throw new Error("项目仓库尚未提供存档 Working");
  }
  if (!workingQueues.has(repository)) {
    const session = {version: undefined, value: undefined, error: null, queue: null, intents: new Map(), sequence: 0};
    session.queue = createAutoSave(async ({original, value, previousValue, replace, intents, onError}) => {
      try {
        const saved = await repository.saveSaveCurrent(original, value, {
          previousValue: replace ? undefined : previousValue,
          applyChanges: (current, previous, next) => applySaveChanges(state_, current, previous, next, intents.map(([id]) => id)),
        });
        session.version = saved.version;
        session.value = saved.value;
        for (const [id, sequence] of intents) if (session.intents.get(id) === sequence) session.intents.delete(id);
        if (state_.projectRepository === repository) {
          const draft = saveCurrentValue(state_.saveCurrentBytes, state_.saveCurrentName, state_.saveDraftFields);
          publishSaveValue(state_, applySaveChanges(state_, saved.value, value, draft, [...session.intents.keys()]), state_.saveRomInitialBytes);
          notifySaveWorkspace(state_);
        }
        session.error = null;
      } catch (error) {
        session.error = error;
        onError?.(error);
        throw error;
      }
    });
    workingQueues.set(repository, session);
    repository.subscribeWorking?.(() => {
      if (state_.projectRepository !== repository || !state_.saveRomInitialBytes || session.queue.busy) return;
      openSaveWorkspace(state_, state_.saveRomInitialBytes).then(() => notifySaveWorkspace(state_), error => {
        session.error = error;
        state_.saveError = error.message;
        notifySaveWorkspace(state_);
      });
    });
  }
  return workingQueues.get(repository);
}

/**
 * 按 `field_id` 把当前存档的字段恢复成 ROM 初值，并走同一份 Working 排队。
 *
 * 这是存档域自己的「重置」出口：调用方只报 `field_id`，编解码、槽标记与校验和、
 * 排队与失败上报都留在这里。未知 `field_id`、缺字节地图、缺初值或缺当前存档
 * 一律抛错——不静默跳过，也不拿别的字段顶替。
 */
function resetSaveFields(state_, fieldIds, {onError = null} = {}) {
  if (!Array.isArray(fieldIds) || !fieldIds.length) {
    throw new Error("至少需要一个可还原的存档 field_id");
  }
  const byteMap = state_?.saveByteMapDocument;
  const initial = state_?.saveRomInitialBytes;
  const current = state_?.saveCurrentBytes;
  if (!byteMap) throw new Error("存档字节地图尚未就绪");
  if (!(initial instanceof Uint8Array)) throw new Error("ROM 初始存档尚未就绪");
  if (!(current instanceof Uint8Array)) throw new Error("当前存档尚未打开");
  const fields = saveFieldBindings(byteMap);
  const edits = {};
  const drafts = {...state_.saveDraftFields};
  const slots = new Set();
  for (const fieldId of fieldIds) {
    const record = fields.get(fieldId);
    if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
    const original = readSaveField(initial, fieldId, byteMap);
    const writable = record.status === "exact" && record.binding?.editable === true;
    if (record.binding?.derivation === "vehicle-equipped-bits"
        || record.binding?.derivation === "vehicle-mount-permission-bits"
        || record.binding?.derivation === "vehicle-equipment-damage-bit") {
      delete drafts[fieldId];
    } else if (writable) {
      const mask = record.binding?.allowed_changed_mask;
      edits[fieldId] = Number.isInteger(mask)
        ? (readSaveField(current, fieldId, byteMap) & ~mask) | (original & mask)
        : original;
    } else {
      const raw = readSaveField(current, fieldId, byteMap);
      if (raw instanceof Uint8Array && original instanceof Uint8Array
          ? raw.length === original.length && raw.every((byte, index) => byte === original[index])
          : Object.is(raw, original)) delete drafts[fieldId];
      else drafts[fieldId] = original instanceof Uint8Array ? [...original] : original;
    }
    const slot = Number(record.binding?.slot);
    if (writable && (slot === 1 || slot === 2)) slots.add(slot);
  }
  let bytes = Object.keys(edits).length ? patchSaveFields(current, edits, {byteMap}) : current.slice();
  for (const slot of slots) bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
  state_.saveCurrentBytes = bytes;
  state_.saveDraftFields = drafts;
  if (!saveWorkspaceChanged(state_)) {
    state_.saveCurrentSource = "rom-initial";
    state_.saveCurrentName = "metalmaxcn-current.sav";
  } else {
    state_.saveCurrentSource = "edited";
  }
  queueSaveWorking(state_, {onError: onError ?? undefined, fieldIds});
  return bytes;
}

export function resetSaveWorkspace(state_, {onError = null} = {}) {
  if (!(state_?.saveRomInitialBytes instanceof Uint8Array)) {
    throw new Error("ROM 初始存档尚未就绪");
  }
  if (!(state_?.saveCurrentBytes instanceof Uint8Array)) {
    throw new Error("当前存档尚未打开");
  }
  state_.saveCurrentBytes = state_.saveRomInitialBytes.slice();
  state_.saveDraftFields = {};
  state_.saveCurrentName = "metalmaxcn-current.sav";
  state_.saveCurrentSource = "rom-initial";
  queueSaveWorking(state_, {onError: onError ?? undefined, replace: true});
  return state_.saveCurrentBytes;
}

/**
 * 整槽与 ROM 初值逐字节相同时，把该槽目录里的标记与校验和放回初值：
 * 否则「恢复成没动过」的槽会被标成有效存档。
 */
function restoreInitialSlotMetadata(bytes, initial, byteMap, slot) {
  const range = saveAnnotations(byteMap).find(record =>
    record?.address?.space === "sram" && record.range_id === `save.slot.${slot}.record`);
  if (!range) throw new SaveCodecError(`存档字节地图缺少 save.slot.${slot}.record 范围`);
  const {offset, end_exclusive: end} = range.address;
  if (!Number.isInteger(offset) || !Number.isInteger(end)) {
    throw new SaveCodecError(`存档槽 ${slot} 的范围地址无效`);
  }
  for (let at = offset; at < end; at += 1) if (bytes[at] !== initial[at]) return bytes;
  const fields = saveFieldBindings(byteMap);
  const output = new Uint8Array(bytes);
  for (const name of ["valid_marker", "checksum_low", "checksum_high"]) {
    const record = fields.get(`save.directory.slot.${slot}.${name}`);
    if (!record) throw new SaveCodecError(`存档字节地图缺少 save.directory.slot.${slot}.${name}`);
    const {offset: at, end_exclusive: to} = record.address ?? {};
    if (!Number.isInteger(at) || !Number.isInteger(to)) {
      throw new SaveCodecError(`save.directory.slot.${slot}.${name} 的地址无效`);
    }
    output.set(initial.slice(at, to), at);
  }
  return output;
}

/** 存档当前值的字段对象入口，字段身份由统一字节地图声明。 */
export function createSaveCurrentFieldObjects(state_, {onChanged = null, onError = null,
  vehicleAcquisitionTemplate = null, rentalVehicleTemplate = null} = {}) {
  if (onChanged) workspaceListeners.set(state_, () => onChanged(null));
  let physicalDocument = null;
  let physicalResult = null;
  const complete = () => {
    const document_ = state_.saveByteMapDocument;
    if (document_?.schema === 'metalmaxcn.save-runtime-fields') return false;
    const bank = document_?.loaded_bank_shards?.[0];
    if (!bank) return Array.isArray(document_?.annotations);
    return Array.isArray(document_.loaded_record_pages)
      && document_.loaded_record_pages.length === bank.record_pages.length;
  };
  const pendingPage = offset => {
    const document_ = state_.saveByteMapDocument;
    const bank = document_?.loaded_bank_shards?.[0];
    if (!bank || !Array.isArray(bank.record_pages)) return false;
    const descriptor = bank.record_pages.find(page =>
      Number(page?.address?.offset) <= offset
        && offset < Number(page?.address?.end_exclusive));
    if (!descriptor) return false;
    return !(document_.loaded_record_pages || []).some(page =>
      page.space === descriptor.space && page.bank === descriptor.bank
        && page.page === descriptor.page);
  };
  const load = async ({runtime = false, ...options} = {}) => {
    if (runtime) {
      const {db} = await import('./project-db.js');
      state_.saveByteMapDocument = await db.getDocument('project.save.fields');
      return;
    }
    const {loadByteMapSpace} = await import("./physical-field-object-document.js");
    state_.saveByteMapDocument = await loadByteMapSpace("sram", {
      offset: Number(state_.saveSelectedOffset ?? 0), ...options,
    });
  };
  let cachedDocument = null;
  let cachedRecords = null;
  const fieldObjects = new Map();
  const records = () => {
    const document_ = state_.saveByteMapDocument;
    if (document_ !== cachedDocument || !cachedRecords) {
      cachedDocument = document_;
      cachedRecords = saveFieldBindings(document_);
      fieldObjects.clear();
    }
    return cachedRecords;
  };
  const recordOf = fieldId => {
    const record = records().get(fieldId);
    if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
    return record;
  };
  const emit = message => onChanged?.(message);
  let acquisitionState = null, acquisitionDocument = null;
  const acquisitionStatuses = new Map();
  const vehicleAcquired = (slot, vehicle) => {
    if (acquisitionState !== state_.saveCurrentBytes || acquisitionDocument !== state_.saveByteMapDocument) {
      acquisitionState = state_.saveCurrentBytes;
      acquisitionDocument = state_.saveByteMapDocument;
      acquisitionStatuses.clear();
    }
    const key = `${slot}:${vehicle}`;
    const rental = vehicle >= 8 ? readSaveField(acquisitionState,
      `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`, acquisitionDocument) : null;
    if (!acquisitionStatuses.has(key)) acquisitionStatuses.set(key,
      vehicle < 8 ? saveVehicleAcquired(acquisitionState, slot, vehicle, acquisitionDocument)
        : Number.isInteger(rental) && rental >= 8 && rental <= 17);
    return acquisitionStatuses.get(key);
  };
  const writeFields = (edits, {message = null} = {}) => {
    const initial = state_.saveRomInitialBytes;
    const current = state_.saveCurrentBytes;
    const byteMap = state_.saveByteMapDocument;
    if (!(initial instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    const writable = {}, drafts = {...state_.saveDraftFields}, slots = new Set();
    let acquisitionBytes = current;
    for (const [fieldId, value] of Object.entries(edits || {})) {
      const acquisition = saveVehicleAcquisitionFlag(fieldId);
      if (!acquisition) continue;
      const acquired = Boolean(normalizeSaveDraftFieldValue(recordOf(fieldId), value));
      if (saveVehicleAcquired(acquisitionBytes, acquisition.slot, acquisition.vehicle, byteMap) === acquired) continue;
      acquisitionBytes = setSaveVehicleAcquisition(acquisitionBytes, initial, {
        ...acquisition, acquired, byteMap,
        template: vehicleAcquisitionTemplate?.(acquisition.vehicle),
      });
      slots.add(acquisition.slot);
      for (const draftId of Object.keys(drafts)) {
        const covered = saveVehicleAcquisitionField(draftId);
        if ((covered?.slot === acquisition.slot && covered.vehicle === acquisition.vehicle)
            || draftId === fieldId
            || draftId === `save.slot.${acquisition.slot}.entity_scene_object_slots`
            || draftId.startsWith(`save.slot.${acquisition.slot}.field_object.${acquisition.vehicle}.`)
            || (/^save\.slot\.[12]\.role\.(hunter|mechanic|soldier)\.current_vehicle$/.test(draftId)
              && Number(recordOf(draftId).binding?.slot) === acquisition.slot
              && readSaveField(current, draftId, byteMap) !== readSaveField(acquisitionBytes, draftId, byteMap)))
          delete drafts[draftId];
      }
    }
    for (const [fieldId, value] of Object.entries(edits || {})) {
      if (saveVehicleAcquisitionFlag(fieldId)) continue;
      const record = recordOf(fieldId);
      const acquisition = saveVehicleAcquisitionField(fieldId);
      if (acquisition && !saveVehicleAcquired(acquisitionBytes, acquisition.slot,
        acquisition.vehicle, byteMap)) throw new SaveCodecError("未取得战车的模板字段只读");
      if (record.binding?.derivation === "vehicle-equipped-bits"
          || record.binding?.derivation === "vehicle-mount-permission-bits"
          || record.binding?.derivation === "vehicle-equipment-damage-bit") {
        throw new SaveCodecError(`派生存档字段不可独立编辑：${fieldId}`);
      }
      if (record.status === "exact" && record.binding?.editable === true) {
        writable[fieldId] = value;
        delete drafts[fieldId];
        if ([1, 2].includes(Number(record.binding?.slot))) slots.add(Number(record.binding.slot));
      } else {
        const normalized = normalizeSaveDraftFieldValue(record, value);
        const raw = readSaveField(current, fieldId, byteMap);
        const unchanged = normalized instanceof Uint8Array && raw instanceof Uint8Array
          ? normalized.length === raw.length && normalized.every((byte, index) => byte === raw[index])
          : Object.is(normalized, raw);
        if (unchanged) delete drafts[fieldId];
        else drafts[fieldId] = normalized instanceof Uint8Array ? [...normalized] : normalized;
      }
    }
    let bytes = Object.keys(writable).length
      ? patchSaveFields(acquisitionBytes, writable, {byteMap}) : acquisitionBytes.slice();
    for (const fieldId of Object.keys(drafts)) {
      if (["vehicle-equipped-bits", "vehicle-mount-permission-bits",
        "vehicle-equipment-damage-bit"].includes(
        records().get(fieldId)?.binding?.derivation))
        delete drafts[fieldId];
    }
    for (const slot of slots) bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    if (!saveWorkspaceChanged(state_)) {
      state_.saveCurrentSource = "rom-initial";
      state_.saveCurrentName = "metalmaxcn-current.sav";
    } else state_.saveCurrentSource = "edited";
    queueSaveWorking(state_, {onError, fieldIds: Object.keys(edits || {})});
    emit(message);
    return bytes;
  };
  const resetFields = (fieldIds, {message = null} = {}) => {
    if (fieldIds.some(saveVehicleAcquisitionFlag)) {
      const edits = Object.fromEntries(fieldIds.map(id => [id,
        readSaveField(state_.saveRomInitialBytes, id, state_.saveByteMapDocument)]));
      return writeFields(edits, {message});
    }
    for (const id of fieldIds) {
      const acquisition = saveVehicleAcquisitionField(id);
      if (acquisition && !saveVehicleAcquired(state_.saveCurrentBytes, acquisition.slot,
        acquisition.vehicle, state_.saveByteMapDocument))
        throw new SaveCodecError("未取得战车的模板字段只读");
    }
    const bytes = resetSaveFields(state_, fieldIds, {onError});
    emit(message);
    return bytes;
  };
  const fillRentalVehicle = ({slot, vehicle, presetId}, {message = null} = {}) => {
    const current = state_.saveCurrentBytes;
    if (!(state_.saveRomInitialBytes instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new SaveCodecError("ROM 初始存档尚未就绪，不能填充出租战车");
    const template = rentalVehicleTemplate?.(presetId);
    const byteMap = state_.saveByteMapDocument;
    const bytes = fillSaveRentalVehicle(current, {slot, vehicle, presetId, template, byteMap});
    const drafts = {...state_.saveDraftFields};
    const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
    for (const [id, record] of records()) {
      const initialized = id === `${prefix}name_codes`
        || (id.startsWith(prefix) && Object.hasOwn(template, id.slice(prefix.length)))
        || id === `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`;
      const {offset, end_exclusive: end} = record.address || {};
      if (initialized || (Number.isInteger(offset) && current.slice(offset, end)
        .some((value, index) => value !== bytes[offset + index]))) delete drafts[id];
    }
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    state_.saveCurrentSource = "edited";
    queueSaveWorking(state_, {onError});
    emit(message);
    return bytes;
  };
  const equipVehicleCarryMain = ({slot, vehicle, column, items}, {message = null} = {}) => {
    if (vehicle < 8 && !vehicleAcquired(slot, vehicle))
      throw new SaveCodecError("未取得战车的模板字段只读");
    const initial = state_.saveRomInitialBytes;
    const current = state_.saveCurrentBytes;
    const byteMap = state_.saveByteMapDocument;
    if (!(initial instanceof Uint8Array) || !(current instanceof Uint8Array)) {
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    }
    let bytes = equipSaveVehicleCarryMain(current, {slot, vehicle, column, items, byteMap});
    bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
    const drafts = {...state_.saveDraftFields};
    const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
    for (const name of ["main_gun", "sub_gun", `generic_${column + 1}`]) {
      delete drafts[`${prefix}equipment.${name}`];
      delete drafts[`${prefix}equipment_state.${name}`];
    }
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    state_.saveCurrentSource = saveWorkspaceChanged(state_) ? "edited" : "rom-initial";
    if (state_.saveCurrentSource === "rom-initial") {
      state_.saveCurrentName = "metalmaxcn-current.sav";
    }
    queueSaveWorking(state_, {onError});
    emit(message);
    return bytes;
  };
  const activateSlot = (slot, active, {message = null} = {}) => {
    const current = state_.saveCurrentBytes;
    if (!(state_.saveRomInitialBytes instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    state_.saveCurrentBytes = setSaveSlotActivation(current, slot, active, state_.saveByteMapDocument);
    queueSaveWorking(state_, {onError});
    emit(message);
    return state_.saveCurrentBytes;
  };
  const resetSlotActivation = (slot, {message = null} = {}) => {
    const fieldId = `save.directory.slot.${slot}.valid_marker`;
    const original = readSaveField(state_.saveRomInitialBytes, fieldId, state_.saveByteMapDocument);
    return activateSlot(slot, original === recordOf(fieldId).binding?.expected, {message});
  };
  const objectFromRecord = (fieldId, record) => {
    const acquisition = saveVehicleAcquisitionField(fieldId);
    const acquisitionPending = () => acquisition && !vehicleAcquired(acquisition.slot, acquisition.vehicle);
    const value = () => !["vehicle-equipped-bits", "vehicle-mount-permission-bits",
      "vehicle-equipment-damage-bit"].includes(
      record.binding?.derivation)
      && Object.hasOwn(state_.saveDraftFields || {}, fieldId)
      ? state_.saveDraftFields[fieldId]
      : readSaveBoundField(state_.saveCurrentBytes, record, state_.saveByteMapDocument);
    const original = () => readSaveBoundField(state_.saveRomInitialBytes, record, state_.saveByteMapDocument);
    const object = {
      id: fieldId, resourceId: "save-current", role: `field:${fieldId}`,
      fieldId, binding: record.binding, status: record.status,
      physical: Object.freeze({...record.address}),
      fieldMeaning: record.field?.meaning || "",
      valueMeaning: record.value_meaning || "",
      meaning: record.meaning || "",
      semanticDomain: record.semantic_domain || "",
      semanticCategory: record.semantic_category || "",
      eventCategory: record.event_category || "",
      destinationReference: record.destination_reference || null,
      displayPriority: record.resource_address_bindings?.[0]?.display_priority ?? 999,
      get value() {return value();},
      get acquisitionPending() {return Boolean(acquisitionPending());},
      get statusUnavailable() {
        return record.binding?.excluded_raw_value !== undefined
          && state_.saveCurrentBytes?.[record.address.offset] === record.binding.excluded_raw_value;
      },
      get displayValue() {return acquisitionPending()
        ? vehicleAcquisitionTemplate?.(acquisition.vehicle)?.[acquisition.suffix] : value();},
      get defaultValue() {return original();},
      get edited() {
        const left = value(), right = original();
        return Array.isArray(left) || left instanceof Uint8Array
          ? JSON.stringify([...left]) !== JSON.stringify([...right]) : !Object.is(left, right);
      },
      set(next, options) {return writeFields({[fieldId]: next}, options);},
      reset(options) {return resetFields([fieldId], options);},
      bind(target, render) {
        if (!workspaceBindings.has(state_)) workspaceBindings.set(state_, new Set());
        const binding = {target: new WeakRef(target), render, object: this,
          value: JSON.stringify([this.value, this.edited])};
        workspaceBindings.get(state_).add(binding);
        render(target);
        return () => workspaceBindings.get(state_)?.delete(binding);
      },
      async mount(host) {
        const {mountSaveCurrentFieldObject} = await import("../ui/field-object-editor.js");
        return mountSaveCurrentFieldObject(host, this);
      },
    };
    if (record.binding?.text_codec === "metalmaxcn-runtime-text") Object.defineProperties(object, {
      nameText: {get() {
        return decodeFixedRuntimeText(saveNameTextSource(object, Uint8Array.from(object.displayValue)),
          state_.project?.text_record_encoding).text;
      }},
      setNameText: {value(text, options) {
        const encoded = fixedRuntimeTextBytes(text, saveNameTextSource(object, Uint8Array.from(value())),
          state_.project?.text_record_encoding);
        if (!encoded.ok) throw new SaveCodecError(`${encoded.reason}${encoded.unsupported?.length
          ? `：${encoded.unsupported.join(" ")}` : ""}`);
        return writeFields({[fieldId]: encoded.bytes}, options);
      }},
    });
    return Object.freeze(object);
  };
  const object = fieldId => {
    const record = recordOf(fieldId);
    if (!fieldObjects.has(fieldId)) fieldObjects.set(fieldId, objectFromRecord(fieldId, record));
    return fieldObjects.get(fieldId);
  };
  const slotStatus = slot => getSaveSlotStatus(state_.saveCurrentBytes, slot,
    state_.saveByteMapDocument);
  const slotStatusFor = (bytes, slot) => getSaveSlotStatus(bytes, slot,
    state_.saveByteMapDocument);
  const all = (prefix = "") => [...records()]
    .filter(([fieldId]) => fieldId.startsWith(prefix))
    .map(([fieldId]) => object(fieldId));
  const physical = () => {
    if (!complete()) throw new Error("存档物理字段对象需要完整 SRAM 注解");
    if (physicalDocument !== state_.saveByteMapDocument || !physicalResult) {
      physicalDocument = state_.saveByteMapDocument;
      physicalResult = createSavePhysicalFieldObjects(physicalDocument, all(), state_);
    }
    return physicalResult;
  };
  const projectAnnotations = () => complete()
    ? projectSavePhysicalAnnotations(state_.saveByteMapDocument, physical())
    : Array(state_.saveCurrentBytes?.length || Number(state_.saveByteMapDocument?.address_spaces
      ?.find(space => space.id === "sram")?.length) || 0).fill(null);
  const find = fieldId => {
    const record = records().get(fieldId);
    return record ? object(fieldId) : null;
  };
  return Object.freeze({object, find, all, physical, projectAnnotations,
    rangeViews: () => complete() ? physical().rangeViews : [],
    rangeView: rangeId => complete()
      ? physical().rangeViews.find(view => view.range_id === rangeId) || null : null,
    rangesAt: offset => {
      if (!complete()) return [];
      const catalog = physical();
      return catalog.rangesByObject.get(catalog.byByte[offset])?.filter(view =>
        view.address.offset <= offset && offset < view.address.end_exclusive) || [];
    },
    space: () => saveAddressSpace(state_.saveByteMapDocument),
    loaded: () => Boolean(state_.saveByteMapDocument),
    initial: repository => createProjectInitialSave(repository, state_.saveByteMapDocument),
    changedOffsets: (bytes = state_.saveCurrentBytes) => changedSaveOffsets(
      state_.saveRomInitialBytes, bytes, state_.saveByteMapDocument),
    writeFields, resetFields, fillRentalVehicle, equipVehicleCarryMain, activateSlot, resetSlotActivation,
    slotStatus, slotStatusFor, vehicleAcquired, complete, pendingPage, load,
    ready: () => (complete() || state_.saveByteMapDocument?.schema === 'metalmaxcn.save-runtime-fields')
      && state_.saveRomInitialBytes instanceof Uint8Array
      && state_.saveCurrentBytes instanceof Uint8Array,
    loadedPageCount: () => state_.saveByteMapDocument?.loaded_record_pages?.length || 0,
    addressLoaded: offset => (state_.saveByteMapDocument?.loaded_record_pages || []).some(page =>
      offset >= page.address.offset && offset < page.address.end_exclusive),
    changedByteCount: () => changedSaveOffsets(state_.saveRomInitialBytes,
      state_.saveCurrentBytes, state_.saveByteMapDocument).length});
}

const openingSaveFields = new WeakMap();

export async function ensureSaveCurrentFieldObjects(state_, fields = createSaveCurrentFieldObjects(state_)) {
  if (fields.ready()) return fields;
  const repository = state_.projectRepository;
  const pending = openingSaveFields.get(repository);
  if (pending) {
    await pending;
    return fields;
  }
  const opening = (async () => {
    if (!fields.complete()) await fields.load({runtime: true});
    const initial = await fields.initial(repository);
    if (state_.projectRepository !== repository) throw new Error("项目已切换，停止载入上一项目的存档");
    await openSaveWorkspace(state_, initial);
  })();
  openingSaveFields.set(repository, opening);
  try {await opening;} finally {openingSaveFields.delete(repository);}
  return fields;
}

/** Persist the one current buffer, irrespective of which page edited it. */
export function queueSaveWorking(state_, {onError, replace = state_.saveCurrentSource === "loaded", fieldIds = []} = {}) {
  if (!state_.saveRomInitialBytes || !state_.saveCurrentBytes) return;
  const session = saveWorkingQueue(state_);
  for (const id of fieldIds) session.intents.set(id, ++session.sequence);
  session.queue.commit("current", {
    original: saveCurrentValue(state_.saveRomInitialBytes),
    value: saveCurrentValue(state_.saveCurrentBytes, state_.saveCurrentName,
      state_.saveDraftFields),
    previousValue: session.value ?? saveCurrentValue(state_.saveRomInitialBytes),
    replace,
    intents: [...session.intents],
    onError,
  });
}

async function flushSaveWorking(state_) {
  const session = workingQueues.get(state_.projectRepository);
  await session?.queue.flush();
  if (session?.error) throw session.error;
}

/** Restore Working before exposing the shared workspace to any consumer. */
export async function openSaveWorkspace(state_, initial, options = {}) {
  const repository = state_.projectRepository;
  const session = saveWorkingQueue(state_);
  await flushSaveWorking(state_);
  const resolved = await repository.resolveSaveCurrent(saveCurrentValue(initial));
  if (state_.projectRepository !== repository) throw new Error("项目已切换，停止载入上一项目的存档");
  session.version = resolved.version;
  session.value = resolved.value;
  state_.saveRomInitialBytes = initial.slice();
  publishSaveValue(state_, resolved.value, initial);
  const current = synchronizeSaveWorkspace(state_, initial, options);
  return current;
}

function originalDocument(resolved, resourceId) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== resourceId ||
      !asset.document || typeof asset.document !== "object" ||
      Array.isArray(asset.document)) {
    throw new Error(`${resourceId}: 当前项目缺少有效的语义资产`);
  }
  return asset.document;
}

/** Encode both slots from the project's immutable original ROM assets. */
async function createProjectInitialSave(repository, byteMap) {
  if (!repository || typeof repository.getOriginal !== "function") {
    throw new TypeError("生成存档需要项目 Original 资源读取入口");
  }
  const [characters, vehicles, textSlots] = await Promise.all([
    repository.getOriginal("character-initial-record"),
    repository.getOriginal("vehicle-preset"),
    repository.getOriginal("fixed-text-slot"),
  ]);
  return createRomInitialSave(byteMap, {
    characters: originalDocument(characters, "character-initial-record"),
    vehicles: originalDocument(vehicles, "vehicle-preset"),
    textSlots: originalDocument(textSlots, "fixed-text-slot"),
  });
}

/** Build-time save field operations retain the physical document inside the field layer. */
export async function prepareSaveBuildFieldObjects(repository, {originalRepository = repository} = {}) {
  const {db} = await import('./project-db.js');
  const byteMap = await db.getDocument('project.save.fields');
  const initialSave = await createProjectInitialSave(originalRepository, byteMap);
  return Object.freeze({
    initialSave,
    async openCurrent(state_) {
      state_.saveByteMapDocument = byteMap;
      return openSaveWorkspace(state_, initialSave);
    },
    recomputeChecksums(bytes) {return recomputeSaveChecksums(bytes, byteMap);},
    changedByteCount(bytes) {return changedSaveOffsets(initialSave, bytes, byteMap).length;},
    slotStatus(bytes, slot) {return getSaveSlotStatus(bytes, slot, byteMap);},
  });
}

/** 当前存档的消费方共用字段入口，首次读取时恢复仓库中的 Working。 */
export async function prepareSaveCurrentFieldObjects(state_, {originalRepository = state_.projectRepository} = {}) {
  const fields = createSaveCurrentFieldObjects(state_);
  if (!fields.ready()) {
    const prepared = await prepareSaveBuildFieldObjects(state_.projectRepository, {originalRepository});
    await prepared.openCurrent(state_);
  }
  const characters = originalDocument(
    await originalRepository.getOriginal("character-initial-record"), "character-initial-record");
  return {fields, initialRoles: characters.rom_initial.roles,
    source: state_.saveCurrentSource === "rom-initial" ? "ROM 新开局值" : "当前存档"};
}

function equalBytes(left, right) {
  return left instanceof Uint8Array && right instanceof Uint8Array &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

/**
 * Install the original-ROM baseline without replacing a loaded save.
 */
function synchronizeSaveWorkspace(state_, romInitialBytes, {
  message = "",
} = {}) {
  if (!(romInitialBytes instanceof Uint8Array)) {
    throw new TypeError("ROM 初始存档必须是 Uint8Array");
  }
  const initial = romInitialBytes.slice();
  const keepCurrent = state_.saveCurrentBytes instanceof Uint8Array &&
    state_.saveCurrentBytes.length === initial.length &&
    ["loaded", "edited"].includes(state_.saveCurrentSource);
  state_.saveRomInitialBytes = initial;
  if (!keepCurrent) {
    state_.saveCurrentBytes = initial.slice();
    state_.saveDraftFields = {};
    state_.saveCurrentName = "metalmaxcn-current.sav";
    state_.saveCurrentSource = "rom-initial";
  }
  if (message) state_.saveMessage = message;
  return state_.saveCurrentBytes.slice();
}

/** Replace only the single current value with a user-loaded save. */
export function installLoadedSave(state_, bytes, name) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("载入存档必须是 Uint8Array");
  }
  state_.saveCurrentBytes = bytes.slice();
  state_.saveDraftFields = {};
  state_.saveCurrentName = name || "metalmaxcn.sav";
  state_.saveCurrentSource = "loaded";
  return state_.saveCurrentBytes;
}
