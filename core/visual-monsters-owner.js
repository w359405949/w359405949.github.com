// @editor-module 为 monster-visual-layout 聚合中尚无独立 owner 的攻击源锚点登记字段。
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";
import {fieldRomValue, validateFieldOverrides} from "./field-codec.js";

const VISUAL_MONSTERS_OWNER = "monster-visual-layout";
const VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT =
  "monster-visual-layout.attack-source-anchors";

const BYTE_COUNT = 0xf2;
const handle = id => `${VISUAL_MONSTERS_OWNER}:attack-source:${id.toString(16).toUpperCase().padStart(2, "0")}`;

function require(condition, message) {
  if (!condition) throw new TypeError(message);
}

function visualMonstersFieldDescriptions(document) {
  const rows = document?.attack_source_anchor_region;
  require(Array.isArray(rows) && rows.length === BYTE_COUNT,
    "monster-visual-layout attack source anchor region length changed");
  return rows.map((row, id) => {
    require(row?.id === id, "monster-visual-layout attack source anchor identity changed");
    require(Number.isInteger(row.value) && row.value >= 0 && row.value <= 0xff,
      `monster-visual-layout attack source anchor ${id} is outside byte range`);
    return {
      resourceId: VISUAL_MONSTERS_OWNER,
      entityHandle: handle(id),
      fieldName: "value",
      defaultValue: row.value,
      documentPath: ["attack_source_anchor_region", id, "value"],
      fragmentId: VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT,
      offsetInFragment: id,
      byteLength: 1,
    };
  });
}

export function visualMonstersObjects(document) {
  return visualMonstersFieldDescriptions(document).map(field => ({
    id: field.entityHandle,
    label: `怪物攻击源锚点 · ${field.entityHandle.split(":").at(-1)}`,
    fragmentIds: [VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT],
    fields: [[field.entityHandle, field.fieldName]],
    editor: {kind: "numeric-table", rows: [field.entityHandle], columns: [{
      name: field.fieldName, label: "原值", min: 0, max: 0xff,
    }]},
  }));
}

export function serializeVisualMonstersField(field) {
  if (field?.resourceId !== VISUAL_MONSTERS_OWNER || field.fieldName !== "value"
      || !Number.isInteger(field.value) || field.value < 0 || field.value > 0xff) {
    throw new TypeError("monster-visual-layout 字段值无效");
  }
  return new Uint8Array([field.value]);
}

function validateVisualMonstersFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, visualMonstersFieldDescriptions,
    candidate => visualMonstersFieldDescriptions(candidate.document));
}

function encodeVisualMonstersFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    require(field.resourceId === VISUAL_MONSTERS_OWNER
      && field.fieldName === "value" && !values.has(field.entityHandle),
    "monster-visual-layout attack source field identity repeated");
    values.set(field.entityHandle, fieldRomValue(field, {defaults}));
  }
  const payload = new Uint8Array(BYTE_COUNT);
  for (let id = 0; id < BYTE_COUNT; id += 1) {
    const key = handle(id);
    require(values.has(key), `monster-visual-layout attack source field missing ${key}`);
    payload[id] = values.get(key);
    values.delete(key);
  }
  require(values.size === 0, "monster-visual-layout attack source has unregistered fields");
  return [{fragment_id: VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT, payload, relocations: []}];
}


export const visualMonstersFieldOwner = Object.freeze({
  compilerId: "visual-core/v1",
  bindingResourceId: VISUAL_MONSTERS_OWNER,
  fragmentIds: Object.freeze([VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT]),
  describe: visualMonstersFieldDescriptions,
  validate: validateVisualMonstersFieldOverrides,
  encode: encodeVisualMonstersFields,
  documentView: true,
  legacyClosed: true,
});
