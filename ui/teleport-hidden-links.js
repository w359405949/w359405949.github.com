// @editor-module 隐藏目的地、大门与存档事件位的往返链接。
import {esc} from '../core/dom.js';
import {hiddenTeleportDestination} from '../core/teleport-hidden-destination.js';
import {eventFlagReferenceMarkup} from '../modules/save/event-flags.js';
import {controllerSceneHref} from '../core/controller-switch-links.js';
import {HIDDEN_TELEPORT_RESOURCE_ID} from '../core/ui-facility-record-owner.js';
import {db} from '../core/project-db.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const link = (href, label) => `<a class="editor-inline-link" href="${esc(href)}">${esc(label)} ↗</a>`;

export function hiddenTeleportConditionsMarkup(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  return `仅错误传送可达 · ${hidden.trigger_flags.map(flag => `${eventFlagReferenceMarkup(flag.id)} = ${flag.value}`).join(' 且 ')}
    <p>触发后 ${eventFlagReferenceMarkup(hidden.set_flag)} = 1；
    ${link(controllerSceneHref(hidden.gate.scene_id, project, {point: [hidden.gate.cells[0].x,
      hidden.gate.cells[0].y]}), '下方大门开放')}</p>`;
}

export function hiddenTeleportSceneMarkup(sceneId, selection, project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  if (Number(sceneId) !== hidden.scene_id) return '';
  return `<div data-hidden-teleport-source><p>${link('?view=teleport&facilityTab=config#hidden-teleport',
    '来源：时空隧道错误传送')}</p>
    ${hiddenTeleportConditionsMarkup(project)}
    <p>${link(controllerSceneHref(hidden.scene_id, project), `隐藏目的地 scene:${hex(hidden.scene_id)}`)}</p></div>`;
}

export async function bindHiddenTeleportControls(root = document) {
  for (const host of root.querySelectorAll('[data-hidden-teleport-fields]')) {
    const object = (await db.getFieldObjects(HIDDEN_TELEPORT_RESOURCE_ID))[0];
    if (host.isConnected) await object.mount(host, {compactIdentity: true, stacked: true});
  }
}
