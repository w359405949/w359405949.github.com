// @editor-module 全局事件位字段对象的只读引用显示。
import {esc} from '../../core/dom.js';
import {globalEventFlagEntry, prepareGlobalEventFlags} from '../../core/global-event-flags.js';
import {saveEventHref} from '../../core/save-page-links.js';
import {registerModuleComponent} from '../../ui/module-components.js';

export function eventFlagReferenceMarkup(value, {slot = 1, attributes = '', link = true, compact = false, label = null} = {}) {
  const row = globalEventFlagEntry(value);
  if (!row) return '—';
  const identity = `<span class="record-handle" data-resource-handle="${row.handle}">${row.handle}</span>`;
  const content = label == null ? `${identity}${compact ? '' : ` · <span data-event-flag-purpose>${esc(row.label)}</span>`}`
    : `<span data-resource-handle="${row.handle}">${esc(label)}</span>`;
  const title = label == null ? compact ? row.label : null : `${row.handle} · ${row.label}`;
  const props = `data-event-flag-reference="${row.handle}"${title ? ` title="${esc(title)}"` : ''} ${attributes}`;
  return link ? `<a class="editor-inline-link" ${props} href="${esc(saveEventHref(slot, row.id))}">${content} ↗</a>`
    : `<span ${props}>${content}</span>`;
}

export function eventFlagTextMarkup(text, {label = null} = {}) {
  const source = String(text || '').replace(/(?:0x|\$)([0-9A-F]{1,2})(?=\s*(?:读取|写入|修改)记录)/giu,
    (_, id) => `global-event-flag:${id.toUpperCase().padStart(2, '0')}`)
    .replace(/(?:全局事件\s*flag|全局事件位|事件位|global event flag|\bFLAG)\s*`?(?:0x|\$)([0-9A-F]{1,2})`?(?:\s*([-–])\s*`?\$([0-9A-F]{1,2})`?)?/giu,
    (_, first, separator, last) => `global-event-flag:${first.toUpperCase().padStart(2, '0')}${
      last ? `${separator}global-event-flag:${last.toUpperCase().padStart(2, '0')}` : ''}`);
  let result = '', cursor = 0;
  for (const match of source.matchAll(/global-event-flag:([0-9A-F]{2})\b/gu)) {
    result += esc(source.slice(cursor, match.index)) + eventFlagReferenceMarkup(match[0], {label});
    cursor = match.index + match[0].length;
  }
  return result + esc(source.slice(cursor));
}

registerModuleComponent('global-event-flag', 'reference', {
  prepare: async props => {await prepareGlobalEventFlags(); return props;},
  render: ({value, componentAttributes, slot, compact, label}) => eventFlagReferenceMarkup(value,
    {slot, attributes: componentAttributes, compact, label}),
});
