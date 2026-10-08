// @editor-module 光标坐标控件嵌入界面检查器，数值编辑与重置由字段对象提供。
import {db} from '../../core/project-db.js';
import {esc} from '../../core/dom.js';
import {selectionCursorCoordinates} from '../../core/selection-layout-owner.js';
import {mountFieldObjectField} from '../../ui/field-object-editor.js';
import {dataTable, resetToOriginalButton, bindFieldResetToOriginalButtons} from '../../ui/table.js';
import {writeAccessMarker} from '../../ui/write-access-marker.js';
import {state} from '../../core/state.js';
import {dedicatedUiPageForScreen} from '../../core/ui-page-registry.js';
import {fieldMenuHref} from '../../core/field-menu-tree.js';
import {executeFacilityWindowRoutine} from '../../core/facility-window-semantics.js';

const key = (handle, fieldName) => JSON.stringify([handle, fieldName]);
const linkProjections = new WeakMap();
const objectIndexes = new WeakMap();
function objectIndex(objects) {
  if (!objectIndexes.has(objects)) objectIndexes.set(objects, new Map(objects.flatMap(object =>
    object.definition.fields.map(([handle, name]) => [key(handle, name), object]))));
  return objectIndexes.get(objects);
}
const tableField = (name, index, label) => ({handle: `selection-layout:${name}`,
  fieldName: `value${index}`, label});

function profileLayoutFields(document, source) {
  if (!document.layout_tables) return [];
  const selector = document.selectors.find(row => row.selector === source.selector);
  const profile = document.profiles[selector?.profile];
  if (!profile) throw new TypeError('选择器缺少布局预设');
  return [tableField('selector-profiles', source.selector / 2, '布局预设'),
    tableField('profile-geometries', profile.index, '行列布局'),
    tableField('columns', profile.geometry, '列数'),
    tableField('movement-pointers', profile.geometry, '方向序列'),
    tableField('profile-rows', profile.index, '行坐标索引'),
    tableField('profile-columns', profile.index, '列坐标索引'),
    tableField('coordinate-pointers', profile.row_index, '行坐标起点'),
    tableField('coordinate-pointers', 15 + profile.column_index, '列坐标起点')];
}

