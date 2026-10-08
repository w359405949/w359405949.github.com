// @editor-module 场景字段对象共用的 16×16 元图块选择器。
import {bindPickerPreview, closePickerSurface, markPickerSelection,
  openPickerSurface, pickerVisibleOptions} from './picker-interaction.js';
const views = new WeakMap();

function copyCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

function paintCurrent(element) {
  const view = views.get(element);
  if (!view) return;
  const target = element.querySelector('[data-scene-metatile-current]');
  if (target) {
    target.replaceChildren();
    const image = view.images[view.value];
    if (image) target.append(copyCanvas(image));
    else target.textContent = `当前值 ${view.value}（不在已发布候选里）`;
  }
  const label = element.querySelector('[data-scene-metatile-value]');
  if (label) label.textContent = `$${Number(view.value).toString(16).toUpperCase().padStart(2, '0')}`;
  markPickerSelection([...element.querySelectorAll('[data-scene-metatile-id]')],
    view.value, button => button.dataset.sceneMetatileId);
}

export function setSceneMetatileValue(element, value) {
  const view = views.get(element);
  if (!view) return;
  view.value = Number(value);
  paintCurrent(element);
}

export function configureSceneMetatileSelector(element, {images, value, onSelect = null, presentation = 'picker'}) {
  if (!Array.isArray(images) || !images.length || images.some(image => !image?.matches?.('canvas')))
    throw new TypeError('场景元图块候选必须是已渲染的画布');
  if (onSelect !== null && typeof onSelect !== 'function')
    throw new TypeError('元图块选值回调必须是函数');
  if (!['picker', 'list'].includes(presentation))
    throw new TypeError('元图块候选显示方式无效');
  views.set(element, {images, value: Number(value), onSelect});
  element.classList.toggle('scene-metatile-list', presentation === 'list');
  const candidatesMarkup = '<div class="scene-metatile-candidates" role="listbox" aria-label="地图图块"></div>';
  element.innerHTML = presentation === 'list' ? candidatesMarkup
    : `<button type="button" class="button ghost scene-metatile-current" data-scene-metatile-open
    aria-label="选择元图块"><span data-scene-metatile-current></span><code data-scene-metatile-value></code></button>
    <dialog class="animated-resource-dialog scene-metatile-dialog">
      <form class="animated-resource-toolbar" method="dialog"><b>选择 16×16 元图块</b>
        <input type="search" data-scene-metatile-search aria-label="搜索元图块编号" placeholder="编号">
        <button class="button ghost" type="submit" value="cancel">关闭</button></form>
      ${candidatesMarkup}
    </dialog>`;
  paintCurrent(element);
  const dialog = element.querySelector('dialog');
  const candidates = element.querySelector('.scene-metatile-candidates');
  const showPreview = dialog && bindPickerPreview(candidates, {selector: '[data-scene-metatile-id]', render: button => {
    const preview = document.createElement('div');
    const label = document.createElement('b');
    label.textContent = button.textContent;
    preview.append(label, copyCanvas(images[Number(button.dataset.sceneMetatileId)]));
    return preview;
  }});
  const mountCandidates = () => {
    if (!candidates.childElementCount) {
      images.forEach((image, id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button ghost';
        button.dataset.sceneMetatileId = String(id);
        button.setAttribute('role', 'option');
        const label = `元图块 $${id.toString(16).toUpperCase().padStart(2, '0')}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.append(copyCanvas(image), document.createTextNode(`$${id.toString(16).toUpperCase().padStart(2, '0')}`));
        candidates.append(button);
      });
    }
    paintCurrent(element);
  };
  if (!dialog) mountCandidates();
  element.querySelector('[data-scene-metatile-open]')?.addEventListener('click', () => {
    mountCandidates();
    element.querySelector('[data-scene-metatile-search]').value = '';
    candidates.querySelectorAll('[data-scene-metatile-id]').forEach(button => {button.hidden = false;});
    openPickerSurface(dialog, {filter: element.querySelector('[data-scene-metatile-search]'),
      selected: candidates.querySelector('[aria-selected="true"]')});
  });
  element.querySelector('[data-scene-metatile-search]')?.addEventListener('input', event => {
    const options = [...candidates.querySelectorAll('[data-scene-metatile-id]')];
    const {visible} = pickerVisibleOptions(options, {query: event.target.value,
      searchText: button => {
        const id = Number(button.dataset.sceneMetatileId);
        const hex = id.toString(16).padStart(2, '0');
        return `${id} ${hex} $${hex} 0x${hex}`;
      }, group: () => ''});
    options.forEach(button => {button.hidden = !visible.has(button);});
    void showPreview(options.find(button => visible.has(button) && button.getAttribute('aria-selected') === 'true')
      || options.find(button => visible.has(button)));
  });
  candidates.addEventListener('click', event => {
    const button = event.target.closest('[data-scene-metatile-id]');
    if (!button) return;
    const selected = Number(button.dataset.sceneMetatileId);
    if (dialog) closePickerSurface(dialog);
    const view = views.get(element);
    const changed = selected !== view.value;
    setSceneMetatileValue(element, selected);
    view.onSelect?.(selected);
    if (changed) element.dispatchEvent(new CustomEvent('change', {bubbles: true, detail: {value: selected}}));
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closePickerSurface(dialog);
  });
}
