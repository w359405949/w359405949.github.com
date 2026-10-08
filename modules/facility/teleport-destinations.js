// @editor-module 传真与传送终端引用同一目的地目录。
import {esc} from '../../core/dom.js';
import {currentTextReference, currentTextReferenceLink} from '../../core/resource-index.js';
import {saveEventHref} from '../../core/save-page-links.js';
import {interfacePreviewContext} from '../../core/interface-preview-context.js';
import {eventFlagReferenceMarkup} from '../save/event-flags.js';

export function teleportDestinationsMarkup(project, {query = ''} = {}) {
  const configuration = project?.facilities?.facilities?.find(row => row.id === 'teleport-terminal')?.configuration;
  if (!configuration) return '';
  const search = query.trim().toLowerCase();
  const destinations = (configuration.destinations || []).filter(row =>
    !search || JSON.stringify(row).toLowerCase().includes(search));
  const slot = interfacePreviewContext().slot;
  const flag = configuration.destinations?.[0]?.availability_flag;
  const availability = Number.isInteger(flag) && flag >= 0 && flag <= 255
    ? `<a class="button ghost" href="${esc(saveEventHref(slot, flag))}">存档开启状态 ↗</a>`
    : '<span class="muted">缺少目的地开放标志</span>';
  return `<section class="panel" data-teleport-destinations>
    <header><h2>目的地目录</h2>${availability}</header>
    <div class="section-line"><h3>传送列表</h3><span>${destinations.length} / ${configuration.destination_count} 项</span></div>
    <div class="table-wrap"><table><thead><tr><th>目的地</th><th>开放标志</th><th>落点</th><th>句柄</th><th>显示文字</th></tr></thead>
    <tbody>${destinations.map(row => {
      const uid = `ui-facility:teleport-terminal:config:${Number(row.id).toString(16).toUpperCase().padStart(2, '0')}`;
      return `<tr data-resource-uid="${uid}" data-teleport-destination-id="${row.id}">
        <td><b>${esc(currentTextReference(row.text_record).label.trim())}</b></td>
        <td>${eventFlagReferenceMarkup(row.availability_flag, {slot})}</td>
        <td>scene:00 · (${Number(row.coordinate_x)}, ${Number(row.coordinate_y)})</td>
        <td><button class="resource-uid" type="button" data-resource-query="${uid}">${uid}</button></td>
        <td>${currentTextReferenceLink(row.text_record)}</td></tr>`;
    }).join('')}</tbody></table></div></section>`;
}
