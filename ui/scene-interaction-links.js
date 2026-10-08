// @editor-module 场景对象与交互承载页面共用双向入口。
import {withCurrentOwnerRecord, currentOwnerReferenceImpact, ownerReferenceListMarkup,
  bindOwnerReferenceList, supportsSceneDestinationPage} from "./owner-reference-impact.js";
export {destinationMatchesPage, supportsSceneDestinationPage} from "./owner-reference-impact.js";
import {esc} from '../core/dom.js';
import {currentTextReference} from '../core/resource-index.js';
import {sceneInteractionDestinations, sceneInvestigationResolution,
  sceneUsageAnchor, sceneTreasureProbeResolution} from '../core/scene-interaction-destinations.js';
import {sceneOwnedInteractionConfigurations} from '../core/scene-interaction-configurations.js';
import {storyPlaybackView} from '../core/story-view-config.js';

let mountedUsers = null;

function destinationOwnerKey(page) {
  if (!supportsSceneDestinationPage(page.view)) return null;
  const fields = {
    interfaceui: ['interfacePage'], shops: ['shopFamily', 'shopTab', 'recordId'],
    wanted: ['wantedTargetIndex', 'wantedTargetSide'], 'wanted-ui': ['wantedTargetIndex', 'wantedTargetSide'],
    scenes: ['sceneSlug'], text: ['textRegion', 'textSearch'],
    actors: ['actorVisualTab', 'storyKind', 'recordId'], vehicles: ['recordId'],
    audio: ['recordId'], items: ['recordId'], equipment: ['recordId'], 'battle-test': ['recordId', 'resourceId'],
    metatiles: ['metatileRecordId'], vending: ['vendingPreviewFamily', 'vendingPreviewConfiguration'],
    jukebox: ['jukeboxPreviewConfiguration'],
  };
  if (page.view === 'interfaceui' && page.interfacePage === 'interaction-service') return null;
  if (['items', 'equipment', 'battle-test', 'vehicles', 'audio', 'actors'].includes(page.view)
      && page.recordId == null) return null;
  if (page.view === 'actors' && page.actorVisualTab !== 'story') return null;
  if (page.view === 'scenes' && (!page.sceneSlug || page.sceneLogicSelection)) return null;
  if (page.view === 'text' && (page.textMode !== 'records' || !String(page.textSearch || '').startsWith('record:'))) return null;
  if (page.view === 'shops' && page.shopTab !== 'buyer'
      && (page.shopTab !== 'config' || page.recordId == null)) return null;
  if (page.view === 'shops' && Number(page.shopFamily) === 15) return null;
  if (page.view === 'metatiles' && !page.metatileRecordId) return null;
  if (storyPlaybackView(page.view) && !page.storySequenceId) return null;
  return JSON.stringify([page.view, ...(storyPlaybackView(page.view) ? ['storySequenceId'] : fields[page.view] || [])
    .map(field => page[field] ?? null)]);
}

export function sceneDestinationUsersMarkup(page) {
  return destinationOwnerKey(page) === null ? ''
    : '<section class="panel" data-scene-destination-users>'
      + ownerReferenceListMarkup('使用此内容的场景对象') + '</section>';
}

export function bindSceneDestinationUsers(root, page, database, onLoaded) {
  const key = destinationOwnerKey(page);
  const host = root.querySelector('[data-scene-destination-users]');
  if (!host || key === null) {mountedUsers = null; return;}
  if (mountedUsers?.key === key) {
    mountedUsers.page = {...page};
    host.replaceWith(mountedUsers.host);
    root.querySelector('[data-metatile-reference-header]')?.append(mountedUsers.host);
    return;
  }
  const mounted = {key, host, page: {...page}};
  mountedUsers = mounted;
  root.querySelector('[data-metatile-reference-header]')?.append(host);
  bindOwnerReferenceList(host.querySelector('details'), async () => {
    const ownerPage = {...mounted.page};
    if (ownerPage.view === 'shops') ownerPage.shopPreviewRecord = Number.parseInt(String(ownerPage.recordId).split(':').at(-1), 16);
    const html = await renderSceneDestinationUsers(ownerPage, database);
    const body = document.createElement('template');
    body.innerHTML = html;
    const count = body.content.querySelectorAll('[data-scene-destination-user]').length;
    host.querySelector('summary').textContent = `使用此内容的场景对象 · ${count}`;
    return html;
  }, onLoaded);
}

