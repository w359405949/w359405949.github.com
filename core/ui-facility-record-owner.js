// @editor-module 设施数据记录的逐资源字段；ROM 写入许可未发布。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

const hex = value => value.toString(16).toUpperCase().padStart(2, "0");
const frog = Array.from({length: 5}, (_, id) => `ui-facility:frog-race:config:${hex(id)}`);
const tracks = [[0, 2], [1, 4], [2, 4]].flatMap(([configuration, count]) =>
  Array.from({length: count}, (_, index) =>
    `ui-facility:jukebox:${hex(configuration)}:track:${hex(index)}`));
const jukebox = Array.from({length: 3}, (_, id) => `ui-facility:jukebox:config:${hex(id)}`);
const teleport = Array.from({length: 13}, (_, id) => `ui-facility:teleport-terminal:config:${hex(id)}`);
export const HIDDEN_TELEPORT_RESOURCE_ID = teleport[12];
const TELEPORT_LIST_RESOURCE_ID = "ui-facility:teleport-terminal";
export const UI_FACILITY_DATA_RESOURCE_IDS = Object.freeze([
  ...frog, ...tracks, ...jukebox, ...teleport, TELEPORT_LIST_RESOURCE_ID]);
export const UI_FACILITY_PARAMETER_RESOURCE_IDS = Object.freeze([...frog, ...teleport]);
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

function resourceIdOf(asset) {
  const resourceId = asset?.resource_id;
  require(UI_FACILITY_DATA_RESOURCE_IDS.includes(resourceId)
    && asset.schema === "metalmaxcn.field-ui-module.asset.ui-facility"
    && asset.edit_policy === "mutable", "设施数据记录身份无效");
  return resourceId;
}

function fieldsFor(resourceId) {
  if (resourceId === TELEPORT_LIST_RESOURCE_ID) return Array.from({length: 11}, (_, index) =>
    [`cursor_step_${hex(index)}`, "destination_list_cursor_steps_address", `标签步长 ${hex(index)}`,
      ["destination_list_cursor_steps", index]]);
  if (frog.includes(resourceId)) return [["price", "price_address", "价格"]];
  if (tracks.includes(resourceId)) return [["audio_command_id", "address", "音频命令"]];
  if (jukebox.includes(resourceId)) return [["length_prefix", "table", "曲目数前缀"]];
  return [...(resourceId === HIDDEN_TELEPORT_RESOURCE_ID
    ? [["scene_id", "scene_id_address", "目标场景"]] : []),
    ["coordinate_x", "coordinate_x_address", resourceId === HIDDEN_TELEPORT_RESOURCE_ID ? "相机横坐标" : "横坐标"],
    ["coordinate_y", "coordinate_y_address", resourceId === HIDDEN_TELEPORT_RESOURCE_ID ? "相机纵坐标" : "纵坐标"]];
}

function describe(document, {asset} = {}) {
  const resourceId = resourceIdOf(asset);
  if (resourceId === TELEPORT_LIST_RESOURCE_ID)
    require(document.destination_list_cursor_steps?.length === 11
      && document.destination_list_cursor_steps_address?.length === 11,
    "标签步长字段必须覆盖十一项独占数据");
  return fieldsFor(resourceId).map(([name, addressName, , path], index) => {
    const address = document?.[addressName];
    const documentPath = path || [name];
    const value = documentPath.reduce((node, key) => node?.[key], document);
    require(address?.space === "prg" && Number.isInteger(address.offset)
      && address.offset >= 0 && address.length >= 1
      && Number.isInteger(value) && value >= 0 && value <= 255,
    `${resourceId}.${name} 地址或字节无效`);
    return {resourceId, entityHandle: resourceId, fieldName: name,
      defaultValue: value, documentPath, writeback: ROM_WRITE_PENDING,
      ...(resourceId === TELEPORT_LIST_RESOURCE_ID ? {physical: {space: "prg",
        offset: address.offset + index, length: 1, end_exclusive: address.offset + index + 1}} : {})};
  });
}

function objects(document, {asset} = {}) {
  const resourceId = resourceIdOf(asset);
  const fields = describe(document, {asset});
  return [{id: resourceId, label: document.label || resourceId,
    fragmentIds: [], fields: fields.map(field => [resourceId, field.fieldName]),
    editor: {kind: "numeric-table", rows: [resourceId],
      columns: fields.map((field, index) => ({name: field.fieldName,
        label: fieldsFor(resourceId)[index][2], min: 0, max: field.fieldName === 'scene_id' ? 239 : 255,
        ...(field.fieldName === 'scene_id' ? {semantic: {kind: 'reference', targetModule: 'scene-header-map', picker: 'generic'},
          candidates: {document: 'project.scenes', documentPath: ['editable_scenes'],
            value: ['id'], label: ['name', 'id']}} : {})}))}}];
}

function validate(candidate, original) {
  const resourceId = resourceIdOf(original);
  require(candidate?.resource_id === resourceId && candidate.schema === original.schema
    && candidate.edit_policy === original.edit_policy, "设施数据资源身份改变");
  const expected = structuredClone(original);
  for (const [name, , , path] of fieldsFor(resourceId)) {
    const documentPath = path || [name];
    const value = documentPath.reduce((node, key) => node?.[key], candidate.document);
    require(Number.isInteger(value) && value >= 0 && value <= 255,
      `${resourceId}.${name} 字节无效`);
    require(name !== 'scene_id' || value <= 239, '目标场景须为已发布场景');
    const parent = documentPath.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[documentPath.at(-1)] = value;
  }
  require(canonicalJsonEqual(candidate, expected), "设施数据只允许修改已登记字节");
}

export function uiFacilityRecordFieldOwner(resourceId) {
  require(UI_FACILITY_DATA_RESOURCE_IDS.includes(resourceId), "设施数据 owner 身份无效");
  return Object.freeze({compilerId: null, physicalWriteback: false,
    writeback: ROM_WRITE_PENDING, describe, objects,
    validate: (original, overrides) => validateFieldOverrides(
      original, overrides, describe, validate),
    encode: () => [], documentView: true, legacyClosed: true});
}

export function applyUiFacilityParameterProjection(facilities, documents) {
  const bind = (row, resourceId, names) => {
    const document = documents.get(resourceId);
    require(document, `${resourceId} 缺当前字段对象正文`);
    for (const name of names) Object.defineProperties(row, {
      [name]: {enumerable: true, configurable: true, get: () => document[name]},
      [`${name}_hex`]: {enumerable: true, configurable: true, get: () => `0x${hex(document[name])}`},
    });
  };
  for (const facility of facilities.facilities || []) {
    if (facility.id === 'frog-race') for (const row of facility.configuration.variants || [])
      bind(row, `ui-facility:frog-race:config:${hex(row.id)}`, ['price']);
    if (facility.id === 'teleport-terminal') for (const row of facility.configuration.destinations || [])
      bind(row, `ui-facility:teleport-terminal:config:${hex(row.id)}`, ['coordinate_x', 'coordinate_y']);
    if (facility.id === 'teleport-terminal')
      facility.configuration.hidden_destination = documents.get(HIDDEN_TELEPORT_RESOURCE_ID);
  }
}
