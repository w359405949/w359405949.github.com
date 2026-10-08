// @editor-module 界面工作台共用场景位置选择与黑底清除。
import {editorLog} from "../core/editor-log.js";
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext, selectInterfacePreviewContext} from '../core/interface-preview-context.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../modules/scene/components.js';
import {replaceHistoryUrl, currentViewUrl} from '../core/router.js';

export function interfacePreviewSceneMarkup() {
  return '<span class="screen-workbench-selection" data-interface-preview-scene></span>';
}

export async function bindInterfacePreviewScene(root, {rerender}) {
  const host = root?.querySelector('[data-interface-preview-scene]');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = 'loading';
  try {
    const entries = (await db.getDocument('project.scenes')).editable_scenes;
    if (!host.isConnected) return;
    const scene = interfacePreviewContext().scene;
    host.innerHTML = `<span>预览场景</span>${scenePositionPickerMarkup({entries,
      sceneId: scene?.sceneId ?? -1, x: scene?.x ?? 8, y: scene?.y ?? 7,
      label: '预览场景', minSceneId: -1, deferCandidates: true, specialValueLabels: {'-1': '黑底'}})}
      <button class="button ghost" type="button" data-interface-preview-scene-clear${scene ? '' : ' disabled'} aria-label="清除预览场景">×</button>
      ${interfacePreviewContext().service ? `<span>配置 ${esc(interfacePreviewContext().service.argument)}</span>` : ''}
      <small data-interface-preview-scene-error role="status" hidden></small>`;
    if (!scene) host.querySelector('[data-scene-position-current]').hidden = true;
    const change = async value => {
      selectInterfacePreviewContext('scene', value);
      replaceHistoryUrl(currentViewUrl());
      await rerender();
    };
    hydrateScenePositionPicker(host.querySelector('[data-scene-position-picker]'), {entries,
      onConfirm: async value => {
        if (value.sceneId === -1) return change(null);
        if (!entries.some(entry => Number(entry.id) === value.sceneId)) return false;
        await change(value);
      }});
    host.querySelector('[data-interface-preview-scene-clear]').addEventListener('click', () => void change(null));
    host.dataset.ready = '1';
  } catch (error) {
    editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
    host.innerHTML = `<span role="status">${esc(error.message)}</span>`;
    delete host.dataset.ready;
  }
}
