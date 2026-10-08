// @editor-module 战车预设与初始停放的字段对象会话。
import {draftEquipmentMask} from './equipment-slot-shape.js';
import {requireBrowserProjectRepository} from './project-data.js';
import {db} from './project-db.js';
import {state} from './state.js';
import {applyJsonChanges} from './project-store-values.js';

const clone = value => JSON.parse(JSON.stringify(value));
let loading = null;

function revision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sessionMatches(repository, originalRevision) {
  return state.projectRepository === repository && revision() === originalRevision;
}

export function vehicleDraftFromDocument(document_) {
  const presets = {};
  for (const preset of document_?.presets || []) {
    presets[Number(preset.preset_id)] = {
      preset_id: Number(preset.preset_id),
      defense: Number(preset.defense?.value ?? 0),
      chassis_weight_units: Number(preset.chassis_weight?.internal_units ?? 0),
      ammo_capacity: Number(preset.ammo_capacity?.value ?? 0),
      mount_mask: draftEquipmentMask(preset.mount_mask?.value),
      equipped_mask: draftEquipmentMask(preset.equipped_mask?.value),
      slot_assignments: clone(preset.slot_assignments ?? Array(5).fill(null)),
      equipment: (preset.loadout || []).slice(0, 6)
        .map(slot => Number(slot.item_id ?? 0)),
    };
  }
  const placement = {};
  for (const row of document_?.initial_placement?.records || []) {
    placement[Number(row.vehicle_slot)] = {
      vehicle_slot: Number(row.vehicle_slot),
      placed: Boolean(row.placed),
      scene_id: row.placed ? Number(row.scene_id) : null,
      x: Number(row.x),
      y: Number(row.y),
    };
  }
  return {table_sha256: document_?.writeback_state?.current_sha256 || '',
    presets, placement};
}

export async function ensureVehicleDraft() {
  if (state.vehicleDraft || !state.project) return state.vehicleDraft;
  const project = state.project;
  const repository = requireBrowserProjectRepository(state);
  const originalRevision = revision();
  if (!loading || loading.project !== project || loading.repository !== repository
      || loading.revision !== originalRevision) {
    const promise = (async () => {
      await db.getFieldObjects('vehicle-preset');
      const saved = await db.readResource('vehicle-preset');
      if (state.project !== project || !sessionMatches(repository, originalRevision)) return null;
      if (!state.vehicleDraft) {
        state.vehicleDraft = vehicleDraftFromDocument(saved.value.document);
        state.vehicleOriginal = clone({presets: state.vehicleDraft.presets,
          placement: state.vehicleDraft.placement});
        state.vehicleDirty = false;
      }
      return state.vehicleDraft;
    })();
    loading = {project, repository, revision: originalRevision, promise};
    void promise.finally(() => {
      if (loading?.promise === promise) loading = null;
    }).catch(() => {});
  }
  return loading.promise;
}

export function vehicleViewDraft(viewId) {
  const ids = state.project?.game_data?.vehicles?.views?.[viewId]?.preset_ids;
  if (!ids || !state.vehicleDraft) return [];
  return ids.map(Number).sort((left, right) => left - right)
    .map(id => state.vehicleDraft.presets[id]).filter(Boolean);
}

export function vehiclePresetDraft(presetId) {
  return state.vehicleDraft?.presets?.[Number(presetId)] || null;
}

export function vehicleEquippedMask(record) {
  return record.equipped_mask;
}

export function vehicleViewDirty(viewId) {
  const presetsChanged = vehicleViewDraft(viewId).some(record =>
    JSON.stringify(record) !==
      JSON.stringify(state.vehicleOriginal?.presets?.[record.preset_id]));
  if (presetsChanged) return true;
  if (viewId !== 'player') return false;
  return JSON.stringify(state.vehicleDraft?.placement)
    !== JSON.stringify(state.vehicleOriginal?.placement);
}

export function vehicleTableDirty() {
  state.vehicleDirty = JSON.stringify({presets: state.vehicleDraft?.presets,
    placement: state.vehicleDraft?.placement}) !== JSON.stringify(state.vehicleOriginal);
  return state.vehicleDirty;
}

function replaceVehicleSelection(target, restored, presetId, viewId) {
  const id = Number(presetId);
  if (restored.presets[id]) target.presets[id] = clone(restored.presets[id]);
  else delete target.presets[id];
  if (viewId !== 'player') return;
  if (restored.placement[id]) target.placement[id] = clone(restored.placement[id]);
  else delete target.placement[id];
}

export function finishVehicleOriginalReset({repository, revision: originalRevision, id, viewId}, saved) {
  if (!sessionMatches(repository, originalRevision))
    throw new Error('项目会话已切换，请在当前载具页重试');
  const restored = vehicleDraftFromDocument(saved.value.document);
  replaceVehicleSelection(state.vehicleDraft, restored, id, viewId);
  replaceVehicleSelection(state.vehicleOriginal, restored, id, viewId);
  vehicleTableDirty();
  return saved;
}