function destinationLabel(target) {
  return target.record ? currentTextReference(target.record).label || '无可读文字' : target.label;
}

function sceneInterfacePreviewLinks(object, context) {
  if (!['actor', 'investigation', 'investigation-special', 'investigation-tile', 'elevator'].includes(object.kind)) return '';
  const {targets} = sceneInteractionDestinations(object, context);
  const links = new Map();
  const x = Number(object.pose?.x ?? object.record.x), y = Number(object.pose?.y ?? object.record.y);
  if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return '';
  for (const target of targets) {
    if (!target.application || !['shops', 'interfaceui', 'jukebox', 'vending', 'frograce',
      'teleport', 'computercontroller', 'wanted-ui'].includes(target.query.view)) continue;
    const query = new URLSearchParams(target.query);
    if (target.serviceFragment) query.set('interfaceEntry', target.serviceFragment);
    if (target.query.view === 'shops' && target.query.shopTab !== 'buyer') query.set('shopTab', 'ui');
    if (['jukebox', 'vending', 'frograce', 'teleport', 'computercontroller'].includes(target.query.view))
      query.set('facility', 'ui');
    query.set('previewScene', object.sceneId);
    query.set('previewPoint', `${x},${y}`);
    query.set('previewCommand', target.application.command);
    query.set('previewArgument', target.application.instance);
    if (object.kind === 'investigation') query.set('previewEntryHandle',
      `scene:${Number(object.sceneId).toString(16).toUpperCase().padStart(2, '0')}:investigation:${Number(object.record.id).toString(16).toUpperCase().padStart(2, '0')}`);
    const href = `?${query}`;
    links.set(href, `<p class="scene-content-note"><a class="editor-inline-link" data-scene-interface-preview
      href="${esc(href)}"${object.kind === 'elevator'
        ? ` title="${esc(target.label)} · 预览" aria-label="${esc(target.label)} · 预览"` : ''}>${object.kind === 'elevator'
        ? '↗' : `${esc(target.label)} · 预览 ↗`}</a></p>`);
  }
  return [...links.values()].join('');
}

export function renderSceneDestinationLinks(object, context) {
  const probe = sceneTreasureProbeResolution(object, context);
  const result = sceneInteractionDestinations(object, context);
  const texts = new Set(sceneOwnedInteractionConfigurations(object, context).requests
    .filter(request => request.resourceId === 'text-record').map(request => request.handle));
  return (probe?.status === 'no-match'
    ? '<p class="scene-content-note" data-scene-treasure-probe="no-match">此格无调查物，调查不产生结果。</p>' : '')
    + renderSceneInvestigationResolution(object, context)
    + sceneInterfacePreviewLinks(object, context)
    + (result.nonConfigurable || []).filter(row => !result.targets.some(target => target.fixedBehavior === row.reason))
      .map(row => `<p class="scene-content-note" data-scene-fixed-behavior="${esc(row.reason)}">${esc(row.label)}</p>`).join('')
    + result.targets.filter(target => !target.external && !target.effectiveObject
      && !texts.has(target.record))
    .map(target => {
      const label = `${target.condition && !target.query.sceneObject ? `${esc(target.condition)} · ` : ''}${esc(destinationLabel(target))} ↗`;
      const link = target.query.resource?.startsWith('encounter-formation:')
        ? `<a class="editor-inline-link" data-resource-target="${esc(target.query.resource)}" href="${esc(target.href)}">${label}</a>`
        : `<a class="editor-inline-link" data-scene-destination="${esc(target.href)}" href="${esc(target.href)}"${target.record ? ` title="${esc(target.record)}"` : ''}>${label}</a>`;
      return `<p class="scene-content-note"${target.fixedBehavior ? ` data-scene-fixed-behavior="${esc(target.fixedBehavior)}"` : ''}>${link}</p>`;
    }).join('');
}

