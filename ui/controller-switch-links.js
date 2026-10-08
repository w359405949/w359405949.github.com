// @editor-module 控制器、受控对象与存档事件位的往返链接。
import {esc} from '../core/dom.js';
import {eventFlagReferenceMarkup, eventFlagTextMarkup} from '../modules/save/event-flags.js';
import {ownerReferenceListMarkup, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact} from './owner-reference-impact.js';
import {controllerAt, controllerFlagId, controllerHref, controllerSceneHref,
  controllerTargetLabel} from '../core/controller-switch-links.js';

function link(href, label, role) {
  return href ? `<a class="editor-inline-link" data-controller-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>` : esc(label);
}

export function controllerTargetsMarkup(instance, project) {
  const control = instance.switch;
  if (!control) return '';
  const targets = (control.targets || []).map(target => {
    const points = target.cells || (target.x == null ? [] : [{x: target.x, y: target.y}]);
    return `<p>${esc(target.label)} · ${points.length ? points.map(point => link(
      controllerSceneHref(target.scene_id, project, {object: target.scene_object,
        point: [point.x, point.y], mode: target.kind === 'map-replacement' ? 'tiles' : 'logic'}),
      `场景 $${Number(target.scene_id).toString(16).toUpperCase()} (${point.x}, ${point.y})`, 'target')).join(' · ')
      : link(controllerSceneHref(target.scene_id, project), controllerTargetLabel(target), 'target')}
      ${target.target_scene_id == null ? '' : ` → ${link(controllerSceneHref(target.target_scene_id, project),
        `场景 $${Number(target.target_scene_id).toString(16).toUpperCase()}`, 'target')}`}
      ${target.event_flag_reference ? ` · ${eventFlagReferenceMarkup(target.event_flag_reference, {attributes: 'data-controller-link="flag"'})}` : ''}</p>`;
  }).join('');
  const flag = controllerFlagId(control.event_flag_reference);
  const resolution = control.target_resolution;
  const unresolved = resolution?.status === 'unknown'
    ? `<p data-controller-target-resolution="unknown" title="${esc(resolution.reason)}">受控对象：未确认</p>` : '';
  return `${targets}${unresolved}<p>${eventFlagReferenceMarkup(flag, {attributes: 'data-controller-link="flag"'})}
    · ${control.password_required ? '正确密码置位 · 不提供清位按钮'
      : '置位 / 清位 · 可反复切换'}</p>
    ${control.failure_flag_reference ? `<p>密码错误：${eventFlagReferenceMarkup(control.failure_flag_reference, {attributes: 'data-controller-link="flag"'})}</p>` : ''}
    ${control.gap ? `<p>${eventFlagTextMarkup(control.gap)}</p>` : ''}`;
}

function controllerBacklink(instance, project) {
  return link(controllerHref(instance, project), `控制器 ${instance.scene_object_uid} · (${instance.x}, ${instance.y})`, 'controller');
}

export function sceneControllerMarkup(object, project, sceneLogic) {
  return controllerAt(object, project, sceneLogic).map(instance => `<div data-controller-chain>
    <p>${controllerBacklink(instance, project)} → 受控对象</p>${controllerTargetsMarkup(instance, project)}</div>`).join('');
}

export function controlledObjectMarkup(sceneId, selection, project) {
  return ownerReferenceListMarkup('控制器',
    `data-controlled-object-users="${esc(JSON.stringify({kind: 'controlled-object', sceneId, selection}))}"`);
}

export function bindControlledObjectUsers(root, project, onLoaded) {
  root.querySelectorAll('[data-controlled-object-users]').forEach(host =>
    bindOwnerReferenceList(host, () => withCurrentOwnerRecord(
      JSON.parse(host.dataset.controlledObjectUsers), project,
      () => currentOwnerReferenceImpact()).map(instance =>
      `<p data-controlled-object>${controllerBacklink(instance, project)}</p>`).join(''), onLoaded));
}
