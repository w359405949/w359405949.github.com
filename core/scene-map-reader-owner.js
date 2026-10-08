// @editor-module 场景地图读取器只序列化审定的代码片段。
import {fieldRomValue, validateFieldOverrides} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';

export const SCENE_MAP_READER_ID = 'scene-data-stream-service';
export const SCENE_MAP_READER_COMPILER = 'scene-map-reader-code/v1';
export const SCENE_MAP_READER_PRODUCTS = Object.freeze([
  ['map-reader', 1024], ['map-gate', 18],
]);
const requireValue = (value, message) => {if (!value) throw new TypeError(message);};
const bytes = (value, length) => Array.isArray(value) && value.length === length
  && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255);
const handle = index => `${SCENE_MAP_READER_ID}:${index.toString(16).toUpperCase().padStart(2, '0')}`;

function describe(document) {
  requireValue(document?.module_id === SCENE_MAP_READER_ID
    && document.map_expansion?.products?.length === SCENE_MAP_READER_PRODUCTS.length, '场景地图读取器 Origin 无效');
  return SCENE_MAP_READER_PRODUCTS.map(([id, length], index) => {
    const product = document.map_expansion.products[index];
    requireValue(product.id === id && typeof product.enabled === 'boolean'
      && bytes(product.approved_bytes, length) && bytes(product.original_bytes, length)
      && product.write_permission?.status === 'approved', '场景地图读取器定值许可无效');
    return {resourceId: SCENE_MAP_READER_ID, entityHandle: handle(index), fieldName: 'enabled',
      documentPath: ['map_expansion', 'products', index, 'enabled'], defaultValue: false,
      fragmentId: `${SCENE_MAP_READER_ID}.${id}`, offsetInFragment: 0, byteLength: length,
      approvedBytes: product.approved_bytes, originalBytes: product.original_bytes};
  });
}
function check(field) {
  const index = SCENE_MAP_READER_PRODUCTS.findIndex((_, index) => field.entityHandle === handle(index));
  requireValue(index >= 0 && field.resourceId === SCENE_MAP_READER_ID && field.fieldName === 'enabled'
    && field.defaultValue === false && typeof field.value === 'boolean'
    && bytes(field.approvedBytes, SCENE_MAP_READER_PRODUCTS[index][1])
    && bytes(field.originalBytes, SCENE_MAP_READER_PRODUCTS[index][1]), '场景地图读取器代码字段无效');
}
export const sceneMapReaderFieldOwner = Object.freeze({
  compilerId: SCENE_MAP_READER_COMPILER, documentView: true, describe,
  objects: document => describe(document).map(field => ({id: field.entityHandle, label: '场景地图读取器',
    fragmentIds: [field.fragmentId], fields: [[field.entityHandle, field.fieldName]]})),
  validate(original, overrides) {
    requireValue(original.resource_id === SCENE_MAP_READER_ID, '场景地图读取器身份无效');
    validateFieldOverrides(original, overrides, describe, (current, origin) => {
      const expected = structuredClone(origin);
      current.document.map_expansion.products.forEach((product, index) => {
        requireValue(typeof product.enabled === 'boolean', '代码激活字段须为布尔值');
        expected.document.map_expansion.products[index].enabled = product.enabled;
      });
      requireValue(canonicalJsonEqual(current, expected), '场景地图读取器只能激活定值产物');
    });
  },
  encode(fields, options = {}) {
    return fields.map(field => {
      check(field);
      return {fragment_id: field.fragmentId || field.physical.component.fragment_id,
        payload: Uint8Array.from(fieldRomValue(field, options) ? field.approvedBytes : field.originalBytes),
        relocations: []};
    });
  },
  serializeField(field) {
    check(field);
    requireValue(field.value === true && field.writeback?.state !== 'unpermitted', '场景地图读取器缺激活值或写入许可');
    return Uint8Array.from(field.approvedBytes);
  },
  validatePreimage(fields, fragmentId, baseline) {
    const field = fields.find(field => (field.fragmentId || field.physical?.component?.fragment_id) === fragmentId);
    requireValue(field, '场景地图读取器缺字段原像');
    check(field);
    requireValue(field.originalBytes.length === baseline.length
      && field.originalBytes.every((byte, index) => byte === baseline[index]), '场景地图读取器原像不同');
  },
});