function renderSceneInvestigationResolution(object, context) {
  const resolution = sceneInvestigationResolution(object, context);
  if (!resolution) return '';
  return `<div data-scene-investigation-resolution>${resolution.branches.map(({condition, effective}) =>
    `<p class="scene-content-note">${effective.kind === object.kind && Number(effective.record.id) === Number(object.record.id)
      ? `${esc(condition)}本对象生效` : `${esc(condition)}由 <a class="editor-inline-link"
      data-scene-destination="${esc(sceneObjectHref(effective))}"
      href="${esc(sceneObjectHref(effective))}">${esc(effective.uid)} 接管 ↗</a>`}</p>`).join('')}</div>`;
}

export function sceneObjectHref(object) {
  return `?${new URLSearchParams({view: 'scenes', scene: object.scene, sceneMode: 'logic', sceneObject: object.key})}`;
}

export function consolidateSceneDestinationLinks(inspector) {
  if (!inspector) return;
  const key = link => {
    const url = new URL(link.href);
    url.searchParams.sort();
    return url.pathname + url.search + (/^#(?:scene-.*-parameters|facility-parameters-)/u.test(url.hash) ? url.hash : '');
  };
  for (const link of inspector.querySelectorAll('.scene-content-note > [data-scene-destination]')) {
    if (!link.isConnected) continue;
    const existing = [...inspector.querySelectorAll('a[href]')].find(candidate =>
      candidate !== link && key(candidate) === key(link));
    if (existing) {link.parentElement.remove(); continue;}
    const query = new URL(link.href).searchParams;
    if (query.get('view') !== 'scenes' || !query.has('scene') || query.has('sceneObject')) continue;
    const destination = [...inspector.querySelectorAll('[data-field-object-coordinate]')].find(host =>
      JSON.parse(host.dataset.fieldObjectCoordinate)[1] === 'destination_scene_id');
    const positionLink = destination?.querySelector('a.scene-position-detail-link');
    if (positionLink && new URL(positionLink.href).searchParams.get('scene') === query.get('scene')) {
      positionLink.title = link.textContent.trim();
      positionLink.dataset.sceneDestination = link.dataset.sceneDestination;
      link.parentElement.remove();
    }
  }
  for (const link of inspector.querySelectorAll('[data-scene-interaction-configuration] > p > [data-scene-destination]')) {
    const existing = [...inspector.querySelectorAll('a[href]')].find(candidate =>
      candidate !== link && key(candidate) === key(link));
    if (existing) link.parentElement.remove();
  }
}

export function renderSceneDestinationUserRows(usages) {
  if (!usages.length) return '';
  return `<div class="table-wrap"><table><thead><tr><th>对象</th><th>坐标</th><th>使用内容</th></tr></thead><tbody>${usages.map(({object, targets}) =>
    `<tr id="${esc(sceneUsageAnchor(object.scene, object.key))}" data-scene-destination-user="${esc(`${object.scene}/${object.key}`)}">
      <td><a class="editor-inline-link" href="${esc(sceneObjectHref(object))}">${esc(object.uid)} · ${esc(object.sceneName || object.scene)}</a></td>
      <td>${esc(object.pose?.x ?? object.record.x ?? object.record.trigger_x ?? '—')}, ${esc(object.pose?.y ?? object.record.y ?? object.record.trigger_y ?? '—')}</td>
      <td>${targets.map(target => {
        const label = `${esc(destinationLabel(target))}${target.instance == null ? '' : ` · 实例 ${esc(target.instance)}`}`;
        const link = target.query.resource?.startsWith('encounter-formation:')
          ? `<a class="editor-inline-link" data-resource-target="${esc(target.query.resource)}" href="${esc(target.href)}">${label}</a>`
          : `<a class="editor-inline-link" href="${esc(target.href)}"${target.record ? ` title="${esc(target.record)}"` : ''}>${label}</a>`;
        return `${link}${target.condition ? ` · ${esc(target.condition)}` : ''}${target.effectiveObject ? ` · ${esc(target.effectiveObject)}` : ''}`;
      }).join(' · ')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

export async function renderSceneDestinationUsers(page, database) {
  const usages = await withCurrentOwnerRecord({kind: "scene-destination", page}, database,
    () => currentOwnerReferenceImpact());
  return renderSceneDestinationUserRows(usages);
}
