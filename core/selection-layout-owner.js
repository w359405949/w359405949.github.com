// @editor-module 共享选择布局独占布局表与坐标表，消费端按字段引用取得当前布局。
import {createNamedByteTablesOwner} from './named-byte-tables-owner.js';
import {FIELD_SUBMENU_CODE_PARAMETERS, fieldSubmenuCodeSource, fieldSubmenuCodeValue} from './field-submenu-code-sources.js';
import {validateFieldOverrides} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';
import {UI_LAYOUT_COMPILER_ID, uiLayoutComponentSpecs, encodeUiLayoutFields,
  serializeUiLayoutField, validateUiLayoutPreimage} from './ui-layout-data.js';

const SELECTION_LAYOUT_OWNER = 'selection-layout';
const schema = 'metalmaxcn.field-ui-module.asset.selection-layout';
const require = (condition, message) => {if (!condition) throw new TypeError(message);};
const handle = index => `${SELECTION_LAYOUT_OWNER}:${index.toString(16).toUpperCase().padStart(2, '0')}`;

export function selectionLayoutDocument(blocks, {groups = []} = {}) {
  const table = suffix => {
    const block = blocks.find(row => row.id === `${SELECTION_LAYOUT_OWNER}.${suffix}`);
    require(block && block.values.length === block.address.length, `选择布局缺少 ${suffix}`);
    return block;
  };
  const columns = table('columns'), coordinates = table('coordinates');
  const movementPointers = table('movement-pointers');
  const pointers = table('coordinate-pointers');
  const geometries = table('profile-geometries').values;
  const rowIndices = table('profile-rows').values;
  const columnIndices = table('profile-columns').values;
  const word = (block, index) => {
    require(Number.isInteger(index) && index >= 0 && index * 2 + 1 < block.values.length,
      '选择布局指针索引越界');
    return block.values[index * 2] | block.values[index * 2 + 1] << 8;
  };
  const cpu = block => 0xE000 + block.address.offset % 0x2000;
  const coordinateFields = (pointer, count) => {
    const first = pointer - cpu(coordinates);
    require(first >= 0 && first + count <= coordinates.values.length, '选择布局坐标索引越界');
    return Array.from({length: count}, (_, index) => handle(first + index));
  };
  const profiles = geometries.map((geometry, index) => {
    const width = columns.values[geometry];
    const start = word(movementPointers, geometry);
    const end = geometry + 1 < columns.values.length
      ? word(movementPointers, geometry + 1) : cpu(columns);
    const capacity = end - start;
    require(width > 0 && capacity > 0 && capacity <= 255, '选择布局索引域无效');
    return {index, columns: width, capacity, movement_offset: start - 0xE73F,
      index_domain: {minimum: 0, maximum: capacity - 1},
      x_fields: coordinateFields(word(pointers, 15 + columnIndices[index]), width),
      y_fields: coordinateFields(word(pointers, rowIndices[index]), Math.ceil(capacity / width))};
  });
  const selectors = table('selector-profiles').values.map((profile, index) => {
    require(profiles[profile], '选择器引用缺失的布局');
    return {selector: index * 2, profile};
  });
  const used = new Set(profiles.flatMap(profile => [...profile.x_fields, ...profile.y_fields]));
  require(used.size === coordinates.values.length, '选择布局坐标池存在未确认字节');
  const document = {coordinates: coordinates.values.map((coordinate, index) => ({handle: handle(index), coordinate})),
    coordinate_address: coordinates.address, profiles, selectors,
    highlights: {
      x_fields: coordinateFields(0xE805, 5),
      metasprite_source: {resource_id: 'metasprite',
        entity_handle: 'metasprite:03', field: 'pointer_cpu'},
      metasprite_id_source: fieldSubmenuCodeSource('highlight-metasprite-id'),
      presets: [{id: 'parent-menu', x_bias: 0, entry: '3F:F050'},
        {id: 'overview-category', x_bias_source: fieldSubmenuCodeSource('category-highlight-x-bias'),
          entry: '10:A825'}],
      reader: {resource_id: 'code-module', block: 'code-module.fixed-ui-core-d', entry: '3F:EA82'},
    },
    code_parameters: FIELD_SUBMENU_CODE_PARAMETERS.map(row => ({resource_id: row.resource_id,
      entity_handle: row.entity_handle, field: row.field})),
    common_cursor: {
      metasprite_id_source: fieldSubmenuCodeSource('selection-cursor-object-id'),
      visibility: {register: '$0324', condition: 'nonzero', reader: '1A:A233'},
      animation: {kind: 'steady', reader: '1A:A233→13:8000'},
    },
    common_wait_marker: {resource_id: 'text-render-runtime', field: 'wait_marker'},
    inline_confirm: {reader: {resource_id: 'text-render-runtime', block: 'text-render-runtime.ui-control-handlers-b'},
      entry: '19:BE8E', selected_index_register: '$D5', text_cursor_registers: ['$B6', '$B7']}};
  document.layout_tables = blocks.filter(block => block.id !== 'selection-layout.coordinates').map(block => {
    const name = block.id.slice('selection-layout.'.length);
    const width = name.endsWith('-pointers') ? 2 : 1;
    return {name, address: block.address, width, values: width === 1 ? [...block.values]
      : Array.from({length: block.values.length / 2}, (_, index) => word(block, index))};
  });
  document.movement_sequences = columns.values.map((_, index) => ({pointer: word(movementPointers, index),
    capacity: (index + 1 < columns.values.length ? word(movementPointers, index + 1) : cpu(columns))
      - word(movementPointers, index)}));
  document.writeback_components = uiLayoutComponentSpecs(SELECTION_LAYOUT_OWNER).map(spec => ({
    fragment_id: spec.fragmentId, source: blocks.find(block => block.id === spec.fragmentId).address}));
  document.button_docks = groups.flatMap(group => (group.choices || []).filter(() => group.cursor_source)
    .map(choice => ({group_id: group.id, choice_index: choice.index,
      ...selectionCursorDockSource(document, group.cursor_source,
        group.selection_kind === 'fixed-options' || group.id.startsWith('commands:') ? choice.index : null)})));
  return document;
}