function layoutFields(document, source) {
  const rows = profileLayoutFields(document, source);
  if (source.update_policy === 'retained' && Number.isInteger(source.selection_profile_selector))
    rows.push(...profileLayoutFields(document, {...source, selector: source.selection_profile_selector})
      .map(row => ({...row, label: `列表${row.label}`})));
  const selectors = [source.selection_profile_selector ?? source.selector];
  for (const value of selectors) {
    const selector = document.selectors.find(row => row.selector === value);
    const profile = document.profiles[selector?.profile];
    if (profile) rows.push(...Array.from({length: profile.capacity}, (_, index) => ({
      resourceId: 'code-module', handle: 'code-module:code-module.fixed-ui-table-core-a',
      fieldName: `value${5 + profile.movement_offset + index}`, label: `移动 ${index + 1}`})));
  }
  const seen = new Set();
  return rows.filter(row => {
    const id = key(row.handle, row.fieldName);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function highlightFields(document, preview) {
  const selector = document.selectors.find(row => row.selector === preview.menu_highlight?.selector);
  const profile = document.profiles[selector?.profile];
  return profile ? document.highlights.x_fields.slice(0, profile.columns) : [];
}

function affectedInterfaceLinks(document) {
  const construction = state.project?.ui?.construction;
  const groups = construction?.menu_dispatch_data?.choice_groups || [];
  const screens = state.project?.ui?.editor?.screens || [];
  const links = new Map();
  for (const group of groups) {
    const source = group.cursor_source;
    if (source?.kind !== 'indexed-coordinate') continue;
    const selector = document.selectors.find(row => row.selector === source.selector);
    const profile = document.profiles[selector?.profile];
    if (!profile) continue;
    const highlights = construction?.menu_dispatch_data?.previews?.filter(preview => preview.menu_highlight
      && group.interface_state_ids?.includes(preview.interface_state_id)).flatMap(preview =>
      highlightFields(document, preview)) || [];
    const fields = [...layoutFields(document, source),
      ...[...profile.x_fields, ...profile.y_fields, ...highlights]
        .map(handle => ({handle, fieldName: 'coordinate'}))];
    for (const stateId of group.interface_state_ids || []) {
      const screen = screens.find(row => row.interface_state_id === stateId);
      const destination = screen && dedicatedUiPageForScreen(screen);
      if (!destination) continue;
      const link = {href: fieldMenuHref({pageId: destination.interfacePage,
        screenId: screen.id, entryId: group.interface_entry_id}), label: screen.interface_state || screen.label};
      for (const field of fields) {
        const id = key(field.handle, field.fieldName);
        if (!links.has(id)) links.set(id, new Map());
        links.get(id).set(stateId, link);
      }
    }
  }
  return new Map([...links].map(([id, rows]) => [id, [...rows.values()]
    .map(row => `<a class="editor-inline-link" href="${esc(row.href)}">${esc(row.label)}</a>`).join('、')]));
}

export function selectionLayoutMarkup(preview, {choiceIndex = null} = {}) {
  return preview?.selection_cursor?.kind === 'indexed-coordinate'
    ? `<div data-selection-layout-controls="${esc(preview.id)}"${choiceIndex === null
      ? '' : ` data-selection-choice-index="${choiceIndex}"`}></div>` : '';
}

export async function bindSelectionLayoutControls(root, preview, {repaint = () => {}, rerender = null} = {}) {
  const host = root.querySelector('[data-selection-layout-controls]');
  if (!host || host.dataset.selectionLayoutControls !== preview?.id
      || preview?.selection_cursor?.kind !== 'indexed-coordinate') return;
  const source = preview.selection_cursor;
  const currentDocument = await db.getResourceDocument(source.resource_id, null);
  const document = {...currentDocument};
  const choiceIndex = host.dataset.selectionChoiceIndex;
  const point = selectionCursorCoordinates(document, source, choiceIndex === undefined
    ? preview.runtime_context?.choice_index ?? 0 : Number(choiceIndex));
  const profile = document.profiles[point.profile];
  const objects = await db.getFieldObjects(source.resource_id);
  const movementObjects = await db.getFieldObjects('code-module');
  const movement = await db.getResourceDocument('code-module', null);
  const windows = (await db.getDocument('project.ui.interfaces', null))?.application_window_sources;
  const sourceSelector = source.selection_profile_selector ?? source.selector;
  const movementProfile = document.profiles[document.selectors.find(row => row.selector === sourceSelector)?.profile];
  const movementPreview = row => {
    if (row.resourceId !== 'code-module') return '';
    const index = Number(row.fieldName.slice(5)) - 5 - movementProfile.movement_offset;
    return [[4, '→'], [3, '←'], [2, '↓'], [1, '↑']].flatMap(([direction, label]) => {
      const result = executeFacilityWindowRoutine(windows, 'window-F1F9', {selector: sourceSelector,
        selection_index: index, selection_count: movementProfile.capacity, direction_index: direction},
      {selectionLayout: document, selectionMovement: movement});
      return result.status === 'available' && result.state.selection_index !== index
        ? [`${label} ${result.state.selection_index + 1}`] : [];
    }).join(' · ');
  };
  if (!host.isConnected) return;
  const handles = choiceIndex === undefined ? [...new Set([...profile.x_fields, ...profile.y_fields])]
    : [point.x_field.replace(/\.coordinate$/u, ''), point.y_field.replace(/\.coordinate$/u, '')];
  if (preview.menu_highlight) handles.push(...highlightFields(document, preview)
    .filter(handle => !handles.includes(handle)));
  const rows = [...layoutFields(document, source), ...handles.map((handle, index) => ({handle,
    fieldName: 'coordinate', label: choiceIndex === undefined ? handle : index ? 'Y' : 'X'}))];
  const revision = db.fieldRevision(source.resource_id);
  let projection = linkProjections.get(currentDocument);
  if (!projection || projection.revision !== revision || projection.project !== state.project) {
    projection = {revision, project: state.project, links: affectedInterfaceLinks(document)};
    linkProjections.set(currentDocument, projection);
  }
  const links = projection.links;
  host.innerHTML = dataTable({
    columns: [
      {key: 'label', label: '选择布局', width: 130},
      {key: 'coordinate', label: '值', width: 120,
        cell: row => `<span data-selection-field="${esc(key(row.handle, row.fieldName))}"></span><small>${esc(movementPreview(row))}</small>`},
      {key: 'affected', label: '受影响界面', cell: row => links.get(key(row.handle, row.fieldName)) || ''}, // structure-check-exempt 6: 所属字段对象的编辑控件列出同一字段的界面引用。
      {key: 'reset', label: '', reset: true, width: 64,
        cell: row => resetToOriginalButton(key(row.handle, row.fieldName))},
    ], rows, rowId: row => key(row.handle, row.fieldName), reportStatus: false,
  });
  host.insertAdjacentHTML('beforeend', '<p>移动方向位：右 1、左 2、下 4、上 8。</p>');
  const fields = new Map();
  const objectsByField = objectIndex(objects), movementByField = objectIndex(movementObjects);
  const cells = new Map([...host.querySelectorAll('[data-selection-field]')]
    .map(cell => [cell.dataset.selectionField, cell]));
  let ready = false;
  for (const row of rows) {
    const object = (row.resourceId === 'code-module' ? movementByField : objectsByField)
      .get(key(row.handle, row.fieldName));
    const field = object?.fields.find(field => field.entityHandle === row.handle && field.fieldName === row.fieldName);
    if (!field) throw new TypeError(`选择布局字段缺失：${row.handle}/${row.fieldName}`);
    const id = key(row.handle, row.fieldName);
    fields.set(id, field);
    const cell = cells.get(id);
    mountFieldObjectField(cell, object, {entityHandle: row.handle, fieldName: row.fieldName, label: row.label,
      onValue: () => {if (ready) void (row.fieldName === 'coordinate' ? repaint() : (rerender || repaint)());}});
    if (!field.physical) cell.insertAdjacentHTML('beforeend', writeAccessMarker({writebackMissing: true}));
  }
  bindFieldResetToOriginalButtons(host, fields, {afterReset: rerender || repaint});
  ready = true;
}
