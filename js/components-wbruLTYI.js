import { setReferencePickerValue, esc, referencePickerMarkup, applySceneTownNames, paintSceneThumbnailCanvases, hydrateReferenceFieldPickers, handleMarkup, recordUid, registerReferencePickerEnhancement, registerReferenceFieldPresentation, registerModuleComponent, referenceFieldPickerMarkup, markPickerSelection, refreshReferencePickerGroups, loadSceneElevators, sceneElevatorDestinations } from './monster-figure-C07vG7yu.js';
import './project-store-values-klefznSR.js';
import './emulator-Bl-sLXnd.js';
import { db } from './scene-actors-Cftr7mCE.js';
import { sceneAnnotationsMarkup, positionSceneAnnotations, bindScenePreview, paintScenePreviewById, setScenePreviewPoint, scenePreviewMarkup as scenePreviewMarkup$1 } from './timeline-player-C0h-EABn.js';

// @editor-module 场景选择器按世界入口与固定场景连接投影分组。
const hex = id => Number(id).toString(16).toUpperCase().padStart(2, '0');

function scenePickerVariants(lifecycle) {
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap').map(row => ({
    handle: row.handle, source: row.source_scene_reference,
    target: row.target_scene_reference, flag: row.global_event_flag_reference,
  }));
}

function buildScenePickerGroups(entries, logic, elevatorConnections = [], lifecycle = null) {
  const scenes = new Map(entries.map(entry => [Number(entry.id), entry]));
  const variants = scenePickerVariants(lifecycle);
  const connections = [
    ...(logic.point_transitions || []).map(row => ({...row, kind: 'transition'})),
    ...(logic.boundary_exits || []).map(row => ({...row, kind: 'boundary'})),
    ...(logic.investigation_special_points || []).filter(row =>
      Number.isInteger(row.fixed_behavior?.destination_scene_id)).map(row => ({
      ...row, ...row.fixed_behavior, kind: 'investigation',
    })),
    ...elevatorConnections,
    ...variants.map(row => ({kind: 'scene-remap', resource_id: row.handle,
      scene_id: Number.parseInt(row.source.split(':').at(-1), 16),
      destination_scene_id: Number.parseInt(row.target.split(':').at(-1), 16),
      event_flag_reference: row.flag})),
  ].filter(row => scenes.has(Number(row.scene_id))
    && scenes.has(Number(row.destination_scene_id)));
  const adjacency = new Map(entries.map(entry => [Number(entry.id), new Set()]));
  for (const row of connections) {
    if (Number(row.destination_scene_id) !== 0)
      adjacency.get(Number(row.scene_id)).add(Number(row.destination_scene_id));
  }
  const roots = new Map();
  for (const row of connections.filter(row => Number(row.scene_id) === 0
      && Number(row.destination_scene_id) !== 0)) {
    const scene = scenes.get(Number(row.destination_scene_id));
    const location = scene.name.split(' · ')[0];
    const key = scene.name_reference ? `${scene.name_reference}:${location}` : `entrance:${hex(scene.id)}`;
    if (!roots.has(key)) roots.set(key, {id: key, entry: scene,
      entrances: [], seeds: new Set()});
    const group = roots.get(key);
    group.entrances.push({handle: row.resource_id || `${row.kind}:00:${hex(row.id)}`,
      x: row.x, y: row.y, sceneId: Number(row.destination_scene_id)});
    group.seeds.add(Number(scene.id));
  }
  const memberships = new Map(entries.map(entry => [Number(entry.id), []]));
  const primary = new Map();
  for (const group of roots.values()) {
    const distances = new Map([...group.seeds].map(id => [id, 0])), pending = [...group.seeds];
    for (let index = 0; index < pending.length; index++) {
      for (const target of adjacency.get(pending[index]) || []) {
        if (distances.has(target)) continue;
        distances.set(target, distances.get(pending[index]) + 1);
        pending.push(target);
      }
    }
    for (const [id, distance] of distances) {
      memberships.get(id).push(group.id);
      if (!primary.has(id) || distance < primary.get(id).distance)
        primary.set(id, {group: group.id, distance});
    }
  }
  const groups = [...roots.values()].map(group => ({...group, seeds: [...group.seeds]}));
  groups.unshift({id: 'world', entry: scenes.get(0), entrances: [], seeds: [0]});
  groups.push({id: 'unreachable', label: '不可达场景', entrances: [], seeds: []});
  const rows = entries.map(entry => {
    const id = Number(entry.id), reached = memberships.get(id);
    const group = id === 0 ? 'world' : primary.get(id)?.group || 'unreachable';
    return {sceneId: id, group, reachableGroups: reached,
      distance: primary.get(id)?.distance ?? null,
      otherGroups: reached.filter(id => id !== group),
      reason: id !== 0 && reached.length === 0 ? '没有世界入口的固定连接路径' : ''};
  });
  return {groups, rows, connections, variants};
}

function scenePickerGroupLabel(group) {
  return group.entry?.name.split(' · ')[0] || group.label;
}

// @editor-module scene-header-map 字段对象对外提供的封面与引用选择组件
//
// 消费者只传 scene ID（以及自己原有的精确值控件）；场景目录、显示名、尺寸、
// 缩略图标记与像素绘制都留在 scene-header-map 字段对象这一侧。


const SCENE_MODULE_ID = "scene-header-map";

function scenePickerEntries(catalog) {
  const scenes = {editable_scenes: catalog.editable_scenes.map(entry =>
    Object.getOwnPropertyDescriptor(entry, 'name')?.get ? entry : {...entry})};
  applySceneTownNames({scenes});
  return scenes.editable_scenes;
}

