// @editor-module 界面按钮引用命令入口、图标选区与文本字段对象。
import {state} from '../../core/state.js';
import {esc} from '../../core/dom.js';
import {projectFieldDraftOrigin} from '../../core/project-field-draft.js';
import {fieldMenuEntries, fieldMenuHref} from '../../core/field-menu-tree.js';
import {interfacePageDefinition} from '../../core/ui-page-registry.js';
import {currentTextReference, currentTextChoiceLabel, indexedResource} from '../../core/resource-index.js';
import {textRecordComponents, textRecordRuntimeTokens, textRecordNodeId} from '../../core/text-record-project.js';
import {fieldMenuIconNodes, fieldMenuLoadoutSelection} from './field-menu.js';
import {selectionLayoutMarkup} from './selection-layout.js';
import {listOrderMarkup} from './list-order.js';
import {interfaceButtonSelectionMarkup} from './interface-button-selection.js';
import {uiCommandDispatchMarkup} from './ui-command-dispatch.js';
import {menuApplicationEntry} from './menu-application-dialogues.js';
import {uiChoiceComponentLabel} from '../../core/ui-component-labels.js';

const COMMON_CURSOR_HREF = '?view=interfaceui&interface=common-elements';

export function interfaceCursorReferenceMarkup() {
  return `<p class="interface-cursor-reference">光标 <a class="editor-inline-link" href="${esc(COMMON_CURSOR_HREF)}"
    title="公共界面元素">metasprite:30 ↗</a></p>`;
}

export function interfaceButtonSourceMarkup(recordId) {
  if (!recordId) return '';
  const source = currentTextReference(recordId);
  return `<button type="button" class="resource-inline-link" data-resource-target="${esc(source.uid)}"
    title="${esc(source.label)}">${esc(recordId)} ↗</button>`;
}

function buttonText(entry, construction) {
  const groupId = entry.groupId || {'non-battle-main-menu': 'commands:20-27',
    'party-strength': 'commands:31-33', 'field-mode': 'commands:41-44'}[entry.pageId];
  const group = construction?.menu_dispatch_data?.choice_groups?.find(group => group.id === groupId);
  const choice = group?.choices?.find(choice => choice.index === entry.index);
  const reference = choice?.label_reference;
  const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(reference?.record || '');
  let recordId = match ? `record:${match[1]}:${String(parseInt(match[2], 16)).padStart(3, '0')}` : entry.recordId;
  const document = state.project?.text_record_edits;
  const origin = projectFieldDraftOrigin(document) || document;
  const encoding = state.project?.text_record_encoding;
  const referenceChoice = group?.id === 'commands:41-44' && entry.index > 0;
  if (referenceChoice && encoding && document?.records?.[group.record]) {
    const token = textRecordRuntimeTokens(document.records[group.record], encoding, document)
      .filter(token => token.kind === 'fill' && token.token === 0xEA)[entry.index - 1];
    if (token) recordId = textRecordNodeId(0x13, token.operands[0]);
  }
  const record = origin?.records?.[recordId];
  const components = record && encoding ? textRecordComponents(record, encoding, origin) : [];
  const label = choice?.visible_text || entry.label;
  let component = (referenceChoice ? components.find(component => component.kind === 'text') : null)
    || components.find(component => component.text.trim() === label.trim())
    || components.find(component => component.text.trim().startsWith(label.trim()));
  if (!component && encoding) for (const reference of indexedResource(currentTextReference(recordId).uid)?.references || []) {
    if (reference.relation !== 'includes-record') continue;
    const target = indexedResource(reference.target)?.game_id;
    const child = origin?.records?.[target];
    if (!child) continue;
    const match = textRecordComponents(child, encoding, origin)
      .find(component => component.text.trim().startsWith(label.trim()));
    if (!match) continue;
    component = match;
    recordId = target;
    break;
  }
  return {recordId, ranges: component?.ranges, label: component?.kind === 'text'
    ? currentTextReference(recordId, {ranges: component.ranges}).label.trim()
    : currentTextChoiceLabel(reference) || label};
}

