// @editor-module 界面布局字段序列化为定长片段，物理位置由目标绑定提供。
export const UI_LAYOUT_COMPILER_ID = 'ui-layout-data/v1';
export const UI_LAYOUT_COMPONENT_CODEC = 'metalmaxcn.ui-layout-data';
const specs = {
  'selection-layout': [['columns', 20], ['coordinates', 93], ['movement-pointers', 40],
    ['coordinate-pointers', 66], ['selector-profiles', 84], ['profile-geometries', 55],
    ['profile-rows', 55], ['profile-columns', 55]],
  'ui-vehicle-status': [['part-type-matrix', 40], ['part-x-matrix', 40], ['part-y-matrix', 40]],
  'code-module': [['fixed-ui-table-core-a', 149]],
};

export function uiLayoutComponentSpecs(resourceId) {
  if (!specs[resourceId]) throw new TypeError('界面布局字段对象无效');
  return specs[resourceId].map(([name, length]) => ({fragmentId: `${resourceId}.${name}`, length}));
}

export function uiLayoutAssetSchema(resourceId) {
  uiLayoutComponentSpecs(resourceId);
  if (resourceId === 'code-module') return 'metalmaxcn.module-asset.code-module';
  return `metalmaxcn.field-ui-module.asset.${resourceId}`;
}

export function serializeUiLayoutField(field) {
  const value = field.fieldName === 'part_type' ? Number.parseInt(field.value, 16) : field.value;
  const width = field.byteLength ?? field.physical?.byteLength ?? 1;
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** (width * 8))
    throw new TypeError('界面布局字段取值无效');
  return Uint8Array.from({length: width}, (_, index) => value >> (index * 8) & 255);
}

export function encodeUiLayoutFields(fields, {defaults = false} = {}) {
  const resourceId = fields[0]?.resourceId;
  const result = uiLayoutComponentSpecs(resourceId).map(spec => ({fragment_id: spec.fragmentId,
    payload: new Uint8Array(spec.length), relocations: [], seen: new Set()}));
  for (const field of fields) {
    const fragment = field.fragmentId ?? field.physical?.component?.fragment_id;
    const target = result.find(row => row.fragment_id === fragment);
    if (!target) continue;
    const offset = field.offsetInFragment ?? field.physical?.offsetInFragment;
    const bytes = serializeUiLayoutField({...field, value: defaults ? field.defaultValue : field.value});
    if (field.resourceId !== resourceId || !Number.isInteger(offset) || offset < 0
        || offset + bytes.length > target.payload.length)
      throw new TypeError('界面布局字段超出定长片段');
    bytes.forEach((byte, index) => {
      if (target.seen.has(offset + index)) throw new TypeError('界面布局字段重叠');
      target.seen.add(offset + index);
      target.payload[offset + index] = byte;
    });
  }
  if (result.some(row => row.seen.size !== row.payload.length))
    throw new TypeError('界面布局字段不完整');
  return result.map(({seen, ...row}) => row);
}

export function validateUiLayoutPreimage(fields, fragmentId, baseline) {
  const spec = uiLayoutComponentSpecs(fields[0]?.resourceId).find(row => row.fragmentId === fragmentId);
  if (!spec || spec.length !== baseline.length) throw new TypeError('界面布局 Origin 长度无效');
  for (const field of fields) {
    if ((field.fragmentId ?? field.physical?.component?.fragment_id) !== fragmentId) continue;
    const offset = field.offsetInFragment ?? field.physical?.offsetInFragment;
    const bytes = serializeUiLayoutField({...field, value: field.defaultValue});
    if (bytes.some((byte, index) => baseline[offset + index] !== byte))
      throw new TypeError('界面布局 Origin 与绑定原像不符');
  }
}