function selectionCursorDockSource(document, source, index = null) {
  const field = entity_handle => ({resource_id: SELECTION_LAYOUT_OWNER, entity_handle, field: 'coordinate'});
  if (source.kind === 'inline-text-confirm') return {...source,
    x_sources: ['confirm-cursor-x-bias', 'confirm-choice-x-spacing'].map(fieldSubmenuCodeSource),
    y_sources: [fieldSubmenuCodeSource('confirm-cursor-y-bias')]};
  const selector = document.selectors.find(row => row.selector === source.selector);
  const profile = document.profiles[selector?.profile];
  require(profile, '按钮停靠缺少选择布局');
  if (index !== null && source.update_policy !== 'retained') {
    const point = selectionCursorCoordinates(document, source, index);
    return {...source, index, x_source: field(point.x_field.slice(0, -'.coordinate'.length)),
      y_source: field(point.y_field.slice(0, -'.coordinate'.length))};
  }
  return {...source, columns: profile.columns, index_domain: profile.index_domain,
    x_sources: profile.x_fields.map(field), y_sources: profile.y_fields.map(field)};
}

function selectionHighlightCoordinates(document, source, index = 0, presetId = 'parent-menu', codeValues = {}) {
  const cursor = selectionCursorCoordinates(document, source, index);
  const selector = document.selectors.find(row => row.selector === source.selector);
  const profile = document.profiles[selector?.profile];
  const preset = document.highlights?.presets.find(row => row.id === presetId);
  const xField = document.highlights?.x_fields[index % profile?.columns];
  const coordinate = document.coordinates.find(row => row.handle === xField)?.coordinate;
  const bias = preset?.x_bias_source
    ? codeValues[`${preset.x_bias_source.entity_handle}.${preset.x_bias_source.field}`] : preset?.x_bias;
  require(preset && Number.isInteger(coordinate) && Number.isInteger(bias), '高亮缺少已发布的构造字段');
  return {x: (coordinate + bias) & 0xFF, y: cursor.y,
    x_field: `${xField}.coordinate`, y_field: cursor.y_field,
    metasprite_source: document.highlights.metasprite_source};
}

