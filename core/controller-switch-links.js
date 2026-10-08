// @editor-module 控制器实例与受控对象的已发布引用。
import {sceneInvestigationResolution} from './scene-interaction-destinations.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function controllerInstances(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'computer-controller')?.instances || [];
}

export function controllerAt(object, project, sceneLogic) {
  if (!['investigation', 'investigation-tile'].includes(object.kind)) return [];
  const instances = controllerInstances(project);
  const records = object.kind === 'investigation' ? [object.record]
    : (sceneInvestigationResolution(object, {...project, sceneLogic})?.branches || [])
      .filter(branch => branch.effective.kind === 'investigation').map(branch => branch.effective.record);
  return records.flatMap(record => {
    const instance = instances.find(row => Number(row.scene_id) === Number(object.sceneId)
      && Number(row.point_id) === Number(record.id));
    const command = project?.facilities?.investigation?.commands?.find(row =>
      Number(row.selector) === Number(record.handler_selector))?.command_id;
    const control = instances.find(row => Number(row.command_id) === Number(command)
      && Number(row.instance_id) === Number(record.instance_id))?.switch;
    return instance && control ? [{...instance, x: record.x, y: record.y, switch: control}] : [];
  });
}

export function controllerFlagId(reference) {
  return Number.parseInt(String(reference).split(':').at(-1), 16);
}

export function controllerSceneHref(sceneId, project, {object, point, mode = 'logic'} = {}) {
  const scene = project?.scenes?.editable_scenes?.find(row => Number(row.id) === Number(sceneId));
  if (!scene) return null;
  return `?${new URLSearchParams({view: 'scenes', scene: scene.slug, sceneMode: mode,
    ...(object ? {sceneObject: object} : {}), ...(point ? {scenePoint: point.join(',')} : {})})}`;
}

export function controllerHref(instance, project) {
  return controllerSceneHref(instance.scene_id, project, {
    object: `investigation:${instance.point_id}`, point: [instance.x, instance.y],
  });
}

export function controllerTargetLabel(target) {
  const coordinates = target.cells ? target.cells.map(cell => `(${cell.x}, ${cell.y})`).join('、')
    : target.x == null ? '' : `(${target.x}, ${target.y})`;
  return `场景 $${hex(target.scene_id)} ${coordinates} · ${target.label}`;
}

export function controllersForTarget(sceneId, {object, point} = {}, project) {
  return controllerInstances(project).filter(instance => instance.switch?.targets?.some(target =>
    target.kind === 'scene-remap' && !object && !point
      ? [target.scene_id, target.target_scene_id].some(id => Number(id) === Number(sceneId))
      : Number(target.scene_id) === Number(sceneId) && (object
      ? target.scene_object === object
      : point && (target.cells || []).some(cell => cell.x === point[0] && cell.y === point[1]))));
}

export function controllersForFlag(flagId, project) {
  return controllerInstances(project).filter(instance => [instance.switch?.event_flag_reference,
    instance.switch?.failure_flag_reference].filter(Boolean).some(reference =>
    controllerFlagId(reference) === Number(flagId)));
}
