// @editor-module 交互绑定按记录句柄定位内容编辑页面。
import {esc} from '../core/dom.js';
import {serviceFamilyPage} from '../core/ui-page-registry.js';

export function interactionEditorHref(handle, argument = 0) {
  const parts = handle.split(':');
  const params = new URLSearchParams({resource: handle});
  if (parts[0] === 'record') {
    params.set('view', 'text');
    params.set('textMode', 'records');
    params.set('textRegion', parts[1]);
    params.set('textKind', 'all');
    params.set('textSearch', handle);
  } else if (['story-interaction-script', 'story-autonomous-script'].includes(parts[0])) {
    params.set('view', 'actors');
    params.set('actorPart', 'story');
    params.set('storyKind', parts[0] === 'story-interaction-script' ? 'interaction' : 'autonomous');
    params.set('record', String(Number.parseInt(parts.at(-1), 16)));
    return `?${params}#story-script-field-object`;
  } else if (parts[0] === 'application-command') {
    const command = Number.parseInt(parts[1], 16);
    const page = serviceFamilyPage(command);
    if (page) return `?${new URLSearchParams({...page.route, resource: handle,
      ...(page.route.view === 'shops' ? {shopConfig: argument} : {}),
      ...(page.route.view === 'vending' ? {vendingConfig: argument} : {}),
      ...(page.route.view === 'jukebox' ? {jukeboxConfig: argument} : {}),
      previewCommand: command, previewArgument: argument})}`;
    params.set('view', 'interfaceui');
    params.set('interface', 'interaction-service');
    params.set('record', String(argument));
  } else return '';
  return `?${params}`;
}

export function interactionEditorLink(href, label = '编辑交互内容') {
  return href ? `<a class="editor-inline-link" data-interaction-editor-link href="${esc(href)}" aria-label="${esc(label)}" title="${esc(label)}">↗</a>` : '';
}
