// @editor-module 剧情页的新建与 JSON 导入导出。
import {editorLog} from "../core/editor-log.js";
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {esc} from '../core/dom.js';
import {flushAllAutoSaves} from '../core/auto-save.js';
import {serializeStoryPageJson} from '../core/story-page-json.js';
import {storyPageDefinitionForView} from '../core/story-view-config.js';

export function storyPageIoMarkup() {
  return `<div class="story-page-io" data-story-page-io>
    ${storyPageDefinitionForView(state.view)?.editorOnly ? '<span title="暂不进 ROM">↛</span>' : ''}
    <button class="button" type="button" data-story-page-new>新增剧情页</button>
    <button class="button" type="button" data-story-page-import>导入 JSON</button>
    <button class="button" type="button" data-story-page-export>导出 JSON</button>
    ${state.view === 'story-page' ? '<button class="button" type="button" data-story-page-delete title="删除剧情页" aria-label="删除剧情页">×</button>' : ''}
    <input type="file" accept=".json,application/json" data-story-page-file hidden>
    <select data-story-custom-pages aria-label="项目剧情页" hidden></select>
    <pre data-story-page-error role="alert" hidden></pre>
  </div>`;
}

export async function bindStoryPageIo(root, rerender) {
  const toolbar = root.querySelector('[data-story-page-io]');
  if (!toolbar || toolbar.dataset.bound) return;
  toolbar.dataset.bound = '1';
  const page = state.view === 'story-page' ? state.storyPageId : state.view;
  const error = toolbar.querySelector('[data-story-page-error]');
  const run = async operation => {
    error.hidden = true;
    try {await flushAllAutoSaves(); await operation();}
    catch (failure) {
      editorLog.error("字段编辑", `操作失败：${failure?.message || failure}`, failure);error.textContent = failure.message || String(failure); error.hidden = false;}
  };
  toolbar.querySelector('[data-story-page-new]').addEventListener('click', () => run(async () => {
    const id = await db.createStoryPageDocument();
    location.href = `?view=story-page&storyPage=${encodeURIComponent(id)}&storyPaused=1`;
  }));
  toolbar.querySelector('[data-story-page-delete]')?.addEventListener('click', () => run(async () => {
    await db.deleteStoryPageDocument(page);
    location.href = '?view=story-sequence&storyPaused=1';
  }));
  toolbar.querySelector('[data-story-page-export]').addEventListener('click', () => run(async () => {
    const document = await db.exportStoryPageDocument(page);
    const url = URL.createObjectURL(new Blob([serializeStoryPageJson(document)], {type: 'application/json'}));
    const link = root.ownerDocument.createElement('a');
    link.href = url;
    link.download = `${document.title.replace(/[\\/:*?"<>|]/gu, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  const file = toolbar.querySelector('[data-story-page-file]');
  toolbar.querySelector('[data-story-page-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', () => run(async () => {
    const selected = file.files[0];
    if (!selected) return;
    await db.importStoryPageDocument(page, await selected.text());
    state.storySequenceId = null;
    file.value = '';
    await rerender();
  }));
  const pages = await db.listStoryPageDocuments();
  if (!toolbar.isConnected) return;
  const customPages = pages.filter(row => row.id.startsWith('custom-'));
  const switcher = toolbar.querySelector('[data-story-custom-pages]');
  switcher.hidden = !customPages.length;
  switcher.innerHTML = `${customPages.some(row => row.id === page) ? '' : '<option value="">项目剧情页</option>'}${
    customPages.map(row => `<option value="${esc(row.id)}" title="${esc(row.id)}"${row.id === page ? ' selected' : ''}>${esc(row.title)}</option>`).join('')}`;
  switcher.addEventListener('change', () => {
    const id = switcher.value;
    if (id) void run(async () => {
      location.href = `?view=story-page&storyPage=${encodeURIComponent(id)}&storyPaused=1`;
    });
  });
}
