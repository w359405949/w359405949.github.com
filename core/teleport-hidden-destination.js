// @editor-module 错误传送与大门的已发布条件及预览。
import {HIDDEN_TELEPORT_RESOURCE_ID} from './ui-facility-record-owner.js';
import {db} from './project-db.js';

export function hiddenTeleportDestination(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')
    ?.configuration?.hidden_destination || null;
}

export async function prepareHiddenTeleportDestination(project) {
  const facility = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal');
  if (facility) facility.configuration.hidden_destination =
    await db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID, null);
}

export function hiddenTeleportFlags(project) {
  const hidden = hiddenTeleportDestination(project);
  return hidden ? [...hidden.trigger_flags, {id: hidden.set_flag, value: 1, label: hidden.flag_label}] : [];
}

export function hiddenTeleportGate(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return null;
  const gate = hidden.gate;
  return {
    key: HIDDEN_TELEPORT_RESOURCE_ID, object: null,
    scene_id: gate.scene_id, x: gate.cells[0].x, y: gate.cells[0].y,
    label: `scene:${gate.scene_id.toString(16).toUpperCase()} 下方大门`,
    appearance_condition: {
      label: '错误传送后下方大门开放',
      flags: [gate.event_flag], flag_labels: {[gate.event_flag]: hidden.flag_label},
      persistence: '置位开放，清位关闭，随存档保存。',
      triggers: [{flag: gate.event_flag, reference: HIDDEN_TELEPORT_RESOURCE_ID,
        label: '时空隧道错误传送', href: '?view=teleport&facilityTab=config#hidden-teleport'}],
      states: [
        {id: 'before', label: '关闭', cells: []},
        {id: 'after', label: '开放', cells: gate.cells},
      ],
      note: `地图格 ${gate.cells.map(cell => `(${cell.x},${cell.y}) → $${
        cell.metatile_id.toString(16).toUpperCase().padStart(2, '0')}`).join('、')}`,
      destination: {label: `隐藏目的地 scene:${hidden.scene_id.toString(16).toUpperCase()}`,
        scene_id: hidden.scene_id},
      sources: [gate.source],
    },
  };
}
