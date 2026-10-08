// @editor-module 编码战斗道具与队伍回复参数表，按当前参数生成显示投影。
// Owner codecs for the two fixed item-service parameter tables. No ROM placement.
// Profiles/records are the only parameter inputs. Derived displays resolve them
// at read time; the retired raw-table/presentation-copy shape is invalid.
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldFragmentId, fieldByteOffsets} from "./field-codec.js";

export const ITEM_SERVICE_COMPILER_ID = "item-service/v1";
export const ITEM_SERVICE_COMPONENT_CODEC = "metalmaxcn.item-service-component";

class ItemServiceEncodingError extends Error {
  constructor(message) { super(message); this.name = "ItemServiceEncodingError"; }
}

function requireValue(condition, message) {
  if (!condition) throw new ItemServiceEncodingError(message);
}

function uint(value, maximum, label) {
  requireValue(Number.isInteger(value) && value >= 0 && value <= maximum,
    `${label}: expected integer 0..${maximum}`);
  return value;
}

export function itemServiceComponentSpecs(resourceId) {
  if (resourceId === "battle-item-service") return [
    {fragmentId: "battle-item-service.profiles", length: 33},
    {fragmentId: "battle-item-service.visual-selectors", length: 11},
  ];
  requireValue(resourceId === "party-healing-service", "unknown item-service owner");
  return [{fragmentId: "party-healing-service.healing-bases", length: 8}];
}

