// @editor-module 赏金首行的击破与领取开关只改变预览上下文。
import {esc} from '../core/dom.js';
import {interfacePreviewWantedHistoryOverrides} from '../core/interface-preview-context.js';

export function fieldMenuWantedHistoryMarkup(id) {
  return /^wanted-history:\d+$/u.test(id)
    ? `<div data-field-menu-wanted-history="${esc(id)}"></div>` : '';
}

export function bindFieldMenuWantedHistory(root = document, {repaint = () => {}} = {}) {
  const preview = document.querySelector('[data-interface-page-workbench]')?.uiResolvedPreview;
  const overrides = interfacePreviewWantedHistoryOverrides();
  for (const host of root.querySelectorAll('[data-field-menu-wanted-history]')) {
    const id = host.dataset.fieldMenuWantedHistory;
    const row = preview?.preview_wanted_rows?.[id];
    if (!row || host.dataset.previewWantedReady) continue;
    host.dataset.previewWantedReady = '1';
    host.innerHTML = [['defeated', '已击破'], ['claimed', '已领取']].map(([flag, label]) =>
      `<label><input type="checkbox" data-wanted-history-flag="${flag}"${row[flag] ? ' checked' : ''}>${label}</label>`).join('');
    for (const input of host.querySelectorAll('[data-wanted-history-flag]')) {
      input.onchange = () => {
        overrides[row.wanted] = {...overrides[row.wanted], [input.dataset.wantedHistoryFlag]: input.checked};
        void repaint();
      };
    }
  }
}
