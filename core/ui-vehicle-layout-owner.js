// @editor-module 战车部件的物理列、底盘与定长矩阵由所属字段对象声明。
import {createPhysicalByteBlocksOwner} from './physical-byte-blocks-owner.js';
import {validateFieldOverrides} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';
import {UI_LAYOUT_COMPILER_ID, uiLayoutAssetSchema, encodeUiLayoutFields,
  serializeUiLayoutField, validateUiLayoutPreimage} from './ui-layout-data.js';

const OWNER = 'ui-vehicle-status';
const opaque = createPhysicalByteBlocksOwner({owner: OWNER, schema: uiLayoutAssetSchema(OWNER),
  blocksPath: ['blocks']});
const handle = row => `${OWNER}:${row.chassis_id.toString(16).toUpperCase()}:${row.physical_column}`;
const fragment = {part_type: 'part-type-matrix', x: 'part-x-matrix', y: 'part-y-matrix'};

export function vehiclePartTypeCandidates(document, row) {
  const available = new Set(document.portrait_part_art.filter(art => art.chassis_id === row.chassis_id)
    .map(art => art.part_type));
  const hex = value => value.toString(16).toUpperCase().padStart(2, '0');
  const types = new Set([0, ...[...available].flatMap(type => {
    const value = Number.parseInt(type, 16);
    return [value, value - 1 & 255];
  })]);
  return [...types].sort((a, b) => a - b).filter(type =>
    (row.physical_column >= 3 || type === 0 || available.has(hex(type)))
    && ((type + 1 & 255) === 0 || available.has(hex(type + 1 & 255)))).map(hex);
}

function partDescriptions(document) {
  if (document.portrait_parts?.length !== 40) throw new TypeError('战车部件矩阵必须为五列八底盘');
  return document.portrait_parts.flatMap((row, index) => {
    if (row.physical_column !== Math.floor(index / 8) || row.chassis_id !== 0x91 + index % 8)
      throw new TypeError('战车部件矩阵索引不能改变');
    return Object.keys(fragment).map(name => ({resourceId: OWNER, entityHandle: handle(row),
      fieldName: name, defaultValue: row[name], documentPath: ['portrait_parts', index, name],
      fragmentId: `${OWNER}.${fragment[name]}`, offsetInFragment: index, byteLength: 1}));
  });
}

function describe(document) {
  return [...opaque.fieldOwner.describe(document), ...partDescriptions(document)];
}

function validateAsset(asset, original) {
  if (asset?.resource_id !== OWNER || asset.schema !== uiLayoutAssetSchema(OWNER))
    throw new TypeError('战车部件字段对象身份无效');
  const expected = structuredClone(original);
  for (const field of describe(original.document)) {
    const path = field.documentPath;
    const value = path.reduce((node, key) => node[key], asset.document);
    const parent = path.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[path.at(-1)] = value;
    if (field.fieldName === 'part_type') {
      const row = original.document.portrait_parts[path[1]];
      if (!vehiclePartTypeCandidates(original.document, row).includes(value))
        throw new TypeError('部件类型须保留已确认的底盘图像与状态变体');
    } else if (!Number.isInteger(value) || value < 0 || value > 255)
      throw new TypeError('部件位置必须为 0..255 的整数');
  }
  if (!canonicalJsonEqual(asset, expected)) throw new TypeError('只能修改已登记的战车部件字段');
}

function projectVehicleLayoutView(document) {
  for (const row of document.portrait_parts) {
    const types = () => {
      const type = Number.parseInt(row.part_type, 16);
      const hex = value => value ? value.toString(16).toUpperCase().padStart(2, '0') : null;
      return {'opaque-0': row.physical_column < 3 ? hex(type) : null,
        'opaque-1': hex(type + 1 & 255)};
    };
    Object.defineProperty(row, 'part_type_by_state_case', {enumerable: true, get: types});
    Object.defineProperty(row, 'art_id_by_state_case', {enumerable: true, get: () =>
      Object.fromEntries(Object.entries(types()).map(([key, type]) => [key,
        type === null ? null : `${row.chassis_id.toString(16).toUpperCase()}-${type}`]))});
  }
}

export const uiVehicleLayoutFieldOwner = Object.freeze({...opaque.fieldOwner,
  compilerId: UI_LAYOUT_COMPILER_ID, describe,
  projectView: projectVehicleLayoutView,
  validate: (original, overrides) => validateFieldOverrides(original, overrides, describe, validateAsset),
  objects: document => [...opaque.objects(document), ...document.portrait_parts.map(row => ({
    id: handle(row), label: `底盘 ${row.chassis_id.toString(16).toUpperCase()} · 物理列 ${row.physical_column}`,
    fragmentIds: Object.values(fragment).map(name => `${OWNER}.${name}`),
    fields: Object.keys(fragment).map(name => [handle(row), name]),
    editor: {kind: 'numeric-table', rows: [handle(row)], columns: [
      {name: 'part_type', label: '部件类型'}, {name: 'x', label: 'X', min: 0, max: 255},
      {name: 'y', label: 'Y', min: 0, max: 255}]}}))],
  encode: (fields, options) => encodeUiLayoutFields(fields.filter(field => field.fieldName in fragment), options),
  serializeField: serializeUiLayoutField, validatePreimage: validateUiLayoutPreimage,
});
