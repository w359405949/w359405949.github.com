export function pickerVisibleOptions(options, {
  query = "", category = "", searchText, group, page = 0, pageSize = Infinity,
}) {
  const terms = String(query).trim().toLocaleLowerCase("zh-CN").split(/\s+/u).filter(Boolean);
  const matches = options.filter(option => (!category || group(option) === category)
    && terms.every(term => String(searchText(option) || "")
      .toLocaleLowerCase("zh-CN").includes(term)));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const selectedPage = Math.max(0, Math.min(page, pages - 1));
  return {matches, pages, page: selectedPage,
    visible: new Set(matches.slice(selectedPage * pageSize, (selectedPage + 1) * pageSize))};
}

export function markPickerSelection(options, value, valueOf, activeClass = "active") {
  options.forEach(option => {
    const selected = String(valueOf(option)) === String(value);
    option.classList.toggle(activeClass, selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

export function openPickerSurface(surface, {filter = null, selected = null} = {}) {
  if (!surface) return;
  if (surface.tagName === "DIALOG") {
    if (!surface.open) surface.showModal();
  } else surface.open = true;
  requestAnimationFrame(() => {
    filter?.focus({preventScroll: true});
    selected?.scrollIntoView({block: "nearest"});
  });
}

export function closePickerSurface(surface) {
  if (!surface?.open) return;
  if (surface.tagName === "DIALOG") surface.close();
  else surface.open = false;
}

const pickerPreviews = new WeakMap();

export function bindPickerPreview(list, {selector, render, initial = null} = {}) {
  if (!list) return;
  if (pickerPreviews.has(list)) {
    const state = pickerPreviews.get(list);
    state.render = render;
    if (initial) void state.show(initial);
    return state.show;
  }
  list.dataset.pickerPreviewBound = '1';
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  list.before(body);
  body.append(list, detail);
  const state = {render, show: null};
  pickerPreviews.set(list, state);
  let generation = 0;
  const show = async candidate => {
    const current = ++generation;
    if (!candidate) {detail.replaceChildren(); return;}
    try {
      const content = await state.render(candidate);
      if (current !== generation || !detail.isConnected) return;
      detail.removeAttribute('role');
      if (content instanceof globalThis.Node) detail.replaceChildren(content);
      else detail.innerHTML = String(content || '');
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (current !== generation) return;
      detail.textContent = error.message;
      detail.setAttribute('role', 'alert');
    }
  };
  state.show = show;
  for (const eventName of ['pointerover', 'focusin']) list.addEventListener(eventName, event => {
    const candidate = event.target.closest(selector);
    if (candidate && list.contains(candidate)) void show(candidate);
  });
  const surface = list.closest('details, dialog');
  surface?.addEventListener('toggle', () => {
    if (surface.open) {
      const candidate = list.querySelector('[aria-selected="true"]') || list.querySelector(selector);
      if (candidate) void show(candidate);
    }
  });
  if (initial) void show(initial);
  return show;
}

export function bindCanvasPickerPreview(canvas, {list = canvas, cellWidth = 8, cellHeight = 8,
  label = index => String(index)} = {}) {
  if (!canvas || canvas.dataset.pickerPreviewBound === '1') return;
  canvas.dataset.pickerPreviewBound = '1';
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  const image = document.createElement('canvas');
  image.width = cellWidth;
  image.height = cellHeight;
  const name = document.createElement('b');
  detail.append(name, image);
  list.before(body);
  body.append(list, detail);
  const paint = (column, row) => {
    name.textContent = label(row * Math.floor(canvas.width / cellWidth) + column);
    image.getContext('2d').clearRect(0, 0, cellWidth, cellHeight);
    image.getContext('2d').drawImage(canvas, column * cellWidth, row * cellHeight,
      cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
  };
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    paint(Math.floor((event.clientX - rect.left) * canvas.width / rect.width / cellWidth),
      Math.floor((event.clientY - rect.top) * canvas.height / rect.height / cellHeight));
  });
  const surface = canvas.closest('details');
  surface?.addEventListener('toggle', () => { if (surface.open) paint(0, 0); });
}import {editorLog} from "../core/editor-log.js";
