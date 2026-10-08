// @editor-module 固定文字列表的顺序控件由文本记录所属字段对象提供。
import {db} from '../../core/project-db.js';
import {state} from '../../core/state.js';
import {esc} from '../../core/dom.js';
import {fieldMenuHref} from '../../core/field-menu-tree.js';
import {dedicatedUiPageForScreen} from '../../core/ui-page-registry.js';
import {textRecordNodeId} from '../../core/text-record-project.js';
import {interfacePreviewContext, selectInterfacePreviewContext} from '../../core/interface-preview-context.js';
import {selectGameUiWorkbenchNode} from '../../views/game-ui-workbench.js';

const groups = new Set(['commands:20-27', 'commands:31-33', 'commands:41-44', 'field-tool-actions',
  'field-equipment-human-actions', 'field-equipment-vehicle-actions', 'field-adventure-options',
  'field-overview-categories', ...['main-guns', 'chassis', 'sub-guns', 'engines', 'special-guns', 'cunits']
    .map(name => `field-overview-${name}-fields`)]);

export function listOrderMarkup(groupId) {
  return groups.has(groupId) ? `<div data-list-order="${esc(groupId)}"></div>` : '';
}

export async function bindListOrderControls(root, {onSaved = () => {}} = {}) {
  const dispatch = state.project.ui.construction.menu_dispatch_data;
  for (const host of root.querySelectorAll('[data-list-order]')) {
    const group = dispatch.choice_groups.find(group => group.id === host.dataset.listOrder);
    if (!group || !groups.has(group.id)) continue;
    const object = await db.getFieldObject('text-record', group.record);
    if (!host.isConnected) return;
    const records = new Set([group.record, ...group.choices.flatMap(choice => {
      const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(choice.label_reference?.record || '');
      return match ? [textRecordNodeId(Number.parseInt(match[1], 16), Number.parseInt(match[2], 16))] : [];
    })]);
    const screens = state.project.ui.editor.screens.filter(screen =>
      screen.references?.some(reference => records.has(reference.target.replace(/^ui-(?:script|layout):/u, 'record:')))
      || dispatch.choice_groups.some(row => row.record === group.record
        && row.interface_state_ids?.includes(screen.interface_state_id)));
    const links = [...new Map(screens.flatMap(screen => {
      const target = state.project.ui.editor.screens.find(row =>
        row.id === screen.interface_state_screen_ids?.[0]) || screen;
      const destination = dedicatedUiPageForScreen(target);
      if (!destination) return [];
      const href = fieldMenuHref({pageId: destination.interfacePage, screenId: target.id});
      return [[href, `<a class="editor-inline-link" href="${esc(href)}">${esc(target.interface_state || target.label)}</a>`]];
    })).values()];
    const references = `<details data-list-order-affected><summary>受影响界面（${links.length}）</summary><p>${links.join('、')}</p></details>`; // structure-check-exempt 6: 所属文字字段的控件列出同一记录的界面引用。
    if (group.id.startsWith('field-overview-') && group.id.endsWith('-fields')) {
      host.innerHTML = `<label>预览属性<select data-list-attribute-preview>${group.choices.map((choice, index) =>
        `<option value="${index}"${index === (interfacePreviewContext().attribute ?? 0) ? ' selected' : ''}>属性 ${index + 1}</option>`
      ).join('')}</select></label>${references}`;
      host.querySelector('[data-list-attribute-preview]').addEventListener('change', event => {
        const index = Number(event.currentTarget.value);
        selectInterfacePreviewContext('attribute', index);
        selectGameUiWorkbenchNode(`interface-page:${state.interfacePage}`,
          `interface-button:${state.interfacePage}:${group.id}:${index}`);
        void onSaved();
      });
      for (const choice of group.choices) {
        const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(choice.label_reference?.record || '');
        if (!match) throw new TypeError('属性列表缺少文字记录引用');
        const id = textRecordNodeId(Number.parseInt(match[1], 16), Number.parseInt(match[2], 16));
        const label = await db.getFieldObject('text-record', id);
        if (!host.isConnected) return;
        const child = document.createElement('div'); host.append(child);
        await label.mount(child, {listOrder: {recordContent: true, onSaved}});
      }
    } else await object.mount(host, {listOrder: {group, onSaved, references}});
  }
}