async function loadScenePickerGroups(database = db) {
  const [scenes, logic, facilities, configuration, lifecycle] = await Promise.all([
    database.getDocument('project.scenes'), database.getDocument('project.scenes.logic'),
    database.getResourceDocument('ui-facility'), database.getResourceDocument('facility-config'),
    database.getResourceDocument('field-scene-lifecycle-service'),
  ]);
  const entries = scenePickerEntries(scenes);
  const elevators = await loadSceneElevators(database, entries);
  const family = configuration.families.find(row => Number(row.id) === 0x0f);
  const records = new Map(configuration.records.map(row => [row.id, row]));
  const elevatorConnections = elevators.flatMap(({scene, elevator}) => {
    const instance = family.records.find(row => Number(row.id) === elevator.instance_id);
    const values = records.get(instance.record_id).slots.map(slot => slot.value);
    return sceneElevatorDestinations(elevator, values, facilities, scenes).map(row => ({
      kind: 'elevator', scene_id: Number(scene.id), destination_scene_id: row.sceneId,
      resource_id: elevator.configuration_handle, x: elevator.x, y: elevator.y,
    }));
  });
  return buildScenePickerGroups(entries, logic, elevatorConnections, lifecycle);
}

let pickerGroupsPromise = null;

function enhanceScenePicker(picker) {
  const details = picker.querySelector(':scope > details');
  const menu = details?.querySelector('.module-reference-picker-menu');
  if (!menu) return;
  picker.dataset.referencePickerCustomConfirm = 'true';
  const positionPicker = picker.closest('[data-scene-position-picker]');
  const readOnly = positionPicker?.dataset.scenePositionReadOnly === 'true';
  const list = menu.querySelector('[data-reference-picker-list]');
  menu.querySelector('.module-reference-picker-groups')?.remove();
  menu.querySelector('[data-reference-picker-pagination]')?.remove();
  menu.querySelector('[data-reference-picker-detail]')?.remove();
  const options = [...list.querySelectorAll('[data-reference-picker-option]')];
  const searchText = new Map(options.map(option => [option, option.dataset.referencePickerSearch]));
  const layout = document.createElement('div');
  layout.className = 'module-reference-picker-body scene-picker-layout';
  const groupsColumn = document.createElement('div');
  groupsColumn.className = 'scene-picker-groups';
  const path = document.createElement('nav');
  path.className = 'scene-picker-path';
  path.setAttribute('aria-label', '场景路径');
  const filter = menu.querySelector('[data-reference-picker-filter]');
  const left = document.createElement('div');
  left.className = 'scene-picker-list';
  left.append(list);
  const right = positionPicker?.querySelector('.scene-position-detail') || document.createElement('div');
  right.classList.add('scene-picker-detail');
  if (!positionPicker) right.innerHTML = `<b data-scene-picker-name></b>${scenePointPreviewMarkup({canvasLabel: '场景预览'})}
    <div class="scene-position-actions"><button class="button" type="button" data-scene-picker-confirm>确认</button></div>`;
  const heading = document.createElement('div');
  heading.className = 'scene-picker-heading';
  const name = right.querySelector('[data-scene-picker-name]');
  name.before(heading);
  heading.append(name);
  heading.insertAdjacentHTML('beforeend',
    '<a class="editor-inline-link" data-scene-picker-preview-link title="场景详情" aria-label="场景详情" hidden>↗</a>');
  heading.insertAdjacentHTML('afterend', '<div data-scene-picker-variants></div>');
  layout.append(groupsColumn, left, right);
  menu.replaceChildren(path, menu.querySelector('.module-reference-picker-filter'), layout);
  picker.classList.add('scene-reference-field');
  let pendingValue = picker.dataset.moduleReferenceValue;
  let entries = [];
  let projection = null;
  const updatePath = (groupId = null) => {
    const id = sceneIdFromReference({value: pendingValue});
    const row = projection?.rows.find(row => row.sceneId === id);
    const group = projection?.groups.find(group => group.id === (groupId ?? row?.group));
    const entry = entries.find(entry => Number(entry.id) === id);
    path.innerHTML = group ? `<button type="button" data-reference-picker-category="${esc(group.id)}">${esc(scenePickerGroupLabel(group))}</button>${entry && row?.group === group.id
      ? `<span aria-hidden="true">›</span><span>${esc(entry.name)}</span>` : ''}` : '';
  };
  const summary = details.querySelector('summary');
  if (!positionPicker) summary.insertAdjacentHTML('beforeend',
    '<a class="editor-inline-link" data-scene-picker-current-link title="场景详情" aria-label="场景详情" hidden>↗</a>');
  const updateCurrentLink = () => {
    const id = sceneIdFromReference({value: picker.dataset.moduleReferenceValue});
    const entry = entries.find(row => Number(row.id) === id);
    const link = summary.querySelector('[data-scene-picker-current-link]');
    if (!link) return;
    const href = sceneDetailHref(entry);
    link.hidden = !href;
    if (href) {
      link.href = href;
      link.textContent = `scene:${sceneIdHex(entry)} ↗`;
    }
  };
  new MutationObserver(() => {
    updateCurrentLink();
    if (positionPicker && details.open) {
      pendingValue = picker.dataset.moduleReferenceValue;
      paint();
    }
  }).observe(picker, {attributes: true, attributeFilter: ['data-module-reference-value']});
  if (!positionPicker) {
    void db.getDocument('project.scenes').then(catalog => {
      entries = catalog.editable_scenes;
      updateCurrentLink();
    });
  }
  const paint = () => {
    const entry = entries.find(row => Number(row.id) === sceneIdFromReference({value: pendingValue}));
    const link = right.querySelector('[data-scene-picker-preview-link]');
    const href = sceneDetailHref(entry);
    link.hidden = !href;
    if (href) link.href = href;
    right.querySelector('[data-scene-picker-variants]').innerHTML = sceneVariantMarkup(
      entry?.id, projection?.variants || [], entries);
    updatePath();
    updateCurrentLink();
    if (positionPicker) {
      if (readOnly) positionPicker.dispatchEvent(new CustomEvent('scene-position-preview-change', {
        detail: {sceneId: sceneIdFromReference({value: pendingValue})},
      }));
      return;
    }
    right.querySelector('[data-scene-picker-name]').textContent = entry?.name || '';
    void paintScenePointPreview(right.querySelector('[data-scene-point-preview]'), {entry, x: null, y: null});
  };
  for (const option of options) {
    if (!positionPicker || readOnly) option.setAttribute('data-reference-picker-preview-only', '');
    option.addEventListener('click', () => {
      if (option.disabled) return;
      pendingValue = option.dataset.referencePickerOption;
      if (!positionPicker || readOnly) markPickerSelection(options, pendingValue, node => node.dataset.referencePickerOption);
      paint();
    });
    option.addEventListener('focus', () => option.click());
  }
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-reference-picker-category]');
    if (!button || button.closest('[data-module-reference-picker]') !== picker) return;
    filter.value = '';
    filter.dispatchEvent(new Event('input'));
    if (!path.contains(button)) updatePath(button.dataset.referencePickerCategory);
  });
  right.querySelector('[data-scene-picker-confirm]')?.addEventListener('click', () => {
    void setReferencePickerValue(picker, pendingValue, {
      emit: true, paint: paintSceneReferenceThumbnails,
    });
    details.open = false;
  });
  details.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing && details.open
        && !event.target.closest('button:not([role="option"]), summary, a')) {
      event.preventDefault();
      event.stopPropagation();
      const confirm = right.querySelector('[data-scene-picker-confirm], [data-scene-position-confirm]');
      confirm?.click();
      return;
    }
    if (event.key !== 'Escape' || !positionPicker) return;
    details.open = positionPicker.open = false;
    positionPicker.querySelector('summary').focus();
  });
  details.addEventListener('toggle', async () => {
    if (!details.open) return;
    pendingValue = picker.dataset.moduleReferenceValue;
    if (readOnly) filter.value = '';
    try {
      pickerGroupsPromise ||= loadScenePickerGroups();
      const [groupsProjection, catalog] = await Promise.all([pickerGroupsPromise, db.getDocument('project.scenes')]);
      if (!picker.isConnected || !details.open) return;
      projection = groupsProjection;
      entries = scenePickerEntries(catalog);
      const rows = new Map(projection.rows.map(row => [row.sceneId, row]));
      const groups = new Map(projection.groups.map(group => [group.id, group]));
      const containers = new Map();
      for (const option of options) {
        const id = sceneIdFromReference({value: option.dataset.referencePickerOption});
        const row = rows.get(id), group = groups.get(row?.group);
        const key = group?.id || 'special';
        const label = group ? scenePickerGroupLabel(group) : '其他';
        if (!containers.has(key)) {
          const container = document.createElement('div');
          container.dataset.referencePickerGroup = key;
          container.setAttribute('role', 'group');
          container.setAttribute('aria-label', label);
          const heading = document.createElement('h4');
          heading.textContent = label;
          if (key === 'unreachable') heading.title = '没有世界入口的固定连接路径';
          container.append(heading);
          containers.set(key, container);
        }
        const entry = entries.find(entry => Number(entry.id) === id);
        option.querySelector('[data-reference-picker-option-copy] b').textContent = entry?.name || option.querySelector('b').textContent;
        const others = (row?.otherGroups || []).map(id => scenePickerGroupLabel(groups.get(id)));
        option.querySelector('.scene-picker-variant')?.remove();
        const variantText = sceneVariantText(id, projection.variants);
        if (variantText) {
          const annotation = document.createElement('span');
          annotation.className = 'scene-picker-variant';
          annotation.textContent = variantText;
          option.querySelector('[data-reference-picker-option-copy]').append(annotation);
        }
        option.title = [`scene:${sceneIdHex({id})}`, row?.reason,
          variantText,
          others.length ? `另可达：${others.join('、')}` : '',
          ...(row?.reachableGroups || []).map(id => scenePickerGroupLabel(groups.get(id)))].filter(Boolean).join(' · ');
        option.dataset.referencePickerSearch = [searchText.get(option), entry?.name, label,
          ...(row?.reachableGroups || []).map(id => scenePickerGroupLabel(groups.get(id)))].filter(Boolean).join(' ').toLowerCase();
        containers.get(key).append(option);
      }
      list.replaceChildren(...projection.groups.map(group => containers.get(group.id)).filter(Boolean),
        ...(containers.has('special') ? [containers.get('special')] : []));
      markPickerSelection(options, pendingValue, node => node.dataset.referencePickerOption);
      refreshReferencePickerGroups(picker);
      const navigation = menu.querySelector('.module-reference-picker-groups');
      groupsColumn.replaceChildren(...(navigation ? [navigation] : []));
      paint();
      picker.dataset.scenePickerGroupsReady = '1';
    } catch (error) {
      pickerGroupsPromise = null;
      const status = document.createElement('p');
      status.setAttribute('role', 'alert');
      status.textContent = error.message;
      right.querySelector('[data-scene-picker-error]')?.remove();
      status.dataset.scenePickerError = '';
      right.append(status);
    } finally {
      pickerGroupsPromise = null;
    }
  });
}