export function selectionCursorSource(group, {groups = [], protocols = []} = {}) {
  if (group.selection_kind === 'inline-confirm') return {resource_id: SELECTION_LAYOUT_OWNER,
    kind: 'inline-text-confirm', reader: {resource_id: 'text-render-runtime', block: 'text-render-runtime.ui-control-handlers-b'},
    selected_index_register: '$D5', text_cursor_registers: ['$B6', '$B7']};
  const selector = Number(group.selector?.value);
  require(Number.isInteger(selector) && selector >= 0 && selector % 2 === 0,
    `${group.id} 缺少选择器索引`);
  const parent = group.cursor_parent_group_id
    ? groups.find(row => row.id === group.cursor_parent_group_id) : null;
  const retention = parent && protocols.find(row => row.id === group.dispatch_protocol_id)?.retained_cursor;
  require(!group.cursor_parent_group_id || parent && retention, `${group.id} 缺少保留光标来源`);
  return {resource_id: SELECTION_LAYOUT_OWNER, kind: 'indexed-coordinate',
    selector: parent ? Number(parent.selector.value) : selector,
    selected_index_register: retention?.selected_index_register ?? '$D2',
    visibility_register: '$0324', visibility_condition: 'nonzero',
    coordinate_update_register: '$059A', coordinate_update_value: 0,
    ...(retention ? {update_policy: 'retained', source_group_id: parent.id,
      selection_profile_selector: selector, reader: retention.reader} : {})};
}

export function selectionCursorCoordinates(document, source, index = 0, {textCursor, hidden = false, codeValues = {}} = {}) {
  require(source?.resource_id === SELECTION_LAYOUT_OWNER, '光标字段来源无效');
  if (hidden) return null;
  if (source.kind === 'inline-text-confirm') {
    require(Number.isInteger(textCursor) && textCursor >= 0 && textCursor <= 0xFFFF
      && (index === 0 || index === 1), '确认光标缺少文字游标');
    return {x: ((textCursor << 3) - fieldSubmenuCodeValue(codeValues, 'confirm-cursor-x-bias')
      + index * fieldSubmenuCodeValue(codeValues, 'confirm-choice-x-spacing')) & 0xFF,
      y: ((textCursor >> 2) - fieldSubmenuCodeValue(codeValues, 'confirm-cursor-y-bias')) & 0xFF,
      reader: document.inline_confirm.reader};
  }
  const selector = document.selectors.find(row => row.selector === source.selector);
  const profile = document.profiles[selector?.profile];
  require(profile && Number.isInteger(index) && index >= 0 && index < profile.capacity,
    '光标选择序号超出布局索引域');
  const xField = profile.x_fields[index % profile.columns];
  const yField = profile.y_fields[Math.floor(index / profile.columns)];
  const value = field => {
    const row = document.coordinates.find(row => row.handle === field);
    require(row && Number.isInteger(row.coordinate) && row.coordinate >= 0 && row.coordinate <= 255,
      '光标坐标字段无效');
    return row.coordinate;
  };
  return {x: value(xField), y: value(yField), x_field: `${xField}.coordinate`,
    y_field: `${yField}.coordinate`, profile: profile.index, index_domain: profile.index_domain};
}

function currentSelectionProfiles(document) {
  if (!document.layout_tables) return document.profiles;
  const table = name => {
    const row = document.layout_tables.find(row => row.name === name);
    require(row, `选择布局缺少 ${name}`);
    return row.values;
  };
  const coordinateBase = 0xE000 + document.coordinate_address.offset % 0x2000;
  const coordinateFields = (pointer, count) => {
    const first = pointer - coordinateBase;
    require(Number.isInteger(first) && first >= 0 && first + count <= document.coordinates.length,
      '选择布局坐标指针越出已确认坐标池');
    return Array.from({length: count}, (_, index) => handle(first + index));
  };
  return table('profile-geometries').map((geometry, index) => {
    const columns = table('columns')[geometry];
    const pointer = table('movement-pointers')[geometry];
    const sequence = document.movement_sequences.find(row => row.pointer === pointer);
    require(Number.isInteger(columns) && columns > 0 && columns <= 8 && sequence
      && columns <= sequence.capacity, '选择布局行列与定长移动序列不符');
    const capacity = sequence.capacity;
    return {index, columns, capacity, movement_offset: pointer - document.movement_sequences[0].pointer,
      geometry, row_index: table('profile-rows')[index], column_index: table('profile-columns')[index],
      index_domain: {minimum: 0, maximum: capacity - 1},
      x_fields: coordinateFields(table('coordinate-pointers')[15 + table('profile-columns')[index]], columns),
      y_fields: coordinateFields(table('coordinate-pointers')[table('profile-rows')[index]], Math.ceil(capacity / columns))};
  });
}

function projectSelectionLayoutView(document) {
  if (!document.layout_tables) return;
  Object.defineProperty(document, 'profiles', {enumerable: true, get: () => currentSelectionProfiles(document)});
  Object.defineProperty(document, 'selectors', {enumerable: true, get: () =>
    document.layout_tables.find(row => row.name === 'selector-profiles').values
      .map((profile, index) => ({selector: index * 2, profile}))});
}

