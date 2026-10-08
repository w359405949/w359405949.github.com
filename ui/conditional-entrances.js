// @editor-module 条件入口、触发者与存档事件位的往返链接。
import {esc} from '../core/dom.js';
import {eventFlagReferenceMarkup} from '../modules/save/event-flags.js';
import {conditionalEntranceState} from '../core/conditional-entrances.js';
import {controllerSceneHref} from '../core/controller-switch-links.js';

const link = (href, label, role) => href
  ? `<a class="editor-inline-link" data-conditional-entrance-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>`
  : esc(label);

function triggerMarkup(trigger, project) {
  const href = trigger.href || controllerSceneHref(trigger.scene_id, project,
    {object: trigger.object, point: trigger.point});
  return link(href, trigger.label, 'trigger');
}

export function conditionalEntranceMarkup(record, project, preview) {
  const condition = record?.appearance_condition;
  if (!condition) return '';
  const active = conditionalEntranceState(record, preview);
  return `<section data-conditional-entrance data-conditional-entrance-key="${esc(record.key || `transition:${record.id}`)}">
    <h3>出现条件 → 状态来源</h3>
    <p>${esc(condition.label)}</p>
    ${condition.persistence ? `<p>${esc(condition.persistence)}${condition.flags.length ? '' : ` → ${condition.triggers
      .map(trigger => triggerMarkup(trigger, project)).join(' · ')}`}</p>` : ''}
    ${condition.flags.map(flag => `<p>状态来源：${eventFlagReferenceMarkup(flag, {attributes: 'data-conditional-entrance-link="flag"'})}
      → ${(condition.triggers || []).filter(trigger => trigger.flag === flag)
        .map(trigger => triggerMarkup(trigger, project)).join(' · ') || '触发者未确认'}</p>`).join('')}
    <div class="scene-mode-switch" aria-label="入口条件预览">${condition.states.map(row =>
      `<button type="button" class="button ${row.id === active.id ? 'active' : ''}"
        data-conditional-entrance-state="${esc(row.id)}">${esc(row.label)}</button>`).join('')}</div>
    ${condition.note ? `<p>${esc(condition.note)}</p>` : ''}
    ${condition.destination ? `<p>${triggerMarkup(condition.destination, project)}</p>` : ''}
  </section>`;
}