export function interfaceButtonNodes(pageId, screen, screens, preview) {
  const construction = state.project?.ui?.construction;
  const entries = fieldMenuEntries(pageId, construction, screens, {selectedScreen: pageId === 'non-battle-main-menu' ? null : screen,
    allScreens: state.project?.ui?.editor?.screens || [],
    choiceLabel: choice => currentTextChoiceLabel(choice.label_reference) || choice.visible_text});
  const icons = fieldMenuIconNodes(preview, screen?.id);
  if (pageId === 'non-battle-main-menu' && !icons.length) return [];
  return entries.filter(entry => preview?.menu_application?.choice == null
    || entry.groupId !== 'field-armor-confirm').map(entry => {
    entry = menuApplicationEntry(entry, preview);
    entry = {...entry, groupId: entry.groupId || {'non-battle-main-menu': 'commands:20-27',
      'party-strength': 'commands:31-33', 'field-mode': 'commands:41-44'}[pageId]};
    const icon = pageId === 'non-battle-main-menu' ? icons[entry.index] : null;
    const text = buttonText(entry, construction);
    const target = state.project?.ui?.editor?.screens?.find(screen => screen.id === entry.screenId);
    const targetLabel = entry.targetLabel || target?.interface_state || target?.label
      || interfacePageDefinition(entry.pageId)?.label || entry.label;
    const id = `interface-button:${pageId}:${entry.id}`;
    const cursorIndex = pageId === 'non-battle-main-menu' && screen?.interface_state_id !== 'field-command-menu.main'
      ? null : preview?.selection_cursor?.update_policy === 'retained'
        ? preview.runtime_context?.choice_index ?? 0 : entry.index ?? 0;
    const selectionTarget = pageId === 'non-battle-main-menu' && preview?.menu_highlight ? 'parent' : 'cursor';
    const selectionIndex = selectionTarget === 'parent' ? entry.index : cursorIndex;
    const group = construction?.menu_dispatch_data?.choice_groups?.find(group => group.id === entry.groupId);
    const choice = group?.choices?.find(choice => choice.index === entry.index);
    return {...icon, id, kind: 'button', label: icon ? entry.label : uiChoiceComponentLabel(group, choice, text.label), depth: 1,
      screenId: screen?.id, button: true, textComponents: true, entry, cursorIndex,
      sourceRecord: icon?.recordId || text.recordId,
      selection: icon?.selection || (text.ranges ? {record_id: text.recordId, ranges: text.ranges}
        : fieldMenuLoadoutSelection(preview, entry.index) || {record_id: text.recordId}),
      ...(icon ? {recordId: null} : text.ranges ? {recordId: text.recordId, ranges: text.ranges,
        editorId: id, editorMode: 'capacity', editorLabel: '文字'} : {}),
      controlsMarkup: `${interfaceButtonSelectionMarkup(preview, selectionIndex, selectionTarget)}${icon?.controlsMarkup || ''}<dl class="screen-workbench-facts">
        <div><dt>${icon ? '图标来源' : '文字来源'}</dt><dd>${interfaceButtonSourceMarkup(icon?.recordId || text.recordId)}</dd></div>
        <div><dt>跳转目标</dt><dd><a class="editor-inline-link" data-interface-button-target="${esc(entry.id)}"
          href="${esc(fieldMenuHref(entry))}">${esc(targetLabel)} ↗</a></dd></div>
      </dl>${listOrderMarkup(entry.groupId)}${uiCommandDispatchMarkup(entry.command)}${interfaceCursorReferenceMarkup()}${cursorIndex === null ? '' : selectionLayoutMarkup(preview, {choiceIndex: cursorIndex})}`,
    };
  });
}

export function interfaceWindowTree(nodes, buttons, preview) {
  const parents = new Map();
  let window = null;
  for (const layer of preview?.layers || []) {
    if (layer.kind === 'layout') {
      window = layer.record;
      parents.set(window, window);
    } else if (layer.record && window) {
      const pending = [layer.record];
      const seen = new Set();
      while (pending.length) {
        const record = pending.pop();
        if (!record || seen.has(record)) continue;
        seen.add(record);
        parents.set(record, window);
        for (const reference of indexedResource(currentTextReference(record).uid)?.references || []) {
          if (reference.relation === 'includes-record') pending.push(indexedResource(reference.target)?.game_id);
        }
      }
    }
  }
  const layouts = nodes.filter(node => node.kind === 'layout');
  const children = [...nodes.filter(node => !['screen', 'layout'].includes(node.kind)), ...buttons];
  const parentFor = node => parents.get(node.sourceRecord) || parents.get(node.recordId)
    || parents.get(node.selection?.record_id);
  const roots = nodes.filter(node => node.kind === 'screen');
  const arranged = [...roots];
  const used = new Set();
  for (const layout of layouts) {
    arranged.push({...layout, depth: 1});
    const record = layout.facts?.find(fact => fact.label === '布局记录')?.value;
    for (const child of children.filter(node => !used.has(node.id) && parentFor(node) === record)) {
      arranged.push({...child, depth: 2 + Math.max(0, (child.depth || 1) - 1)});
      used.add(child.id);
    }
  }
  arranged.push(...children.filter(node => !used.has(node.id)).map(node => ({...node, depth: Math.max(1, node.depth || 1)})));
  return arranged;
}