function sceneVariantText(id, variants) {
  const handle = `scene:${sceneIdHex({id})}`;
  return variants.filter(row => [row.source, row.target].includes(handle))
    .map(row => `${row.source} → ${row.target} · ${row.flag} = 1`).join('；');
}

function sceneVariantMarkup(id, variants, entries) {
  const handle = `scene:${sceneIdHex({id})}`;
  const sceneLink = reference => {
    const entry = entries.find(entry => `scene:${sceneIdHex(entry)}` === reference);
    const href = sceneDetailHref(entry);
    return href ? `<a class="editor-inline-link" href="${esc(href)}">${esc(reference)}</a>` : esc(reference);
  };
  return variants.filter(row => [row.source, row.target].includes(handle)).map(row =>
    `<p class="scene-variant">变体 ${sceneLink(row.source)} → ${sceneLink(row.target)} · ${handleMarkup(row.flag, {})} = 1</p>`).join('');
}

registerReferencePickerEnhancement(SCENE_MODULE_ID, enhanceScenePicker);

function sceneId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry?.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function sceneIdFromReference({sceneId: requestedId, handle = "", value = ""} = {}) {
  if (requestedId !== null && requestedId !== undefined && requestedId !== "") {
    return sceneId({id: requestedId});
  }
  const reference = String(handle || value || "").trim();
  const match = /^scene:([0-9a-f]{1,2})$/iu.exec(reference);
  if (match) return Number.parseInt(match[1], 16);
  return sceneId({id: reference});
}