export function itemServiceAssetSchema(resourceId) {
  itemServiceComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${resourceId}`;
}

function identity(asset, resourceId) {
  const schema = itemServiceAssetSchema(resourceId);
  requireValue(asset?.resource_id === resourceId && asset.schema === schema
    && asset.document?.schema === schema && asset.document.module_id === resourceId
    && asset.edit_policy === "mutable", `${resourceId}: invalid asset identity/policy`);
  const document = asset.document;
  for (const key of ["prepared_attack_amount_low_by_battle_item_dispatch",
    "prepared_attack_amount_high_by_battle_item_dispatch",
    "packed_followup_action_selector_by_battle_item_dispatch",
    "medicine_healing_base_low_by_item_A9_AC", "medicine_healing_base_high_by_item_A9_AC"]) {
    requireValue(!Object.hasOwn(document, key), "retired item-service evidence shape");
  }
  for (const profile of document.profiles || []) {
    requireValue(!Object.hasOwn(profile, "target_scope") && !Object.hasOwn(profile, "unresolved_followup_bits"),
      "persisted battle profile projection");
  }
  for (const entry of [...(document.human_item_presentations || []), ...(document.vehicle_item_presentations || [])]) {
    requireValue(!Object.hasOwn(entry, "visual_reference") && !Object.hasOwn(entry, "target_scope"),
      "persisted battle presentation projection");
  }
  for (const record of document.records || []) {
    requireValue(!Object.hasOwn(record, "minimum_healing") && !Object.hasOwn(record, "maximum_healing"),
      "persisted healing range projection");
  }
}

function scope(selector) {
  return selector & 8 ? "selected-enemy-group" : selector & 16
    ? "all-active-enemies" : "random-enemy-in-selected-group";
}

function battleItemProfile(document, index) {
  const profile = document?.profiles?.[index];
  requireValue(profile?.dispatch_index === index, "battle profile identity/order changed");
  const selector = uint(profile.packed_followup_action_selector, 255, "follow-up selector");
  return {...profile, target_scope: scope(selector), unresolved_followup_bits: selector & 0xe4};
}

export function battleItemPresentation(document, entry) {
  const profile = entry.status === "attack-visual-confirmed"
    ? battleItemProfile(document, entry.profile_dispatch_index) : null;
  return {...entry, visual_reference: profile?.visual_reference ?? null,
    target_scope: profile?.target_scope ?? null};
}

export function healingRange(record) {
  const base = uint(record.base_healing, 65535, "base healing");
  return {minimum_healing: base, maximum_healing: base + 15};
}

/** Ephemeral read model for owner pages. Never save this projection. */

function validateBattleDocument(document) {
  requireValue(document.record_count === 11 && document.owned_byte_count === 44
    && Array.isArray(document.profiles) && document.profiles.length === 11,
  "battle-item-service: expected 11 profiles owning 44 bytes");
  document.profiles.forEach((record, index) => {
    requireValue(record?.dispatch_index === index, "battle profile identity/order changed");
    uint(record.prepared_attack_amount, 65535, "prepared attack amount");
    const selector = uint(record.packed_followup_action_selector, 255, "follow-up selector");
    requireValue((selector & 3) !== 3, "follow-up route 3 has no result entry");
    const visual = /^attack-visual:([0-9A-F]{2})$/u.exec(record.visual_reference);
    requireValue(visual && Number.parseInt(visual[1], 16) < 0x4f,
      "invalid attack-visual reference");
  });
}

function validateHealingDocument(document) {
  requireValue(document.record_count === 4 && document.owned_byte_count === 123
    && Array.isArray(document.records) && document.records.length === 4,
  "party-healing-service: expected four healing records");
  document.records.forEach((record, index) => {
    const id = 0xa9 + index;
    const suffix = id.toString(16).toUpperCase();
    requireValue(record?.id === id && record.handle === `party-healing-service:${suffix}`
      && record.item_reference === `human-item:${suffix}`, "healing record identity/order changed");
    uint(record.base_healing, 65535, "base healing");
  });
}

/** Validate only the named parameter edits; reject edits to code/evidence/copies.
 * Original is mandatory, so unresolved bits and non-parameter fields cannot be
 * smuggled into an apparently successful build. Neither input is mutated.
 */
function validateItemServiceAsset(asset, original) {
  const resourceId = asset?.resource_id;
  identity(asset, resourceId);
  identity(original, resourceId);
  const expected = structuredClone(original);
  if (resourceId === "battle-item-service") {
    validateBattleDocument(asset.document);
    validateBattleDocument(original.document);
    asset.document.profiles.forEach((record, index) => {
      const before = original.document.profiles[index];
      requireValue((record.packed_followup_action_selector & 0xe4)
        === (before.packed_followup_action_selector & 0xe4), "unresolved follow-up bits changed");
      Object.assign(expected.document.profiles[index], {
        prepared_attack_amount: record.prepared_attack_amount,
        packed_followup_action_selector: record.packed_followup_action_selector,
        visual_reference: record.visual_reference,
      });
    });
  } else {
    validateHealingDocument(asset.document);
    validateHealingDocument(original.document);
    asset.document.records.forEach((record, index) => {
      const before = original.document.records[index];
      requireValue(canonicalJsonEqual(before.random_addend, {minimum: 0, maximum: 15}),
        "healing Original random addend disagreement");
      expected.document.records[index].base_healing = record.base_healing;
    });
  }
  requireValue(canonicalJsonEqual(asset, expected),
    `${resourceId}: changes outside the writable parameter fields`);
}

const BATTLE_FIELDS = ["prepared_attack_amount", "packed_followup_action_selector", "visual_reference"];
export function itemServiceFieldDescriptions(document) {
  const resourceId = document?.module_id, battle = resourceId === "battle-item-service";
  const specs = itemServiceComponentSpecs(resourceId), records = battle ? document.profiles : document.records;
  const count = battle ? 11 : 4, seen = new Set();
  requireValue(Array.isArray(records) && records.length === count, "item-service field collection drift");
  return records.flatMap((row, index) => {
    const position = battle ? row.dispatch_index : row.id - 0xa9;
    requireValue(Number.isInteger(position) && position >= 0 && position < count && !seen.has(position), "item-service field identity drift");
    const handle = battle ? `${resourceId}:profile:${position}` : `${resourceId}:${row.id.toString(16).toUpperCase()}`;
    requireValue(battle || (row.handle === handle && row.item_reference === `human-item:${row.id.toString(16).toUpperCase()}`), "healing field handle drift");
    seen.add(position);
    return (battle ? BATTLE_FIELDS : ["base_healing"]).map(fieldName => {
      const amount = fieldName === "prepared_attack_amount" || fieldName === "base_healing";
      const component = fieldName === "visual_reference" ? specs[1] : specs[0];
      const offset = fieldName === "packed_followup_action_selector" ? 22 + position : position;
      return {resourceId, entityHandle: handle, fieldName,
        documentPath: [battle ? "profiles" : "records", index, fieldName], defaultValue: row[fieldName],
        fragmentId: component.fragmentId, offsetInFragment: offset, byteLength: amount ? 2 : 1,
        ...(amount ? {byteOffsetsInFragment: [position, count + position]} : {})};
    });
  });
}
const ITEM_SERVICE_COLUMN_LABELS = new Map([
  ["base_healing", "基础回复量"], ["prepared_attack_amount", "准备攻击量"],
  ["packed_followup_action_selector", "后续动作选择值"], ["visual_reference", "攻击视觉引用"],
]);
const ITEM_SERVICE_COLUMN_RANGES = new Map([
  ["base_healing", [0, 0xffff]], ["prepared_attack_amount", [0, 0xffff]],
  ["packed_followup_action_selector", [0, 0xff]],
]);

/** 一条记录一个字段对象：行是该记录，列是它的可写参数。 */
export function itemServiceObjects(document) {
  const byHandle = new Map();
  for (const field of itemServiceFieldDescriptions(document)) {
    if (!byHandle.has(field.entityHandle)) byHandle.set(field.entityHandle, []);
    byHandle.get(field.entityHandle).push(field);
  }
  return [...byHandle.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `${rows[0].resourceId === "battle-item-service" ? "战斗道具服务" : "人物 HP 共用回复服务"} · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], rowLabels: [entityHandle],
      columns: rows.map(field => {
        const label = ITEM_SERVICE_COLUMN_LABELS.get(field.fieldName) ?? field.fieldName;
        if (field.fieldName === "visual_reference") return {name: field.fieldName, label,
          candidates: {resourceId: "attack-visual", documentPath: ["records"],
            value: ["handle"], label: ["id_hex", "handle"]},
          semantic: {kind: "reference", targetModule: "attack-visual"}};
        const [min, max] = ITEM_SERVICE_COLUMN_RANGES.get(field.fieldName) ?? [0, 0xff];
        return {name: field.fieldName, label, min, max};
      })},
  }));
}