const codec = createNamedByteTablesOwner({owner: SELECTION_LAYOUT_OWNER, schema, writeback: null,
  tables: document => document.coordinates.map((row, index) => ({
    name: index.toString(16).toUpperCase().padStart(2, '0'), label: `坐标 ${row.handle}`,
    pathBase: ['coordinates', index], keys: [{name: 'coordinate', label: '坐标'}], fragmentId: 'selection-layout.coordinates',
  }))});

function describeSelectionLayout(document) {
  return [...codec.fieldOwner.describe(document).map((field, index) => ({...field,
    offsetInFragment: index, byteLength: 1})),
    ...(document.layout_tables || []).flatMap((table, position) => table.values.map((value, index) => ({
      resourceId: SELECTION_LAYOUT_OWNER, entityHandle: `selection-layout:${table.name}`,
      fieldName: `value${index}`, defaultValue: value,
      documentPath: ['layout_tables', position, 'values', index],
      fragmentId: `selection-layout.${table.name}`, offsetInFragment: index * table.width,
      byteLength: table.width})))];
}

function validateSelectionLayout(asset, original) {
  require(asset?.resource_id === SELECTION_LAYOUT_OWNER && asset.schema === schema,
    '选择布局字段对象身份无效');
  const expected = structuredClone(original);
  for (const field of describeSelectionLayout(original.document)) {
    const path = field.documentPath;
    const value = path.reduce((node, key) => node[key], asset.document);
    require(Number.isInteger(value) && value >= 0 && value < 2 ** (8 * field.byteLength),
      '选择布局字段取值无效');
    const parent = path.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[path.at(-1)] = value;
  }
  require(canonicalJsonEqual(asset, expected), '只能修改选择布局已登记的字段');
  if (asset.document.layout_tables) {
    const table = name => asset.document.layout_tables.find(row => row.name === name).values;
    const base = 0xE000 + asset.document.coordinate_address.offset % 0x2000;
    require(table('columns').every(value => value >= 1 && value <= 8)
      && table('movement-pointers').every((value, index) => asset.document.movement_sequences.some(row =>
        row.pointer === value && row.capacity === original.document.movement_sequences[index].capacity))
      && table('profile-geometries').every(value => value < table('columns').length)
      && table('profile-rows').every(value => value <= 15)
      && table('profile-columns').every(value => value < 18)
      && table('coordinate-pointers').every(value => value >= base && value < base + asset.document.coordinates.length),
    '选择布局必须保留已确认的序列容量与表索引域');
  }
  const profiles = currentSelectionProfiles(asset.document);
  const initial = currentSelectionProfiles(original.document);
  require(profiles.every((row, index) => row.capacity === initial[index].capacity),
    '选择布局不能改变定长索引域');
  const selectors = asset.document.layout_tables?.find(row => row.name === 'selector-profiles');
  const originSelectors = original.document.layout_tables?.find(row => row.name === 'selector-profiles');
  require(!selectors || selectors.values.every((profile, index) => profiles[profile]
    && profiles[profile].capacity === initial[originSelectors.values[index]].capacity),
  '选择器只能引用相同容量的已确认布局');
  require(!selectors || original.document.button_docks.filter(row =>
    ['commands:20-27', 'field-overview-categories'].includes(row.group_id)).every(row =>
    profiles[selectors.values[row.selector / 2]].columns <= original.document.highlights.x_fields.length),
  '父菜单列数不能超出已确认的高亮坐标表');
}

function selectionLayoutObjects(document) {
  return [...codec.objects(document), ...(document.layout_tables || []).map(table => ({
    id: `selection-layout:${table.name}`, label: table.name, fragmentIds: [`selection-layout.${table.name}`],
    fields: table.values.map((_, index) => [`selection-layout:${table.name}`, `value${index}`]),
    editor: {kind: 'numeric-table', rows: [`selection-layout:${table.name}`],
      columns: table.values.map((_, index) => ({name: `value${index}`, label: `${table.name} ${index}`,
        min: 0, max: table.width === 2 ? 65535 : 255}))}}))];
}

export const selectionLayoutFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: UI_LAYOUT_COMPILER_ID, projectView: projectSelectionLayoutView,
  highlightCoordinates: selectionHighlightCoordinates,
  describe: describeSelectionLayout, objects: selectionLayoutObjects,
  validate: (original, overrides) => validateFieldOverrides(original, overrides,
    describeSelectionLayout, validateSelectionLayout),
  encode: encodeUiLayoutFields, serializeField: serializeUiLayoutField,
  validatePreimage: validateUiLayoutPreimage});