function sceneIdHex(entry) {
  const id = sceneId(entry);
  return id === null
    ? "??"
    : id.toString(16).toUpperCase().padStart(2, "0");
}

function scenePositionInputId(input) {
  const match = /^(?:\$|0x)?([0-9a-f]{1,2})$/iu.exec(input.value.trim());
  const id = match ? Number.parseInt(match[1], 16) : null;
  const valid = id !== null && id >= Number(input.min) && id <= Number(input.max);
  input.setCustomValidity(valid ? ''
    : `场景 ID 必须是 $${sceneIdHex({id: input.min})}..$${sceneIdHex({id: input.max})} 的十六进制编号`);
  return valid ? id : null;
}

function scenePositionSummary(name, selectedId, x, y) {
  const hex = sceneIdHex({id: selectedId});
  const scene = name === `场景 $${hex}` || name === `场景 ${hex}`
    ? name : `${name} · 0x${hex}`;
  return Number.isInteger(Number(x)) && Number.isInteger(Number(y))
    && x !== null && y !== null ? `${scene} · ${x}, ${y}` : scene;
}

function sceneCoordinatesText(x, y) {
  return x !== null && y !== null && x !== "" && y !== ""
    && Number.isInteger(Number(x)) && Number.isInteger(Number(y))
    ? `${x}, ${y}` : "";
}

function scenePositionPointMarkup(entry, x, y) {
  if (!entry || x === null || y === null || !Number.isInteger(x) || !Number.isInteger(y)
      || x < 0 || y < 0 || x >= entry.width || y >= entry.height) return '';
  return `<span class="scene-position-point" data-scene-annotation="point"
    data-scene-x="${x}" data-scene-y="${y}" aria-label="落点 ${x}, ${y}"></span>`;
}

function scenePositionHandleMarkup(id, specialValueLabels) {
  return Object.hasOwn(specialValueLabels, id) ? esc(specialValueLabels[id])
    : handleMarkup(recordUid("scene", id));
}

