// @editor-module 模式组件嵌入所属字段对象的处理器选择与重置控件。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {UI_MODE_COMMANDS} from '../../core/ui-command-dispatch-owner.js';
import {writeAccessMarker} from '../../ui/write-access-marker.js';

export function uiCommandDispatchMarkup(command) {
  return UI_MODE_COMMANDS.includes(command)
    ? `<div data-ui-command-dispatch="${command}"></div>` : '';
}

export async function bindUiCommandDispatchControls(root, {rerender = () => {}} = {}) {
  const hosts = [...root.querySelectorAll('[data-ui-command-dispatch]')];
  if (!hosts.length) return;
  const cached = db.peekResourceDocument('code-module');
  const document = await db.getResourceDocument('code-module', null);
  if (!document?.records?.some(row => row.id === 'code-module.ui-mode-command-handlers')) return;
  if (!cached) {
    await rerender();
    return;
  }
  const object = (await db.getFieldObjects('code-module'))
    .find(row => row.id === 'code-module.ui-mode-command-handlers');
  if (!object) throw new TypeError('模式命令缺少字段对象');
  for (const host of hosts) {
    if (!host.isConnected || host.dataset.uiCommandDispatchBound) continue;
    const command = Number(host.dataset.uiCommandDispatch);
    const handle = `code-module:${command.toString(16).toUpperCase().padStart(2, '0')}`;
    const field = object.fields.find(row => row.entityHandle === handle);
    if (!field) throw new TypeError(`模式命令字段缺失：${handle}`);
    host.dataset.uiCommandDispatchBound = 'true';
    host.innerHTML = `<code>${esc(handle)}</code>
      ${writeAccessMarker({writebackMissing: field.writeback?.state === 'unpermitted'})}
      <div data-ui-command-field></div>
      <nav aria-label="影响界面">影响界面：<a class="editor-inline-link"
        href="?view=interfaceui&interface=field-mode">模式 ↗</a></nav>`;
    const control = host.querySelector('[data-ui-command-field]');
    control.addEventListener('field-object-saved', () => {
      void db.getResourceDocument('code-module', null).then(() => rerender());
    });
    await object.mount(control, {rowHandles: [handle], compactIdentity: true, rowHeader: null});
    control.querySelector('select').dataset.uiCommandHandler = '';
  }
}
