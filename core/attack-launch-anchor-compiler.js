// @editor-module 按发布许可描述和序列化武器发射锚点字段，物理放置归 linker。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldFragmentId, fieldOffsetInFragment, fieldByteLength, ROM_WRITE_PENDING} from "./field-codec.js";

export const LAUNCH_ANCHOR_OWNER = "weapon-attack-parameter";
export const LAUNCH_ANCHOR_COMPILER_ID = "attack-launch-anchors/v1";
export const LAUNCH_ANCHOR_COMPONENT_CODEC = "metalmaxcn.attack-launch-anchor-byte";
export const LAUNCH_ANCHOR_RESOURCE_PATHS = Object.freeze({
  [LAUNCH_ANCHOR_OWNER]: "game/visuals/semantic-assets/original/project-visuals-weapon-assets.json",
});
export const LAUNCH_ANCHOR_RESOURCE_SCHEMAS = Object.freeze({
  [LAUNCH_ANCHOR_OWNER]: "metalmaxcn.semantic-owner.project-visuals-weapon-assets",
});
const CLASSES = Object.freeze(["tank-main-gun", "tank-sub-gun", "tank-special", "human-weapon"]);
const TABLES = Object.freeze({y: "attack_cmd13_launch_y_offsets", x: "attack_cmd13_layout_x_anchors"});
const fragment = (axis, id) => `${LAUNCH_ANCHOR_OWNER}.launch-${axis}.${id}`;
const require = (ok, message) => {if (!ok) throw new TypeError(message);};

export function launchAnchorAssetSchema(resourceId) {
  require(resourceId === LAUNCH_ANCHOR_OWNER, "未知发射锚点 owner");
  return LAUNCH_ANCHOR_RESOURCE_SCHEMAS[resourceId];
}

export function launchAnchorComponentSpecs(resourceId) {
  launchAnchorAssetSchema(resourceId);
  return Object.keys(TABLES).flatMap(axis => CLASSES.map(id => ({fragmentId: fragment(axis, id), length: 1})));
}

export function launchAnchorFieldDescriptions(document) {
  const components = document?.writeback_components;
  require(document?.writeback?.compiler_id === LAUNCH_ANCHOR_COMPILER_ID && components?.length === 8,
    "发射锚点缺少已发布字段组件");
  const anchors = Object.entries(TABLES).flatMap(([axis, table]) => {
    const rows = document[table], seen = new Set();
    require(Array.isArray(rows) && rows.length === CLASSES.length, "发射锚点分类集合不完整");
    return rows.map((row, index) => {
      const id = row.action_class, fragmentId = fragment(axis, id);
      require(CLASSES.includes(id) && !seen.has(id), "发射锚点身份重复或未发布");
      seen.add(id);
      const component = components.find(entry => entry.fragment_id === fragmentId);
      const domain = component?.edit_domain, bounds = domain?.allowed_integer_values;
      require(component?.web_editable === true && domain?.status === "confirmed"
        && Number.isInteger(bounds?.minimum) && Number.isInteger(bounds?.maximum)
        && bounds.minimum >= 0 && bounds.maximum <= 255 && bounds.minimum <= bounds.maximum,
      "发射锚点替换域未发布");
      require(Number.isInteger(row.value) && row.value >= bounds.minimum && row.value <= bounds.maximum,
        "发射锚点值超出 Original 许可");
      return {resourceId: LAUNCH_ANCHOR_OWNER, entityHandle: `${LAUNCH_ANCHOR_OWNER}:${id}`,
        recordId: id, fieldName: axis, defaultValue: row.value, documentPath: [table, index, "value"],
        editDomain: structuredClone(domain), fragmentId, offsetInFragment: 0, byteLength: 1};
    });
  });
  const selectors = document.monster_action_selector_or_pattern_ids;
  require(Array.isArray(selectors) && selectors.length === 131
    && selectors.every(value => Number.isInteger(value) && value >= 0 && value <= 255),
  "怪物联合选择表缺少 131 项原值");
  return [...anchors, ...selectors.map((value, index) => ({
    resourceId: LAUNCH_ANCHOR_OWNER,
    entityHandle: `${LAUNCH_ANCHOR_OWNER}:monster-action-selector:${index.toString(16).toUpperCase().padStart(2, "0")}`,
    fieldName: "selector_or_pattern", defaultValue: value,
    documentPath: ["monster_action_selector_or_pattern_ids", index], writeback: ROM_WRITE_PENDING,
  }))];
}

