// @editor-module 潮汐两态使用各自场景的当前值与共用视口绘制器。
import {esc} from '../../core/dom.js';
import {worldTideScenes} from '../../core/world-tide.js';
import {db} from '../../core/project-db.js';
import {WORLD_TIDE_OWNER} from '../../core/world-tide-owner.js';
import {fieldCameraOrigin} from '../../core/story-camera.js';
import {scenePreviewMarkup, bindScenePreview, paintScenePreviewById} from './preview.js';

let activePreview = null;
document.addEventListener('field-object-saved', event => {
  if (!activePreview?.host.isConnected) return;
  const {host, scene, resourceId, paint} = activePreview;
  const fields = Array.isArray(event.detail?.fields) ? event.detail.fields : [event.detail?.fields];
  if (!fields.some(field => [resourceId, WORLD_TIDE_OWNER, 'scene:00', 'field-scene-lifecycle-service']
    .includes(field?.resourceId))) return;
  const background = fields.find(field => field.entityHandle === `${resourceId}:background`);
  if (background) scene.header_extension[6] = background.value;
  void paint().catch(error => {
    if (host.isConnected) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
  });
});

export function worldTideSceneMarkup(sceneId, tide, lifecycle, scenes) {
  const variants = worldTideScenes(tide, lifecycle, sceneId);
  return variants.length ? `<nav class="scene-mode-switch" aria-label="潮汐状态">${variants.map(row => {
    const entry = scenes.editable_scenes.find(scene => Number(scene.id) === row.sceneId);
    return entry ? `<a class="button ${row.sceneId === Number(sceneId) ? 'active' : ''}"
      data-scene-tide-phase="${row.phase}" href="?${esc(new URLSearchParams({view: 'scenes',
        scene: entry.slug}))}">${row.label}</a>` : '';
  }).join('')}</nav>` : '';
}

export function worldTidePreviewMarkup(sceneId, tide, lifecycle) {
  return worldTideScenes(tide, lifecycle, sceneId).length
    ? `<section data-scene-tide-preview>${scenePreviewMarkup({label: '潮汐入口视口'})}
        <div data-scene-tide-background></div></section>` : '';
}

export async function mountWorldTideScene(sceneId, scene) {
  const host = document.querySelector('[data-scene-tide-preview]');
  if (!host) return;
  const resourceId = `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, '0')}`;
  const canvas = host.querySelector('canvas');
  bindScenePreview({root: host, key: `scene-tide:${sceneId}`});
  const paint = async () => {
    const tide = await db.getResourceDocument(WORLD_TIDE_OWNER);
    const sourceId = `scene:${Number(tide.entrance.scene_id).toString(16).toUpperCase().padStart(2, '0')}`;
    const source = await db.getResourceDocument(sourceId);
    const recordId = Number.parseInt(tide.entrance.resource_id.split(':').at(-1), 16);
    const entrance = source.logic.layers.transitions.point_transitions
      .find(record => Number(record.id) === recordId);
    if (!entrance) throw new TypeError('潮汐入口连接不可用');
    const [cameraX, cameraY] = fieldCameraOrigin(sceneId,
      entrance.destination_x, entrance.destination_y);
    return paintScenePreviewById(canvas, sceneId, {view: 'viewport', cameraX, cameraY,
      isCurrent: () => host.isConnected});
  };
  activePreview = {host, scene, resourceId, paint};
  await paint();
  const fieldObject = await db.getFieldObject(resourceId, `${resourceId}.background`);
  if (!host.isConnected) return;
  await fieldObject.mount(host.querySelector('[data-scene-tide-background]'), {compactIdentity: true});
}