function vehicleItemCategorySnapshot(records, items) {
  const snapshot = {};
  for (const itemId of new Set(records.flatMap(record => record.equipment || []))) {
    const item = items[Number(itemId)];
    if (item) snapshot[Number(itemId)] = {category: clone(item.category)};
  }
  return snapshot;
}

export function vehicleViewSaveSnapshot(viewId) {
  const project = state.project;
  const view = project?.game_data?.vehicles?.views?.[viewId];
  if (!view) throw new Error(`未知的战车用途视图：${viewId}`);
  if (!state.vehicleDraft) throw new Error('战车预设草稿不可用，请刷新页面');
  const records = clone(vehicleViewDraft(viewId));
  const placement = viewId === 'player'
    ? clone(Object.values(state.vehicleDraft.placement)) : [];
  const items = vehicleItemCategorySnapshot(records,
    project?.game_data?.items?.records || []);
  return {viewId, repository: requireBrowserProjectRepository(state),
    revision: revision(), project, records, placement, items, before: clone(state.vehicleOriginal)};
}

function validateVehicleViewSaveSnapshot(viewId, snapshot) {
  if (!snapshot || snapshot.viewId !== viewId || !snapshot.repository ||
      !snapshot.project || !Array.isArray(snapshot.records) ||
      !Array.isArray(snapshot.placement) || !snapshot.items)
    throw new TypeError(`战车用途视图 ${viewId} 的保存快照不完整`);
  return snapshot;
}

export async function saveVehicleView(viewId,
  snapshot = vehicleViewSaveSnapshot(viewId)) {
  const payload = validateVehicleViewSaveSnapshot(viewId, snapshot);
  const fields = await db.getFields('vehicle-preset');
  const byKey = new Map(fields.map(field =>
    [`${field.recordId}:${field.fieldName}`, field]));
  const edits = [];
  const presetValues = record => {
    const values = new Map([
      ['defense', record.defense], ['chassis_weight', record.chassis_weight_units],
      ['ammo_capacity', record.ammo_capacity], ['mount_mask', record.mount_mask],
      ['equipped_mask', vehicleEquippedMask(record)],
    ]);
    record.equipment.forEach((itemId, slot) => values.set(`loadout_${slot}`, itemId));
    return values;
  };
  for (const edited of payload.records) {
    const id = Number(edited.preset_id);
    const values = presetValues(edited);
    const before = payload.before?.presets[id];
    const previous = before ? presetValues(before) : null;
    for (const [name, value] of values) {
      const field = byKey.get(`${id}:${name}`);
      if (!field || value === null) continue;
      if ((previous ? previous.get(name) : field.value) !== value) edits.push({field, value});
    }
  }
  if (viewId === 'player') for (const row of payload.placement) {
    const id = Number(row.vehicle_slot);
    for (const [name, value] of [['scene_id', row.placed ? row.scene_id : null],
      ['x', row.x], ['y', row.y]]) {
      const field = byKey.get(`${id}:${name}`);
      if (!field) throw new Error(`vehicle-preset 缺少停放字段 ${id}:${name}`);
      const before = payload.before?.placement[id];
      const previous = before ? (name === 'scene_id' && !before.placed ? null : before[name]) : field.value;
      if (previous !== value) edits.push({field, value});
    }
  }
  if (edits.length) await db.writeFields(edits,
    {expectedVersion: fields[0]?.version ?? null});
  const saved = await db.readResource('vehicle-preset');
  if (!sessionMatches(payload.repository, payload.revision) ||
      state.project !== payload.project) return saved;
  const persisted = vehicleDraftFromDocument(saved.value.document);
  if (state.vehicleOriginal) {
    for (const record of payload.records) {
      const id = Number(record.preset_id);
      if (!persisted.presets[id])
        throw new Error(`vehicle-preset 写入后缺少战车预设 ${id}`);
      state.vehicleDraft.presets[id] = applyJsonChanges(persisted.presets[id], record, state.vehicleDraft.presets[id]);
      state.vehicleOriginal.presets[id] = clone(persisted.presets[id]);
    }
    if (viewId === 'player') for (const row of payload.placement) {
      const id = Number(row.vehicle_slot);
      if (persisted.placement[id]) {
        state.vehicleDraft.placement[id] = applyJsonChanges(persisted.placement[id], row, state.vehicleDraft.placement[id]);
        state.vehicleOriginal.placement[id] = clone(persisted.placement[id]);
      } else delete state.vehicleOriginal.placement[id];
    }
    vehicleTableDirty();
  }
  return saved;
}