function validateLaunchAnchorAsset(asset, original) {
  for (const candidate of [asset, original]) {
    require(candidate?.resource_id === LAUNCH_ANCHOR_OWNER
      && candidate.schema === launchAnchorAssetSchema(LAUNCH_ANCHOR_OWNER), "发射锚点资产身份已改变");
  }
  const expected = structuredClone(original);
  for (const field of launchAnchorFieldDescriptions(original.document)) {
    const [table, index, key] = field.documentPath;
    if (field.fieldName === "selector_or_pattern") {
      const value = asset.document?.[table]?.[index];
      require(Number.isInteger(value) && value >= 0 && value <= 255,
        "怪物联合选择字段须为字节");
      expected.document[table][index] = value;
      continue;
    }
    const value = asset.document?.[table]?.[index]?.[key];
    const bounds = original.document.writeback_components.find(row => row.fragment_id === fieldFragmentId(field))
      .edit_domain.allowed_integer_values;
    require(Number.isInteger(value) && value >= bounds.minimum && value <= bounds.maximum,
      "发射锚点值超出 Original 许可");
    expected.document[table][index][key] = value;
  }
  require(canonicalJsonEqual(expected, asset), "发射锚点只允许修改字段值，不能改写许可或结构");
}

export function validateLaunchAnchorFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, launchAnchorFieldDescriptions, validateLaunchAnchorAsset);
}

export function projectLaunchAnchorFieldView(document) {
  for (const table of Object.values(TABLES)) for (const row of document[table]) {
    Object.defineProperty(row, "value_hex", {enumerable: true, configurable: true,
      get: () => `0x${row.value.toString(16).toUpperCase().padStart(2, "0")}`});
  }
}

export function launchAnchorObjects(document) {
  const fields = launchAnchorFieldDescriptions(document);
  const byHandle = new Map();
  for (const field of fields) {
    const rows = byHandle.get(field.entityHandle) || [];
    rows.push(field);
    byHandle.set(field.entityHandle, rows);
  }
  return [...byHandle.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: rows.every(field => field.fieldName === "selector_or_pattern")
      ? `怪物联合选择 · ${entityHandle.split(":").at(-1)}`
      : `发射锚点 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: rows.map(field => field.fragmentId).filter(Boolean),
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName, label: field.fieldName === "x" ? "横向锚点" : field.fieldName === "y" ? "纵向锚点" : "怪物联合选择", min: 0, max: 255,
    }))},
  }));
}

export function serializeLaunchAnchorField(field) {
  const offsetInFragment = fieldOffsetInFragment(field);
  require(field?.resourceId === LAUNCH_ANCHOR_OWNER && ["x", "y"].includes(field.fieldName)
    && Number.isInteger(field.value) && field.value >= 0 && field.value <= 255
    && Number.isInteger(offsetInFragment) && offsetInFragment === 0,
  "发射锚点字段身份或值无效");
  return new Uint8Array([field.value]);
}

export function validateLaunchAnchorPreimage(fields, fragmentId, baseline) {
  const owned = (fields || []).filter(field => fieldFragmentId(field) === fragmentId);
  const field = owned[0], offset = fieldOffsetInFragment(field), byteLength = fieldByteLength(field);
  require(owned.length === 1 && field?.resourceId === LAUNCH_ANCHOR_OWNER
    && Number.isInteger(offset) && offset === 0
    && Number.isInteger(byteLength) && baseline.length >= byteLength,
  "发射锚点 Origin 片段身份或长度不符");
  require(baseline[0] === field.defaultValue, "发射锚点 Origin 与绑定原像不同");
}

export function encodeLaunchAnchorFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    if (field.fieldName === "selector_or_pattern") {
      require(field.writeback?.state === "unpermitted" && !fieldFragmentId(field),
      "怪物联合选择字段没有写入许可");
      continue;
    }
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === LAUNCH_ANCHOR_OWNER && !values.has(key), "发射锚点字段重复或来自其他 owner");
    const value = defaults ? field.defaultValue : field.value;
    require(Number.isInteger(value) && value >= 0 && value <= 255, "发射锚点字段须为字节");
    values.set(key, value);
  }
  const encoded = Object.keys(TABLES).flatMap(axis => CLASSES.map(id => {
    const key = JSON.stringify([`${LAUNCH_ANCHOR_OWNER}:${id}`, axis]);
    require(values.has(key), "发射锚点构建字段缺失");
    const value = values.get(key); values.delete(key);
    return {fragment_id: fragment(axis, id), payload: new Uint8Array([value]), relocations: []};
  }));
  require(values.size === 0, "发射锚点含未登记字段");
  return encoded;
}