export function serializeItemServiceField(field) {
  const resourceId = field?.resourceId;
  itemServiceComponentSpecs(resourceId);
  if (field.fieldName === "base_healing" || field.fieldName === "prepared_attack_amount") {
    const amount = uint(field.value, 65535, "amount");
    // 低字节落在记录下标、高字节落在记录数之后：与已发布布局的字节偏移声明一致。
    return new Uint8Array([amount & 255, amount >>> 8]);
  }
  if (field.fieldName === "packed_followup_action_selector") {
    const selector = uint(field.value, 255, "follow-up selector");
    requireValue((selector & 3) !== 3, "follow-up route 3 has no result entry");
    return new Uint8Array([selector]);
  }
  if (field.fieldName === "visual_reference") {
    const visual = /^attack-visual:([0-9A-F]{2})$/u.exec(String(field.value));
    requireValue(visual && Number.parseInt(visual[1], 16) < 0x4f, "invalid attack-visual reference");
    return new Uint8Array([Number.parseInt(visual[1], 16)]);
  }
  throw new ItemServiceEncodingError(`未知字段：${field.fieldName}`);
}

export function validateItemServicePreimage(fields, fragmentId, baseline) {
  const spec = itemServiceComponentSpecs(fields[0]?.resourceId)
    .find(item => item.fragmentId === fragmentId);
  requireValue(spec && baseline.length === spec.length, "item-service Origin 片段身份或长度不符");
  // 一个记录对象可能横跨两个片段（战斗道具的量与视觉引用），只校验落在本片段里的字段。
  const seen = new Set();
  for (const field of fields) {
    if (fieldFragmentId(field) !== fragmentId) continue;
    const key = `${field.entityHandle}:${field.fieldName}`;
    requireValue(!seen.has(key), `item-service Origin 字段身份重复：${key}`);
    seen.add(key);
    const expected = serializeItemServiceField({...field, value: field.defaultValue});
    const offsets = fieldByteOffsets(field);
    requireValue(offsets.length === expected.length, "item-service Origin 字节偏移与值长度不符");
    offsets.forEach((offset, index) => requireValue(baseline[offset] === expected[index],
      `item-service Origin 与绑定原像不同：${field.entityHandle}:${field.fieldName}[${index}]`));
  }
}

export function validateItemServiceFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, itemServiceFieldDescriptions, validateItemServiceAsset);
}
export function encodeItemServiceFields(fields, {defaults = false} = {}) {
  const resourceId = fields[0]?.resourceId, battle = resourceId === "battle-item-service";
  const specs = itemServiceComponentSpecs(resourceId), count = battle ? 11 : 4, supplied = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    requireValue(field.resourceId === resourceId && !supplied.has(key), "item-service build field identity drift");
    supplied.set(key, defaults ? field.defaultValue : field.value);
  }
  const payloads = specs.map(spec => new Uint8Array(spec.length));
  for (let index = 0; index < count; index++) {
    const handle = battle ? `${resourceId}:profile:${index}` : `${resourceId}:${(0xa9 + index).toString(16).toUpperCase()}`;
    const get = name => {
      const key = JSON.stringify([handle, name]);
      requireValue(supplied.has(key), "item-service build fields incomplete");
      const value = supplied.get(key); supplied.delete(key); return value;
    };
    const amount = uint(get(battle ? "prepared_attack_amount" : "base_healing"), 65535, "amount");
    payloads[0][index] = amount & 255;
    payloads[0][count + index] = amount >>> 8;
    if (battle) {
      const selector = uint(get("packed_followup_action_selector"), 255, "follow-up selector");
      requireValue((selector & 3) !== 3, "follow-up route 3 has no result entry");
      const visual = /^attack-visual:([0-9A-F]{2})$/u.exec(get("visual_reference"));
      requireValue(visual && Number.parseInt(visual[1], 16) < 0x4f, "invalid attack-visual reference");
      payloads[0][22 + index] = selector;
      payloads[1][index] = Number.parseInt(visual[1], 16);
    }
  }
  requireValue(supplied.size === 0, "unknown item-service build field");
  return specs.map((spec, index) => ({fragment_id: spec.fragmentId, payload: payloads[index], relocations: []}));
}
