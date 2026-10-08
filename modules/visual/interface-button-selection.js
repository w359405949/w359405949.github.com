// @editor-module 按钮选中状态只改变预览的光标与父菜单高亮。
import {state} from '../../core/state.js';
import {esc} from '../../core/dom.js';

function selections(preview) {
  const projects = state.interfaceButtonSelections ||= new Map();
  const repository = state.projectRepository;
  if (!projects.has(repository)) projects.set(repository, new Map());
  const screens = projects.get(repository);
  if (!screens.has(preview.id)) screens.set(preview.id, {});
  return screens.get(preview.id);
}

function selectedIndex(preview, target) {
  const values = selections(preview);
  return Object.hasOwn(values, target) ? values[target]
    : target === 'parent' ? preview.menu_highlight?.choice_index : preview.runtime_context?.choice_index ?? 0;
}

export function interfaceButtonSelectionMarkup(preview, index, target = 'cursor') {
  if (!preview || index === null) return '';
  return `<label><input type="checkbox" data-interface-button-selected="${index}"
    data-interface-button-selection-target="${esc(target)}"${selectedIndex(preview, target) === index ? ' checked' : ''}>选中</label>`;
}

export function bindInterfaceButtonSelection(root, preview, {repaint = () => {}} = {}) {
  root.querySelectorAll('[data-interface-button-selected]').forEach(input => {
    input.checked = selectedIndex(preview, input.dataset.interfaceButtonSelectionTarget)
      === Number(input.dataset.interfaceButtonSelected);
    input.addEventListener('change', () => {
      selections(preview)[input.dataset.interfaceButtonSelectionTarget] = input.checked
        ? Number(input.dataset.interfaceButtonSelected) : null;
      void repaint();
    });
  });
}

export function interfaceButtonSelectionPreview(preview) {
  if (!preview) return preview;
  const values = selections(preview);
  const runtime = {...preview.runtime_context};
  let highlight = preview.menu_highlight;
  if (Object.hasOwn(values, 'cursor')) {
    runtime.cursor_hidden = values.cursor === null;
    if (values.cursor !== null) runtime.choice_index = values.cursor;
  }
  if (highlight && Object.hasOwn(values, 'parent')) {
    highlight = {...highlight, hidden: values.parent === null};
    if (values.parent !== null) runtime.parent_choice_index = values.parent;
  }
  return {...preview, runtime_context: runtime, ...(highlight ? {menu_highlight: highlight} : {})};
}