function sceneDetailHref(entry, {x = null, y = null, sceneObject = "", encounterZone = null} = {}) {
  if (!entry?.slug) return "";
  const params = new URLSearchParams({view: "scenes", scene: entry.slug});
  if (sceneObject) params.set("sceneObject", sceneObject);
  else if (Number.isInteger(Number(x)) && Number.isInteger(Number(y))
      && x !== null && y !== null) params.set("scenePoint", `${x},${y}`);
  if (encounterZone !== null) {
    params.set("sceneMode", "encounters");
    params.set("encounterZone", String(encounterZone));
  }
  return `?${params}`;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function thumbnailMarkup(entry, {
  cellSize = null,
  width = 72,
  height = 44,
  className = "scene-reference-thumbnail",
  label = null,
  title = "",
  crop = "",
} = {}) {
  const id = sceneId(entry);
  if (id === null) return "";
  const requestedScale = Number(cellSize);
  const minimumScale = id === 0 ? 1 : 8;
  const scale = Number.isInteger(requestedScale)
      && requestedScale >= 1 && requestedScale <= 16
    ? Math.max(requestedScale, minimumScale) : minimumScale;
  const fixedWidth = positiveInteger(width, 72);
  const fixedHeight = positiveInteger(height, 44);
  return `<canvas class="${esc(className)}" data-scene-thumb="${id}"
    data-scene-thumb-cell="${scale}" data-scene-thumb-width="${fixedWidth}"
    data-scene-thumb-height="${fixedHeight}"
    ${crop ? `data-scene-thumb-crop="${esc(crop)}"` : ""}
    title="${esc(title || [scenePositionSummary(entry?.name || `场景 ${sceneIdHex(entry)}`, id, null, null),
      entry?.width && entry?.height ? `${entry.width}×${entry.height}` : ""].filter(Boolean).join(" · "))}"
    aria-label="${esc(label || `${entry?.name || `场景 ${sceneIdHex(entry)}`}预览`)}"></canvas>`;
}

function sceneReferenceItem(entry) {
  const id = sceneId(entry);
  if (id === null) return null;
  const idHex = sceneIdHex(entry);
  const width = Number(entry?.width) || 0;
  const height = Number(entry?.height) || 0;
  const name = String(entry?.name || `场景 ${idHex}`);
  const slug = String(entry?.slug || "");
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description: slug,
    group: id === 0 ? "world" : "scene",
    groupLabel: id === 0 ? "世界地图" : "场景",
    meta: width && height ? `${width}×${height}` : "",
    preview: thumbnailMarkup(entry),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      `scene:${idHex}`,
      name,
      slug,
      width && height ? `${width}x${height}` : "",
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

// 候选行到显示项、过滤提示和像素绘制由 owner 登记一次；场景工作台自己的 picker
// 与字段表里的 scene 引用随后走同一装配层。
registerReferenceFieldPresentation(SCENE_MODULE_ID, {
  item: sceneReferenceItem,
  paint: paintSceneReferenceThumbnails,
  className: "scene-reference-field",
  filterLabel: "过滤场景",
  filterPlaceholder: "ID／名称／标识／尺寸",
});

registerModuleComponent(SCENE_MODULE_ID, "reference", {
  prepare: async props => ({...props,
    entries: scenePickerEntries(await db.getDocument("project.scenes")),
  }),
  render: ({entries = [], value, label, controlMarkup, componentAttributes, picker = {}}) => {
    return referenceFieldPickerMarkup({
      reference: {module: SCENE_MODULE_ID, key: ["id"]}, rows: entries,
      value, label, controlMarkup, componentAttributes, picker,
    });
  },
  hydrate: hydrateSceneReferencePickers,
});

/** 可独立嵌进引用单元格、卡片或其他 owner 下拉框的场景封面。 */
function scenePreviewMarkup({
  entry,
  sceneId: requestedId = null,
  handle = "",
  value = "",
  name = "",
  cellSize = null,
  width = 96,
  height = 58,
  interactive = true,
  showName = false,
  detailLinkMarkup = "",
  className = "",
  componentAttributes = "",
} = {}) {
  const resolvedId = sceneIdFromReference({sceneId: requestedId ?? entry?.id, handle, value});
  const requestedEntry = {id: resolvedId};
  const requestedHex = sceneIdHex(requestedEntry);
  const fixedWidth = positiveInteger(width, 96);
  const fixedHeight = positiveInteger(height, 58);
  const resolved = entry || {
    id: resolvedId,
    name: name || (requestedHex === "??" ? "未知场景" : `场景 ${requestedHex}`),
  };
  if (!interactive) return `<span${showName ? ' class="scene-reference-inline"' : ''} ${componentAttributes}>${thumbnailMarkup(resolved, {
    width: fixedWidth, height: fixedHeight, cellSize,
  })}${showName ? `<span>${esc(resolved.name)}</span>` : ''}</span>`;
  return scenePositionPickerMarkup({entries: [resolved], sceneId: resolvedId,
    x: null, y: null, disabled: true, label: "场景",
    componentAttributes, className, detailLinkMarkup,
    thumbnailWidth: fixedWidth, thumbnailHeight: fixedHeight, cellSize});
}

// The shared thumbnail painter reports failures on the canvas. Surface them in
// the picker too, so a missing preview never looks like a successful blank map.
async function paintSceneReferenceThumbnails(root) {
  if (root.closest('[data-reference-picker-option]')) return;
  await paintSceneThumbnailCanvases(root);
  for (const canvas of root.querySelectorAll("canvas[data-scene-thumb]")) {
    const reason = canvas.dataset.sceneThumbError
      || (canvas.dataset.sceneThumbPainted !== "1" ? "场景绘制未返回图像" : "");
    if (!reason || !canvas.isConnected) continue;
    const message = document.createElement("span");
    message.className = "scene-reference-preview-error";
    message.setAttribute("role", "alert");
    message.textContent = `场景预览不可用：${reason}`;
    canvas.replaceWith(message);
  }
}

/** A full scene and a semantic grid point, rendered by the scene-header-map field object. */
function scenePointPreviewMarkup({canvasLabel = "停放场景图"} = {}) {
  return `<figure class="scene-point-preview" data-scene-point-preview>
    ${scenePreviewMarkup$1({label: canvasLabel, viewportClassName: 'scene-point-scroll',
      surfaceClassName: 'scene-point-surface'})}
    <figcaption aria-live="polite" hidden></figcaption>
  </figure>`;
}

/** 选择模式的场景与坐标仅在确认时交给消费页。 */
function scenePositionPickerMarkup({
  entries = [], sceneId: selectedId = 0, x = 0, y = 0,
  label = "场景位置", pointLabel = "坐标", minSceneId = 0,
  maxSceneId = 255, minX = 0, maxX = 255, minY = 0, maxY = 255,
  disabled = false, readOnly = false, deferCandidates = false, componentAttributes = "", footerMarkup = "", detailLinkMarkup = "",
  className = "",
  specialValueLabels = {},
  sceneObject = "", encounterZone = null, overlayMarkup = "", annotations = [],
  positionText = "", coordinatesText = "",
  thumbnailWidth = 60, thumbnailHeight = 38, cellSize = null,
  crop = "",
} = {}) {
  entries = scenePickerEntries({editable_scenes: entries});
  const current = entries.find(entry => Number(entry.id) === Number(selectedId));
  const name = current?.name || specialValueLabels[selectedId]
    || `场景 ${sceneIdHex({id: selectedId})}`;
  const title = [label, scenePositionSummary(name, selectedId, x, y),
    current?.width && current?.height ? `${current.width}×${current.height}` : "",
    positionText,
  ].filter(Boolean).join(" · ");
  const preview = current ? thumbnailMarkup(current, {
    width: thumbnailWidth, height: thumbnailHeight, cellSize,
    className: "scene-position-thumb", crop, title,
  }) : "";
  const point = scenePositionPointMarkup(current, x, y);
  const overlays = sceneAnnotationsMarkup(annotations) + overlayMarkup;
  const coordinates = coordinatesText || sceneCoordinatesText(x, y);
  const href = sceneDetailHref(current, {x, y, sceneObject, encounterZone});
  const link = detailLinkMarkup ? `<span class="scene-position-detail-link">${detailLinkMarkup}</span>`
    : href ? `<a class="scene-position-detail-link" href="${esc(href)}" title="场景详情" aria-label="场景详情">↗</a>` : "";
  const displaySize = `style="--scene-thumb-display-width:${thumbnailWidth > 60 ? thumbnailWidth : 36}px;`
    + `--scene-thumb-display-height:${thumbnailHeight > 38 ? thumbnailHeight : 23}px"`;
  const entryAttribute = current ? `data-scene-position-entry="${esc(JSON.stringify({
    id: current.id, name: current.name, slug: current.slug,
    width: current.width, height: current.height,
  }))}"` : "";
  if (disabled) return `<details class="scene-position-picker${className ? ` ${esc(className)}` : ""}" data-scene-position-picker
    data-scene-position-label="${esc(label)}" data-scene-position-disabled="true" data-scene-position-scene-id="${esc(selectedId)}"
    data-scene-position-x="${x === null ? "null" : esc(x)}" data-scene-position-y="${y === null ? "null" : esc(y)}" data-scene-position-crop="${esc(crop)}" ${entryAttribute} ${displaySize} ${componentAttributes}>
    <summary title="${esc(title)}" aria-label="${esc(label)}">
      <span data-scene-position-thumbnail>${preview}${point}${overlays}</span>
      <span><span data-scene-position-handle>${scenePositionHandleMarkup(selectedId, specialValueLabels)}</span>
        <span class="scene-position-current" data-scene-position-current${coordinates ? "" : " hidden"}>${esc(coordinates)}</span></span>
      ${link}
    </summary>
    <div class="scene-position-panel">${href ? `<a class="editor-inline-link" href="${esc(href)}"
      title="场景详情" aria-label="场景详情">↗</a>` : ''}${scenePointPreviewMarkup({canvasLabel: `${label}地图`})}</div>
  </details>`;
  const deferred = deferCandidates;
  const items = deferred ? [] : entries.filter(entry => Number(entry.id) >= minSceneId
      && Number(entry.id) <= maxSceneId).map(sceneReferenceItem);
  return `<details class="scene-position-picker${className ? ` ${esc(className)}` : ""}" data-scene-position-picker
    data-scene-position-label="${esc(label)}" data-scene-position-disabled="${disabled}"
    data-scene-position-read-only="${readOnly}" data-scene-position-scene-id="${esc(selectedId)}"
    data-scene-position-deferred="${deferred}"
    data-scene-position-x="${x === null ? "null" : esc(x)}" data-scene-position-y="${y === null ? "null" : esc(y)}"
    data-scene-position-special-values="${esc(JSON.stringify(specialValueLabels))}" data-scene-position-crop="${esc(crop)}" ${entryAttribute} ${displaySize} ${componentAttributes}>
    <summary title="${esc(title)}" aria-label="${esc(label)}">
      <span data-scene-position-thumbnail>${preview}${point}${overlays}</span>
      <span><span data-scene-position-handle>${scenePositionHandleMarkup(selectedId, specialValueLabels)}</span>
        <span class="scene-position-current" data-scene-position-current${coordinates ? "" : " hidden"}>${esc(coordinates)}</span></span>
      ${link}
    </summary>
    <div class="scene-position-panel">
      ${deferred ? '' : referencePickerMarkup({
        moduleId: SCENE_MODULE_ID, value: selectedId, label: "场景",
        items,
        filterLabel: "搜索场景", filterPlaceholder: "编号、名称或标识",
      })}
      <div class="scene-position-detail"><b data-scene-picker-name>${esc(name)}</b>
      <div class="scene-position-coordinates"${x === null && y === null ? " hidden" : ""}>
        <label>场景 ID <input type="text" spellcheck="false" min="${esc(minSceneId)}" max="${esc(maxSceneId)}"
          value="$${sceneIdHex({id: selectedId})}" data-scene-position-scene-id${readOnly ? " readonly" : ""}></label>
        <label>${esc(pointLabel)} X <input type="number" step="1" min="${esc(minX)}" max="${esc(maxX)}"
          value="${esc(x)}" data-scene-position-axis="x"${readOnly ? " readonly" : ""}></label>
        <label>${esc(pointLabel)} Y <input type="number" step="1" min="${esc(minY)}" max="${esc(maxY)}"
          value="${esc(y)}" data-scene-position-axis="y"${readOnly ? " readonly" : ""}></label>
      </div>
      ${scenePointPreviewMarkup({canvasLabel: `${label}地图`})}
      ${footerMarkup}
      ${readOnly ? '' : `<div class="scene-position-actions"><button class="button" type="button" data-scene-position-confirm>${x === null && y === null ? '确认' : '确认位置'}</button></div>`}</div>
    </div>
  </details>`;
}

async function paintScenePositionSummary(root) {
  const summary = root.querySelector('summary');
  await paintSceneThumbnailCanvases(summary);
  const canvas = summary.querySelector('[data-scene-thumb]');
  if (!canvas) return;
  const entry = root.dataset.scenePositionEntry
    ? JSON.parse(root.dataset.scenePositionEntry) : null;
  const cellSize = Number(canvas.dataset.sceneThumbCell);
  const crop = root.dataset.scenePositionCrop?.split(',').map(Number);
  const sourceX = crop?.length === 4 ? crop[0] * cellSize : 0;
  const sourceY = crop?.length === 4 ? crop[1] * cellSize : 0;
  const sourceWidth = crop?.length === 4 ? crop[2] * cellSize : Number(entry?.width) * cellSize;
  const sourceHeight = crop?.length === 4 ? crop[3] * cellSize : Number(entry?.height) * cellSize;
  positionSceneAnnotations(summary.querySelector('[data-scene-position-thumbnail]'), {
    cellSize, sourceX, sourceY, sourceWidth, sourceHeight,
    displayWidth: canvas.clientWidth || canvas.width, displayHeight: canvas.clientHeight || canvas.height,
  });
}

function hydrateScenePositionPicker(root, {entries = [], onConfirm} = {}) {
  if (!root || root.dataset.scenePositionBound === "1") return;
  entries = scenePickerEntries({editable_scenes: entries});
  root.dataset.scenePositionBound = "1";
  if (root.dataset.scenePositionDisabled === "true") {
    const entry = root.dataset.scenePositionEntry
      ? JSON.parse(root.dataset.scenePositionEntry) : null;
    void paintScenePositionSummary(root);
    root.addEventListener("toggle", () => {
      if (!root.open) return;
      const selected = entries.find(item => Number(item.id)
        === Number(root.dataset.scenePositionSceneId)) || entry;
      void paintScenePointPreview(root.querySelector("[data-scene-point-preview]"), {
        entry: selected,
        x: root.dataset.scenePositionX === "null" ? null : Number(root.dataset.scenePositionX),
        y: root.dataset.scenePositionY === "null" ? null : Number(root.dataset.scenePositionY),
        pointLabel: "坐标",
      });
    });
    return;
  }
  if (root.dataset.scenePositionDeferred === 'true') {
    void paintScenePositionSummary(root);
    const open = () => {
      if (!root.open) return;
      root.removeEventListener('toggle', open);
      const scene = root.querySelector('[data-scene-position-scene-id]');
      root.querySelector('.scene-position-panel').insertAdjacentHTML('afterbegin', referencePickerMarkup({
        moduleId: SCENE_MODULE_ID, value: root.dataset.scenePositionSceneId, label: '场景',
        items: entries.filter(entry => Number(entry.id) >= Number(scene.min)
          && Number(entry.id) <= Number(scene.max)).map(sceneReferenceItem),
        filterLabel: '搜索场景', filterPlaceholder: '编号、名称或标识',
      }));
      root.dataset.scenePositionDeferred = 'false';
      delete root.dataset.scenePositionBound;
      hydrateScenePositionPicker(root, {entries, onConfirm});
      root.dispatchEvent(new Event('toggle'));
    };
    root.addEventListener('toggle', open);
    if (root.open) open();
    return;
  }
  hydrateSceneReferencePickers(root);
  void paintScenePositionSummary(root);
  const picker = root.querySelector("[data-module-reference-picker]");
  const sceneInput = root.querySelector("[data-scene-position-scene-id]");
  const axes = Object.fromEntries(["x", "y"].map(axis =>
    [axis, root.querySelector(`[data-scene-position-axis="${axis}"]`)]));
  const readOnly = root.dataset.scenePositionReadOnly === 'true';
  let previewSceneId = Number(picker.dataset.moduleReferenceValue);
  const paint = () => {
    const displayedId = readOnly ? previewSceneId : Number(picker.dataset.moduleReferenceValue);
    const entry = entries.find(item => Number(item.id) === displayedId);
    const hasCoordinates = !root.querySelector('.scene-position-coordinates').hidden;
    const showPoint = hasCoordinates && (!readOnly
      || displayedId === Number(root.dataset.scenePositionSceneId));
    if (readOnly) {
      sceneInput.value = `$${sceneIdHex({id: displayedId})}`;
      for (const axis of ['x', 'y']) {
        const value = root.dataset[axis === 'x' ? 'scenePositionX' : 'scenePositionY'];
        axes[axis].value = showPoint && value !== 'null' ? value : '';
      }
    }
    root.querySelector('[data-scene-picker-name]').textContent = entry?.name || '';
    void paintScenePointPreview(root.querySelector("[data-scene-point-preview]"), {
      entry, x: showPoint && (!readOnly || axes.x.value !== '') ? Number(axes.x.value) : null,
      y: showPoint && (!readOnly || axes.y.value !== '') ? Number(axes.y.value) : null,
      pointLabel: root.dataset.scenePositionLabel,
      onSelect: hasCoordinates && !readOnly ? point => {
        axes.x.value = String(point.x);
        axes.y.value = String(point.y);
        paint();
      } : null,
    });
  };
  root.addEventListener('scene-position-preview-change', event => {
    if (!readOnly) return;
    previewSceneId = event.detail.sceneId;
    paint();
  });
  root.addEventListener("module-reference-change", () => {
    sceneInput.value = `$${sceneIdHex({id: picker.dataset.moduleReferenceValue})}`;
    sceneInput.setCustomValidity('');
    paint();
  });
  sceneInput.addEventListener("input", () => {
    if (!readOnly) {
      const id = scenePositionInputId(sceneInput);
      if (id === null) return;
      void setReferencePickerValue(picker, id);
    }
    paint();
  });
  sceneInput.addEventListener('change', () => {
    if (readOnly) return;
    const id = scenePositionInputId(sceneInput);
    if (id !== null) sceneInput.value = `$${sceneIdHex({id})}`;
  });
  axes.x.addEventListener("input", paint);
  axes.y.addEventListener("input", paint);
  root.querySelector("[data-scene-position-confirm]")?.addEventListener("click", async () => {
    const selectedId = scenePositionInputId(sceneInput);
    if (!sceneInput.reportValidity() || !axes.x.reportValidity()
        || !axes.y.reportValidity()) return;
    const value = {
      sceneId: selectedId,
      x: Number(axes.x.value), y: Number(axes.y.value),
    };
    if (!Number.isInteger(value.sceneId) || !Number.isInteger(value.x)
        || !Number.isInteger(value.y)) return;
    const result = await onConfirm?.(value);
    if (result !== false && root.isConnected) {
      syncScenePositionPicker(root, {entries, ...value});
      root.open = false;
    }
  });
  root.addEventListener("toggle", () => {
    if (!root.open) return;
    previewSceneId = Number(picker.dataset.moduleReferenceValue);
    paint();
  });
  root.addEventListener("toggle", () => {
    const inner = root.querySelector(".scene-position-panel .module-reference-picker");
    if (inner) inner.open = root.open;
  });
}

function syncScenePositionPicker(root, {entries = [], sceneId: selectedId, x, y}) {
  if (!root?.isConnected) return;
  entries = scenePickerEntries({editable_scenes: entries});
  if (root.dataset.scenePositionReadOnly === 'true') {
    root.dataset.scenePositionSceneId = String(selectedId);
    root.dataset.scenePositionX = x === null ? 'null' : String(x);
    root.dataset.scenePositionY = y === null ? 'null' : String(y);
  }
  const scene = root.querySelector('[data-scene-position-scene-id]');
  if (scene) {
    scene.value = `$${sceneIdHex({id: selectedId})}`;
    scene.setCustomValidity('');
  }
  for (const [axis, value] of [["x", x], ["y", y]]) {
    const input = root.querySelector(`[data-scene-position-axis="${axis}"]`);
    if (input) input.value = String(value);
  }
  const picker = root.querySelector('[data-module-reference-picker]');
  if (picker && picker.dataset.moduleReferenceValue !== String(selectedId)) {
    void setReferencePickerValue(picker, selectedId);
  }
  const entry = entries.find(item => Number(item.id) === Number(selectedId));
  if (entry) root.dataset.scenePositionEntry = JSON.stringify(entry);
  const specialValueLabels = JSON.parse(root.dataset.scenePositionSpecialValues || "{}");
  const name = entry?.name || specialValueLabels[selectedId]
    || `场景 ${sceneIdHex({id: selectedId})}`;
  const title = [root.dataset.scenePositionLabel,
    scenePositionSummary(name, selectedId, x, y),
    entry?.width && entry?.height ? `${entry.width}×${entry.height}` : "",
  ].filter(Boolean).join(" · ");
  root.querySelector("summary").title = title;
  const handle = root.querySelector("[data-scene-position-handle]");
  if (handle) {
    const markup = scenePositionHandleMarkup(selectedId, specialValueLabels);
    if (handle.innerHTML !== markup) handle.innerHTML = markup;
  }
  const current = root.querySelector("[data-scene-position-current]");
  if (current) {
    const coordinates = sceneCoordinatesText(x, y);
    if (current.textContent !== coordinates) current.textContent = coordinates;
    current.hidden = !current.textContent;
  }
  let detail = root.querySelector('.scene-position-detail-link');
  const href = sceneDetailHref(entry, {x, y});
  if (href && !detail) {
    detail = document.createElement('a');
    detail.className = 'scene-position-detail-link';
    detail.textContent = '↗';
    detail.title = '场景详情';
    detail.setAttribute('aria-label', '场景详情');
    root.querySelector('summary').append(detail);
  }
  if (detail) {
    detail.hidden = !href;
    if (href) detail.href = href;
  }
  const thumbnailHost = root.querySelector('summary [data-scene-position-thumbnail]');
  const thumbnail = thumbnailHost?.querySelector('[data-scene-thumb]');
  if (thumbnail) thumbnail.title = title;
  if (thumbnailHost && thumbnail?.dataset.sceneThumb !== String(selectedId)) {
    thumbnailHost.innerHTML = entry ? thumbnailMarkup(entry, {
      width: 60, height: 38, className: "scene-position-thumb", title,
    }) : "";
  }
  thumbnailHost?.querySelector('.scene-position-point')?.remove();
  thumbnailHost?.insertAdjacentHTML('beforeend', scenePositionPointMarkup(entry, x, y));
  if (entry) void paintScenePositionSummary(root);
  if (root.open && root.dataset.scenePositionReadOnly === 'true') {
    root.dispatchEvent(new CustomEvent('scene-position-preview-change', {detail: {sceneId: selectedId}}));
  }
}

const pointPreviewTokens = new WeakMap();

async function paintScenePointPreview(root, {entry, x, y, onSelect = null, pointLabel = '停放点'}) {
  if (!root) return;
  const token = {};
  pointPreviewTokens.set(root, token);
  const surfaceRoot = root.querySelector('[data-scene-preview-surface]');
  const canvas = surfaceRoot.querySelector('canvas');
  const caption = root.querySelector('figcaption');
  const current = () => pointPreviewTokens.get(root) === token && root.isConnected;
  caption.textContent = ''; caption.hidden = true;
  if (!entry) {surfaceRoot.hidden = true; return;}
  const cellSize = Number(entry.id) === 0 ? 4 : 16;
  const preview = bindScenePreview({root, key: `scene-picker:${entry.id}`, fitAlignment: {x: .5, y: 0},
    geometry: () => ({cellSize: Number(canvas.dataset.cellSize) || cellSize,
      width: canvas.width / (Number(canvas.dataset.cellSize) || cellSize),
      height: canvas.height / (Number(canvas.dataset.cellSize) || cellSize)}), onSelect});
  preview.setCallbacks({onSelect: null});
  try {
    const surface = await paintScenePreviewById(canvas, Number(entry.id), {view: 'detailed', cellSize, isCurrent: current});
    if (!current()) return;
    if (!surface) throw new Error('场景绘制未返回图像');
    canvas.dataset.cellSize = String(cellSize);
    surfaceRoot.hidden = false;
    preview.setCallbacks({onSelect});
    const picker = root.closest('[data-scene-position-picker]') || root.closest('[data-module-reference-picker]');
    const annotations = picker?.dataset.scenePositionReadOnly === 'true'
      && Number(entry.id) !== Number(picker.dataset.scenePositionSceneId) ? []
      : [...(picker?.querySelectorAll('summary [data-scene-annotation]') || [])];
    const inBounds = Number.isInteger(x) && Number.isInteger(y)
      && x >= 0 && y >= 0 && x < Number(entry.width) && y < Number(entry.height);
    setScenePreviewPoint(root, {x, y, width: Number(entry.width), height: Number(entry.height), annotations});
    preview.layout();
    if (root.dataset.scenePreviewEntry !== String(entry.id)) {
      root.dataset.scenePreviewEntry = String(entry.id);
      preview.setZoom('fit');
    }
    canvas.title = `${entry.name} · ${entry.width}×${entry.height}`
      + (Number.isInteger(x) && Number.isInteger(y)
        ? ` · ${pointLabel} ${x}, ${y}${inBounds ? '' : '（超出场景范围）'}` : '');
    canvas.setAttribute('aria-label', canvas.title
      + (onSelect ? `；点击设置${pointLabel}，也可使用 X / Y 数字框` : ''));
  } catch (error) {
    if (!current()) return;
    caption.hidden = false; caption.textContent = `场景预览不可用：${error.message}`;
  }
}

function componentRoots(root, kind) {
  const selector = `[data-module-component-module="${SCENE_MODULE_ID}"]`
    + `[data-module-component-kind="${kind}"]`;
  return [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
}

async function hydrateScenePreviews(
  root = document,
  {painter = paintSceneThumbnailCanvases} = {},
) {
  const previews = [
    ...componentRoots(root, "preview"),
    ...componentRoots(root, "cover"),
  ];
  for (const preview of previews) await painter(preview);
  for (const preview of previews) {
    const picker = preview.matches?.('[data-scene-position-picker]')
      ? preview : preview.querySelector?.('[data-scene-position-picker]');
    if (picker) hydrateScenePositionPicker(picker);
  }
}

function hydrateSceneReferencePickers(
  root = document,
  {painter = paintSceneReferenceThumbnails} = {},
) {
  const selector = '[data-module-reference-picker][data-module-reference-module="scene-header-map"]';
  const pickers = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
  pickers.forEach(picker =>
    hydrateReferenceFieldPickers(picker, {paint: painter}));
}

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(SCENE_MODULE_ID, kind, {
    render: scenePreviewMarkup,
    hydrate: hydrateScenePreviews,
  });
}

export { hydrateScenePositionPicker, sceneDetailHref, scenePickerVariants, scenePositionInputId, scenePositionPickerMarkup, sceneVariantMarkup, syncScenePositionPicker };
