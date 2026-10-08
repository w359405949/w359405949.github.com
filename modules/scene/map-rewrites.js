// @editor-module 事件地图改写的两态预览与字段对象控件。
import {esc} from '../../core/dom.js';
import {db} from '../../core/project-db.js';
import {state} from '../../core/state.js';
import {sceneMapRewriteScene} from '../../core/scene-map-rewrites.js';
import {eventFlagReferenceMarkup} from '../save/event-flags.js';
import {handleMarkup} from '../../ui/handle.js';
import {loadSceneMetatileRenderer, loadWorldMetatileRenderer} from './visual-preview.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneMapRewritePhase(rewrite) {
  return state.sceneMapRewritePreview?.key === rewrite.key ? state.sceneMapRewritePreview.phase : 'before';
}

export function sceneMapRewritePreview(rewrite) {
  if (rewrite.type === 'scene-remap') return state.sceneMapRewriteScenes?.key === rewrite.key
    ? state.sceneMapRewriteScenes[sceneMapRewritePhase(rewrite)] : null;
  return {scene: sceneMapRewriteScene(state.scene, rewrite, sceneMapRewritePhase(rewrite)),
    logic: state.sceneLogic, renderer: state.sceneRenderer || (state.sceneMapRewriteScenes?.key === rewrite.key
      ? state.sceneMapRewriteScenes[sceneMapRewritePhase(rewrite)].renderer : null)};
}

export function sceneMapRewriteControlsMarkup(rewrite) {
  if (!rewrite) return '';
  const phase = sceneMapRewritePhase(rewrite);
  return `<div class="scene-mode-switch" aria-label="事件地图预览">${['before', 'after'].map(id =>
    `<button type="button" class="button ${phase === id ? 'active' : ''}" aria-pressed="${phase === id}"
      data-scene-map-rewrite-phase="${id}">${esc(rewrite[id].label)}</button>`).join('')}</div>`;
}

export function renderSceneMapRewriteInspector(rewrite) {
  const bounds = rewrite.bounds;
  return `<div class="scene-object-editor" data-scene-map-rewrite="${esc(rewrite.key)}">
    <div class="scene-object-identity">${handleMarkup(rewrite.handle, {inline: true})}</div>
    <div class="scene-map-rewrite-title"><b>${esc(rewrite.label)}</b>
      <div data-scene-map-rewrite-event>${eventFlagReferenceMarkup(rewrite.eventFlag, {compact: true})}</div></div>
    ${bounds ? `<p>地图格范围 (${bounds.x}, ${bounds.y})–(${bounds.x + bounds.width - 1}, ${bounds.y + bounds.height - 1}) · ${
      rewrite.regions.reduce((sum, row) => sum + row.width * row.height, 0)} 格</p>` : ''}
    <div data-scene-map-rewrite-fields></div>
  </div>`;
}

export async function mountSceneMapRewrite(rewrite, {refresh, draw}) {
  const host = document.querySelector('[data-scene-map-rewrite]');
  if (!host || host.dataset.sceneMapRewrite !== rewrite.key) return;
  const current = () => host.isConnected && state.sceneLogicSelection === rewrite.key;
  document.querySelectorAll('[data-scene-map-rewrite-controls] [data-scene-map-rewrite-phase]').forEach(button => {
    button.addEventListener('click', () => {
      state.sceneMapRewritePreview = {key: rewrite.key, phase: button.dataset.sceneMapRewritePhase};
      for (const node of button.parentElement.children) {
        const active = node === button;
        node.classList.toggle('active', active);
        node.setAttribute('aria-pressed', String(active));
      }
      draw();
    });
  });
  const pairs = await Promise.all(['before', 'after'].map(async phase => {
    if (rewrite.type !== 'scene-remap') {
      const renderer = state.sceneRenderer || (Number(state.scene.id) === 0
        ? await loadWorldMetatileRenderer(state.scene) : await loadSceneMetatileRenderer(state.scene));
      return [phase, {scene: sceneMapRewriteScene(state.scene, rewrite, phase),
        logic: state.sceneLogic, renderer}];
    }
    const reference = rewrite[phase].sceneReference;
    const document = await db.getResourceDocument(reference, null);
    if (!document?.scene) throw new Error(`${reference} 缺少场景地图`);
    const active = Number(document.scene.id) === Number(state.scene.id);
    const scene = active ? state.scene : document.scene;
    const renderer = Number(scene.id) === 0
      ? await loadWorldMetatileRenderer(scene) : await loadSceneMetatileRenderer(scene);
    return [phase, {scene, logic: active ? state.sceneLogic : document.logic, renderer}];
  }));
  if (!current()) return;
  state.sceneMapRewriteScenes = {key: rewrite.key, ...Object.fromEntries(pairs)};
  draw();
  const objects = await db.getFieldObjects(rewrite.resourceId);
  if (!current()) return;
  const candidates = rewrite.fieldObjectIds ? objects.filter(row => rewrite.fieldObjectIds.includes(row.id))
    : objects.filter(row => row.fields.some(field => field.entityHandle === rewrite.handle));
  const fieldsHost = host.querySelector('[data-scene-map-rewrite-fields]');
  host.addEventListener('field-object-saved', async event => {
    if (!current()) return;
    const fields = Array.isArray(event.detail.fields) ? event.detail.fields : [event.detail.fields];
    if (!fields.some(field => field.resourceId === rewrite.resourceId)) return;
    try {
      const document = await db.getResourceDocument(rewrite.resourceId, null);
      if (!current()) return;
      if (rewrite.type === 'scene-remap') state.sceneBgmDocument = document;
      else if (rewrite.type === 'world-coarse-switch') state.sceneTideDocument = document;
      else state.scene.event_metatile_replacements = JSON.parse(JSON.stringify(document.scene.event_metatile_replacements));
      state.sceneMapRewriteScenes = null;
      refresh();
    } catch (error) {
      if (current()) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    }
  });
  for (const object of candidates) {
    const eventField = object.fields.find(field => field.entityHandle === rewrite.handle
      && ['event_flag', 'global_event_flag_reference'].includes(field.fieldName));
    const fieldKey = field => JSON.stringify([field.resourceId, field.entityHandle, field.fieldName]);
    const mountOptions = {compactIdentity: true,
      stacked: rewrite.type === 'world-coarse-switch' || rewrite.type === 'scene-remap',
      ...(rewrite.fieldObjectIds ? {} : {rowHandles: [rewrite.handle]}),
      metatileResourceId: `scene:${hex(state.scene.id)}`};
    if (eventField) {
      await object.mount(host.querySelector('[data-scene-map-rewrite-event]'), {...mountOptions,
        stacked: false,
        reset: object.fields.every(field => field === eventField),
        suppressedFieldKeys: new Set(object.fields.filter(field => field !== eventField).map(fieldKey)),
        referencePickerOptions: {[eventField.fieldName]: {previewOnlySummary: true}}});
      if (!current()) return;
      if (object.fields.every(field => field === eventField)) continue;
    }
    const root = document.createElement('div');
    fieldsHost.append(root);
    await object.mount(root, {...mountOptions,
      suppressedFieldKeys: new Set(eventField ? [fieldKey(eventField)] : [])});
    if (!current()) return;
  }
  host.dataset.sceneMapRewriteReady = '1';
}
