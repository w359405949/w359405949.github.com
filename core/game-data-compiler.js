// @editor-module 编码游戏数据资源，并提供装备列状态的语义操作。
// Pure semantic encoder for Metal Max gameplay data.
//
// This module is the browser counterpart of the component encoders in
// engine/tools/rom_assets/game_data/compiler.py.  It knows stable
// resource/component identities and their compact codecs, but deliberately
// knows no ROM path, bank, slot, or
// physical offset.  asset-compiler.js injects target slots from BuildMap
// bindings after these payloads have been derived.

import {sha256Hex} from "./rom-linker.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldFragmentId, fieldOffsetInFragment, fieldByteLength, fieldRomValue, ROM_WRITE_PENDING} from "./field-codec.js";
import {MONSTER_TABLE_SHAPES, MONSTER_TABLE_WIDTH} from "./shared-table-shapes.js";

// Owner codec: character.initial-template.slot-flags and vehicle-preset masks
// number equipment columns from the most significant bit. Views use columns.
export function equipmentColumnState(value, column) {
  return Boolean(value & (0x80 >>> column));
}

export function setEquipmentColumnState(value, column, equipped) {
  if (!Number.isInteger(column) || column < 0 || column > 7) {
    throw new Error("装备列未发布");
  }
  const mask = 0x80 >>> column;
  return equipped ? value | mask : value & ~mask;
}

export function equipmentNamedStates(value, slots, columnKey) {
  return Object.fromEntries(slots.map(slot =>
    [slot.id, equipmentColumnState(value, slot[columnKey])],
  ));
}

function equipmentSlotBits(slots, columnKey) {
  if (!Array.isArray(slots) || !slots.length) throw new GameDataEncodingError("装备列标签未发布");
  const columns = slots.map(slot => slot?.[columnKey]);
  if (columns.some(column => !Number.isInteger(column) || column < 0 || column > 7)
      || new Set(columns).size !== columns.length)
    throw new GameDataEncodingError("装备列位次无效");
  return slots.map(slot => ({value: 0x80 >>> slot[columnKey],
    label: slot.slot_id ? `${slot.slot_id} · 装备列 ${slot[columnKey] + 1}`
      : `装备列 ${slot[columnKey] + 1}`}));
}

export const GAME_DATA_COMPILER_ID = "game-data/v1";
export const GAME_DATA_COMPONENT_CODEC = "metalmaxcn.game-data-component";
export const GAME_DATA_COMPONENT_CODEC_VERSION = "1";
export const GAME_DATA_ENCODER = "game-data/v1";
export const GAME_DATA_ENCODER_VERSION = "1";

// This is the semantic character input, not the display projection: the
// publisher removes writeback_state before creating Original assets. Keep the
// closed shape shared with the parity contract so new semantic inputs require
// one explicit declaration change and cannot silently become ignored fields.
const CHARACTER_DOCUMENT_KEYS = Object.freeze([
  "equipment_slot_flags", "growth_profiles", "name_initialization", "rom_initial", "schema",
]);

export const CHARACTER_COUNT = 3;
export const CHARACTER_TEMPLATE_BYTES = 0xb7;
const CHARACTER_TEMPLATE_DEST_CPU = 0x6447;
export const CHARACTER_NAME_CELL_BYTES = 4;
export const CHARACTER_NAME_PRESET_COUNT = 5;
export const CHARACTER_NAME_CANDIDATE_COUNT = 11;
export const ITEM_COUNT = 0xde;
const ITEM_NUMERIC_CODEBOOK_BYTES = 0x18a;
const ITEM_NUMERIC_FIRST_UNAVAILABLE_CODE = 0xe9;
export const ITEM_ATTACK_FIRST = 0x23;
export const ITEM_ATTACK_LAST = 0x74;
const ITEM_ATTACK_VISUAL_CODE_MAX = 0x4e;
export const ITEM_ATTACK_TARGET_SCOPE_MASK = 0x18;
const ITEM_ATTACK_TARGET_SCOPE_BITS = new Set([0x00, 0x08, 0x10]);
const ITEM_FIELD_RESOURCE = "item-entry";
export const MONSTER_COUNT = 131;
export const MONSTER_DROP_FIRST_ID = 0x18;
export const MONSTER_DROP_ITEM_COUNT = MONSTER_COUNT - MONSTER_DROP_FIRST_ID;
export const ENCOUNTER_FORMATION_COUNT = 0x39;
export const ENCOUNTER_FORMATION_BYTES = 8;
export const BATTLE_TEST_HANDLER_STORED = 0xbc07;
export const BATTLE_TEST_ORIGINAL_HANDLER_STORED = 0xbd28;
export const VEHICLE_PRESET_COUNT = 18;
const VEHICLE_LOADOUT_SLOT_COUNT = 6;
export const VEHICLE_COUNT = 8;
export const VEHICLE_PLACEMENT_SLOT_COUNT = 11;
const VEHICLE_PLACEMENT_SCENE_LAST_ID = 0xef;
export const VEHICLE_PLACEMENT_UNPLACED_SCENE = 0xff;
export const WANTED_TARGET_COUNT = 12;
const WANTED_TARGET_SCENE_IDS = Object.freeze([
  0x19, 0x2e, 0x34, 0x35, 0x3b, 0x48,
  0x51, 0x56, 0x59, 0x68, 0x6f, 0x70,
]);

const CHARACTER_EDITABLE_FIELDS = Object.freeze({
  max_hp: [2, 0, 0xffff],
  current_hp: [2, 0, 0xffff],
  attack: [2, 0, 0xffff],
  defense: [2, 0, 0xffff],
  level: [1, 1, 99],
  strength: [1, 0, 0xff],
  intelligence: [1, 0, 0xff],
  speed: [1, 0, 0xff],
  vitality: [1, 0, 0xff],
  battle_skill: [1, 0, 0xff],
  repair_skill: [1, 0, 0xff],
  driving_skill: [1, 0, 0xff],
  experience: [3, 0, 0xffffff],
});

const COMPONENT_SPECS = Object.freeze({
  "shell-record": Object.freeze([
    ["shell-record.vending-price-codes", "vending-price-codes", 14],
  ]),
  "character-initial-record": Object.freeze([
    ["character-initial-record.initial-template", "initial-template", 0xb7],
    ["character-initial-record.growth-a", "growth-a", 0x57],
    ["character-initial-record.growth-b", "growth-b", 0x5c],
    ["character-initial-record.growth-c", "growth-c", 0x35],
    ["character-initial-record.growth-d", "growth-d", 0x3d],
  ]),
  "fixed-text-slot": Object.freeze([
    ["fixed-text-slot.name-presets", "name-presets", 5 * 4 * 4],
    ["fixed-text-slot.mechanic-name-candidates", "mechanic-name-candidates", 11 * 4],
    ["fixed-text-slot.soldier-name-candidates", "soldier-name-candidates", 11 * 4],
    ["fixed-text-slot.ui-status-words", "ui-status-words", 18 * 2],
  ]),
  "monster-profile": Object.freeze(MONSTER_TABLE_SHAPES.map(([name, , , length]) =>
    [`monster-profile.${name.replaceAll("_", "-")}`, name, length * MONSTER_TABLE_WIDTH])),
  "battle-test-point": Object.freeze([
    ["battle-test-point.formations", "formations", 0x39 * 8],
    ["battle-test-point.scene-id", "scene-id", 1],
    ["battle-test-point.x", "x", 1],
    ["battle-test-point.y", "y", 1],
    ["battle-test-point.handler-pointer", "handler-pointer", 2],
    ["battle-test-point.state-flag-check", "state-flag-check", 1],
    ["battle-test-point.repeat-check", "repeat-check", 2],
    ["battle-test-point.intro-text", "intro-text", 1],
    ["battle-test-point.state-flag-set", "state-flag-set", 1],
    ["battle-test-point.encounter-id", "encounter-id", 1],
    ["battle-test-point.completed-text", "completed-text", 1],
  ]),
  "item-entry": Object.freeze([
    ["item-entry.numeric-codebook", "numeric-codebook", ITEM_NUMERIC_CODEBOOK_BYTES],
    ["item-entry.equipment-flags", "equipment-flags", 0x75],
    ["item-entry.attack-visual-codes", "attack-visual-codes", 0x52],
    ["item-entry.tank-weight", "tank-weight", 0x50],
    ["item-entry.equipment-values", "equipment-values", 0xc5],
    ["item-entry.price-codes", "price-codes", ITEM_COUNT],
    ["item-entry.engine-capacity", "engine-capacity", 0x18],
  ]),
  "vehicle-preset": Object.freeze([
    ["vehicle-preset.loadouts", "loadouts", 18 * 6],
    ["vehicle-preset.equipped-masks", "equipped-masks", 18],
    ["vehicle-preset.ammo-capacities", "ammo-capacities", 18],
    ["vehicle-preset.defense", "defense", 18 * 2],
    ["vehicle-preset.chassis-weight", "chassis-weight", 18 * 2],
    ["vehicle-preset.mount-masks", "mount-masks", 18],
    ["vehicle-preset.initial-placement", "initial-placement", 11 + 8 * 2],
  ]),
  "wanted-record": Object.freeze([
    ["wanted-record.default-pair", "default-pair", 1],
    ["wanted-record.targets", "targets", WANTED_TARGET_COUNT],
    ["wanted-record.bounty-codes", "bounty-codes", 11],
  ]),
});

const ASSET_SCHEMAS = Object.freeze({
  "shell-record": "metalmaxcn.game-data.asset.shells",
  "character-initial-record": "metalmaxcn.game-data.asset.characters",
  "monster-profile": "metalmaxcn.game-data.asset.monsters",
  "battle-test-point": "metalmaxcn.game-data.asset.battle-test",
  "item-entry": "metalmaxcn.game-data.asset.items",
  "vehicle-preset": "metalmaxcn.game-data.asset.vehicles",
  "wanted-record": "metalmaxcn.game-data.asset.wanted",
  "fixed-text-slot": "metalmaxcn.game-data.asset.fixed-slots",
});

export class GameDataEncodingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "GameDataEncodingError";
  }
}

const plainObject = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

function requireObject(value, label) {
  if (!plainObject(value)) throw new GameDataEncodingError(`${label} must be an object`);
  return value;
}

function editorInteger(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value)) {
    throw new GameDataEncodingError(`${label} must be an integer`);
  }
  if (value < minimum || value > maximum) {
    throw new GameDataEncodingError(
      `${label} must be between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

function fieldValue(value, label) {
  if (plainObject(value)) {
    for (const key of ["value", "internal_units", "raw", "item_id"]) {
      if (Object.hasOwn(value, key)) {
        value = value[key];
        break;
      }
    }
  }
  if (!Number.isSafeInteger(value)) {
    throw new GameDataEncodingError(`${label} must resolve to an integer`);
  }
  return value;
}

function bytesFromHex(value, label) {
  if (typeof value !== "string") {
    throw new GameDataEncodingError(`${label} has no payload_hex`);
  }
  const compact = value.replace(/\s/g, "");
  if (compact.length % 2 || !/^[0-9a-f]*$/i.test(compact)) {
    throw new GameDataEncodingError(`${label} payload_hex is invalid`);
  }
  const result = new Uint8Array(compact.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(compact.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
}

function cloneTables(tables) {
  return Object.fromEntries(
    Object.entries(tables).map(([slug, payload]) => [slug, payload.slice()]),
  );
}

function writeLittleEndian(target, offset, width, value, label) {
  const end = offset + width;
  if (!Number.isSafeInteger(offset) || offset < 0 || end > target.length) {
    throw new GameDataEncodingError(`${label} resolves outside its component`);
  }
  for (let byte = 0; byte < width; byte += 1) {
    target[offset + byte] = Math.floor(value / (2 ** (byte * 8))) & 0xff;
  }
}

export function templateOffset(cpuAddress) {
  const offset = cpuAddress - CHARACTER_TEMPLATE_DEST_CPU;
  if (offset < 0 || offset >= CHARACTER_TEMPLATE_BYTES) {
    throw new GameDataEncodingError("active-save address is not in character template");
  }
  return offset;
}

function recordsById(records, count, idField, label) {
  if (!Array.isArray(records) || records.length !== count) {
    throw new GameDataEncodingError(`${label} must contain ${count} records`);
  }
  const result = new Map();
  for (const [position, raw] of records.entries()) {
    const row = requireObject(raw, `${label}[${position}]`);
    const id = editorInteger(row[idField], `${label}[${position}].${idField}`, 0, count - 1);
    if (result.has(id)) throw new GameDataEncodingError(`${label} has duplicate id ${id}`);
    result.set(id, row);
  }
  if (result.size !== count) throw new GameDataEncodingError(`${label} ids are incomplete`);
  return result;
}

export function gameDataComponentSpecs(resourceId) {
  const specs = COMPONENT_SPECS[resourceId];
  if (!specs) throw new GameDataEncodingError(`unknown gameplay-data resource: ${resourceId}`);
  return specs.map(([fragmentId, slug, length]) => ({fragmentId, slug, length}));
}

export function gameDataAssetSchema(resourceId) {
  const schema = ASSET_SCHEMAS[resourceId];
  if (!schema) throw new GameDataEncodingError(`unknown gameplay-data resource: ${resourceId}`);
  return schema;
}

export async function baselineComponentTables(asset, resourceId) {
  requireObject(asset, resourceId);
  if (asset.resource_id !== resourceId) {
    throw new GameDataEncodingError(`semantic resource id mismatch for ${resourceId}`);
  }
  requireObject(asset.document, `${resourceId}.document`);
  if (resourceId === "character-initial-record") {
    const document = asset.document;
    // equipment_slot_flags describes the named equipment slots; ROM encoding
    // still consumes each role's integer slot_flags below.
    const actualKeys = Object.keys(document).sort();
    if (stableJson(actualKeys) !== stableJson(CHARACTER_DOCUMENT_KEYS)) {
      throw new GameDataEncodingError(
        `character-initial-record.document must contain exactly ${CHARACTER_DOCUMENT_KEYS.join(", ")}`,
      );
    }
  }
  if (!Array.isArray(asset.components)) {
    throw new GameDataEncodingError(`${resourceId}.components must be an array`);
  }
  const expected = new Map(gameDataComponentSpecs(resourceId).map(spec => [spec.fragmentId, spec]));
  const seen = new Set();
  const tables = {};
  for (const [position, raw] of asset.components.entries()) {
    const component = requireObject(raw, `${resourceId}.components[${position}]`);
    const spec = expected.get(component.id);
    if (!spec) throw new GameDataEncodingError(`unknown component in ${resourceId}: ${component.id}`);
    if (seen.has(component.id)) {
      throw new GameDataEncodingError(`duplicate component in ${resourceId}: ${component.id}`);
    }
    seen.add(component.id);
    if (component.slug !== spec.slug) {
      throw new GameDataEncodingError(`component slug mismatch for ${component.id}`);
    }
    if (component.codec !== GAME_DATA_COMPONENT_CODEC ||
        component.codec_version !== GAME_DATA_COMPONENT_CODEC_VERSION) {
      throw new GameDataEncodingError(`component codec mismatch for ${component.id}`);
    }
    const payload = bytesFromHex(component.payload_hex, `component ${component.id}`);
    if (component.length !== payload.length || payload.length !== spec.length) {
      throw new GameDataEncodingError(
        `component ${component.id} has ${payload.length} bytes; expected ${spec.length}`,
      );
    }
    if (component.payload_sha256 !== await sha256Hex(payload)) {
      throw new GameDataEncodingError(
        `component ${component.id} immutable payload hash changed`,
      );
    }
    tables[spec.slug] = payload;
  }
  const missing = [...expected.keys()].filter(id => !seen.has(id));
  if (missing.length) {
    throw new GameDataEncodingError(
      `${resourceId} is missing components: ${missing.sort().join(", ")}`,
    );
  }
  return tables;
}

async function encodeCharacters(asset) {
  const tables = cloneTables(await baselineComponentTables(asset, "character-initial-record"));
  const document = asset.document;
  const initial = requireObject(document.rom_initial, "characters.rom_initial");
  const template = tables["initial-template"];
  const initialGold = editorInteger(
    fieldValue(initial.gold, "rom_initial.gold"),
    "initial_gold", 0, 0xffffff,
  );
  writeLittleEndian(
    template,
    templateOffset(0x645d),
    3,
    initialGold,
    "initial_gold",
  );
  const roles = recordsById(
    initial.roles, CHARACTER_COUNT, "id", "characters.rom_initial.roles",
  );
  for (const [roleId, role] of roles) {
    const sources = plainObject(role.sources) ? role.sources : {};
    for (const [field, [width, minimum, maximum]] of
      Object.entries(CHARACTER_EDITABLE_FIELDS)) {
      const value = editorInteger(
        fieldValue(role[field], `roles[${roleId}].${field}`),
        `roles[${roleId}].${field}`,
        minimum,
        maximum,
      );
      const source = sources[field];
      if (!plainObject(source) || source.width !== width) {
        throw new GameDataEncodingError(
          `roles[${roleId}].${field} has no codec source`,
        );
      }
      writeLittleEndian(
        template,
        source.template_offset,
        width,
        value,
        `roles[${roleId}].${field}`,
      );
    }
    for (const [label, values, cpu] of [
      ["equipment", role.equipment, 0x6496 + roleId * 8],
      ["inventory", role.inventory, 0x64ae + roleId * 8],
    ]) {
      if (!Array.isArray(values) || values.length !== 8) {
        throw new GameDataEncodingError(`roles[${roleId}].${label} must contain 8 slots`);
      }
      const offset = templateOffset(cpu);
      for (let slot = 0; slot < values.length; slot += 1) {
        template[offset + slot] = editorInteger(
          fieldValue(values[slot], `roles[${roleId}].${label}`),
          `roles[${roleId}].${label}`,
          0,
          ITEM_COUNT - 1,
        );
      }
    }
  }
  const profiles = requireObject(document.growth_profiles, "characters.growth_profiles");
  for (const [profile, length] of [["A", 0x57], ["B", 0x5c], ["C", 0x35], ["D", 0x3d]]) {
    const row = profiles[profile];
    const values = plainObject(row) ? row.values : null;
    if (!Array.isArray(values) || values.length !== length) {
      throw new GameDataEncodingError(
        `growth profile ${profile} must contain ${length} values`,
      );
    }
    tables[`growth-${profile.toLowerCase()}`] = Uint8Array.from(
      values.map(value => editorInteger(value, `growth ${profile}`, 0, 0xff)),
    );
  }
  return tables;
}

const CHARACTER_FIELD_RESOURCE = "character-initial-record";
const characterInitialGoldHandle = `${CHARACTER_FIELD_RESOURCE}:initial-gold`;
const characterGrowthHandle = profile =>
  `${CHARACTER_FIELD_RESOURCE}:growth-profile:${profile}`;
const characterRoleHandle = id =>
  `${CHARACTER_FIELD_RESOURCE}:rom-role:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const CHARACTER_STATUS_FIELDS = Object.freeze({
  present: [1, 0, 1],
  status: [1, 0, 0xff],
});

function characterByteValue(value, label) {
  return editorInteger(typeof value === "boolean" ? Number(value) : value, label, 0, 0xff);
}

function characterField(entityHandle, fieldName, defaultValue, documentPath,
  fragmentId, offsetInFragment, byteLength = 1, extra = {}) {
  return {resourceId: CHARACTER_FIELD_RESOURCE, entityHandle, fieldName, defaultValue,
    documentPath, fragmentId, offsetInFragment, byteLength, ...extra};
}

/** Describe all published character-initial-record leaves and preserve other component bytes as Original. */
export function characterFieldDescriptions(document, {asset} = {}) {
  const initial = requireObject(document?.rom_initial, "characters.rom_initial");
  const roles = recordsById(initial.roles, CHARACTER_COUNT, "id", "characters.rom_initial.roles");
  const fields = [];
  const gold = editorInteger(fieldValue(initial.gold, "rom_initial.gold"),
    "initial_gold", 0, 0xffffff);
  fields.push(characterField(characterInitialGoldHandle, "value", gold,
    ["rom_initial", "gold", "value"], "character-initial-record.initial-template",
    templateOffset(0x645d), 3, {recordId: "initial-gold"}));
  for (const [roleId, role] of roles) {
    const handle = characterRoleHandle(roleId);
    const position = initial.roles.findIndex(row => Number(row.id) === roleId);
    const sources = requireObject(role.sources, `roles[${roleId}].sources`);
    for (const [field, [width, minimum, maximum]] of Object.entries(CHARACTER_EDITABLE_FIELDS)) {
      const source = requireObject(sources[field], `roles[${roleId}].sources.${field}`);
      if (source.width !== width) throw new GameDataEncodingError(
        `roles[${roleId}].${field} source width changed`);
      const value = editorInteger(fieldValue(role[field], `roles[${roleId}].${field}`),
        `roles[${roleId}].${field}`, minimum, maximum);
      fields.push({...characterField(handle, field, value,
        ["rom_initial", "roles", position, field], "character-initial-record.initial-template",
        source.template_offset, width), recordId: roleId});
    }
    for (const [field, [width, minimum, maximum]] of Object.entries(CHARACTER_STATUS_FIELDS)) {
      const source = requireObject(sources[field], `roles[${roleId}].sources.${field}`);
      if (source.width !== width) throw new GameDataEncodingError(
        `roles[${roleId}].${field} source width changed`);
      if (field === "present" && typeof role[field] !== "boolean")
        throw new GameDataEncodingError(`roles[${roleId}].present must be boolean`);
      fields.push({...characterField(handle, field,
        field === "present"
          ? Boolean(role[field])
          : editorInteger(fieldValue(role[field], `roles[${roleId}].${field}`),
            `roles[${roleId}].${field}`, minimum, maximum),
        ["rom_initial", "roles", position, field], "character-initial-record.initial-template",
        source.template_offset, width), recordId: roleId});
    }
    const slotSource = requireObject(sources.slot_flags, `roles[${roleId}].sources.slot_flags`);
    fields.push({...characterField(handle, "slot_flags",
      editorInteger(fieldValue(role.slot_flags, `roles[${roleId}].slot_flags`),
        `roles[${roleId}].slot_flags`, 0, 0xff),
      ["rom_initial", "roles", position, "slot_flags"],
      "character-initial-record.initial-template", slotSource.template_offset, 1), recordId: roleId});
    for (const [kind, cpu] of [["equipment", 0x6496], ["inventory", 0x64ae]]) {
      if (!Array.isArray(role[kind]) || role[kind].length !== 8) {
        throw new GameDataEncodingError(`roles[${roleId}].${kind} must contain 8 slots`);
      }
      const offset = templateOffset(cpu + roleId * 8);
      for (let slot = 0; slot < 8; slot += 1) {
        fields.push({...characterField(handle, `${kind}.${slot}`,
          editorInteger(fieldValue(role[kind][slot], `roles[${roleId}].${kind}.${slot}`),
            `roles[${roleId}].${kind}.${slot}`, 0, ITEM_COUNT - 1),
          ["rom_initial", "roles", position, kind, slot, "item_id"],
          "character-initial-record.initial-template", offset + slot), recordId: roleId});
      }
    }
  }
  const growthProfiles = requireObject(document.growth_profiles, "characters.growth_profiles");
  for (const [profile, length] of [["A", 0x57], ["B", 0x5c], ["C", 0x35], ["D", 0x3d]]) {
    const growth = requireObject(growthProfiles[profile], `growth profile ${profile}`);
    if (!Array.isArray(growth.values) || growth.values.length !== length)
      throw new GameDataEncodingError(`growth profile ${profile} must contain ${length} values`);
    for (let index = 0; index < length; index += 1) {
      fields.push(characterField(characterGrowthHandle(profile), `values.${index}`,
        editorInteger(growth.values[index], `growth ${profile}[${index}]`, 0, 0xff),
        ["growth_profiles", profile, "values", index],
        `${CHARACTER_FIELD_RESOURCE}.growth-${profile.toLowerCase()}`, index, 1,
        {recordId: profile}));
    }
  }
  const components = new Map((asset?.components || []).map((component, index) => [component.id, {component, index}]));
  for (const spec of gameDataComponentSpecs(CHARACTER_FIELD_RESOURCE)) {
    const entry = components.get(spec.fragmentId);
    if (!entry) throw new GameDataEncodingError(`characters component missing: ${spec.fragmentId}`);
    const payload = bytesFromHex(entry.component.payload_hex, spec.fragmentId);
    if (entry.component.length !== spec.length || payload.length !== spec.length) {
      throw new GameDataEncodingError(`${spec.fragmentId} must contain ${spec.length} bytes`);
    }
    fields.push({resourceId: CHARACTER_FIELD_RESOURCE, entityHandle: spec.fragmentId,
      fieldName: "payload_hex", defaultValue: entry.component.payload_hex,
      ...(spec.fragmentId === "character-initial-record.initial-template"
        ? {writeback: ROM_WRITE_PENDING}
        : {readOnly: true, edit_policy: "immutable",
          immutable_reason: "片段原像由已登记的人物字段完整决定"}),
      assetPath: ["components", entry.index, "payload_hex"], fragmentId: spec.fragmentId,
      offsetInFragment: 0, byteLength: spec.length});
  }
  for (const field of fields) {
    if (Number.isInteger(field.recordId)
        && field.entityHandle === characterRoleHandle(field.recordId)) {
      field.entityAliases = [`character:${field.recordId.toString(16).toUpperCase().padStart(2, "0")}`];
    }
  }
  return fields;
}

function validateCharacterAsset(asset, original) {
  if (asset?.resource_id !== CHARACTER_FIELD_RESOURCE || original?.resource_id !== CHARACTER_FIELD_RESOURCE
      || asset.schema !== ASSET_SCHEMAS[CHARACTER_FIELD_RESOURCE] || original.schema !== asset.schema) {
    throw new GameDataEncodingError("character asset identity changed");
  }
  characterFieldDescriptions(asset.document, {asset});
  const expected = structuredClone(original);
  for (const field of characterFieldDescriptions(original.document, {asset: original})) {
    const path = field.assetPath ?? ["document", ...field.documentPath];
    const value = path.reduce((node, key) => node?.[key], asset);
    if (field.fieldName === "payload_hex"
        && field.fragmentId === "character-initial-record.initial-template") {
      const before = bytesFromHex(field.defaultValue, field.fragmentId);
      const after = bytesFromHex(value, field.fragmentId);
      const occupied = new Set(characterFieldDescriptions(original.document, {asset: original})
        .filter(row => row.fragmentId === field.fragmentId && row.fieldName !== "payload_hex")
        .flatMap(row => Array.from({length: row.byteLength}, (_, index) => row.offsetInFragment + index)));
      if (after.length !== before.length || [...occupied].some(index => after[index] !== before[index]))
        throw new GameDataEncodingError("人物初始模板原始编辑只能修改未登记的字节");
    } else if (field.readOnly && !canonicalJsonEqual(value, field.defaultValue)) {
      throw new GameDataEncodingError(`character-initial-record read-only field changed: ${field.fieldName}`);
    }
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] = structuredClone(value);
  }
  if (!canonicalJsonEqual(asset, expected)) {
    throw new GameDataEncodingError("character-initial-record only published character fields may change");
  }
}

const CHARACTER_EDITOR_COLUMNS = new Map([
  ["max_hp", ["最大 HP", 0, 65535]], ["current_hp", ["初始 HP", 0, 65535]],
  ["attack", ["攻击", 0, 65535]], ["defense", ["防御", 0, 65535]],
  ["level", ["等级", 1, 99]], ["strength", ["力量", 0, 255]],
  ["intelligence", ["智力", 0, 255]], ["speed", ["速度", 0, 255]],
  ["vitality", ["体力", 0, 255]], ["battle_skill", ["战斗技能", 0, 255]],
  ["repair_skill", ["修理技能", 0, 255]], ["driving_skill", ["驾驶技能", 0, 255]],
  ["experience", ["经验", 0, 16777215]], ["slot_flags", ["角色槽标志", 0, 255]],
  ["present", ["初始在队状态", 0, 1]], ["status", ["初始异常状态", 0, 255]],
]);
const CHARACTER_SLOT_COLUMN = /^(equipment|inventory)\.(\d+)$/u;
const CHARACTER_GROWTH_COLUMN = /^values\.(\d+)$/u;

function characterColumnLabel(fieldName) {
  const slot = CHARACTER_SLOT_COLUMN.exec(fieldName);
  if (slot) return `${slot[1] === "equipment" ? "装备" : "道具"} ${Number(slot[2]) + 1}`;
  const growth = CHARACTER_GROWTH_COLUMN.exec(fieldName);
  if (growth) return `取值 ${Number(growth[1]) + 1}`;
  const cell = /^(preset|fallback)\.(\d+)\.(.+)$/u.exec(fieldName);
  if (cell) {
    const head = cell[1] === "fallback" ? "备用名" : `预设 ${Number(cell[2]) + 1}`;
    if (cell[3] === "trigger") return `${head} · 触发名`;
    const roleId = /^role\.(\d+)$/u.exec(cell[3]);
    if (roleId) return `${head} · 角色 ${Number(roleId[1]) + 1} 名`;
    if (cell[1] === "fallback") return `备用名 ${Number(cell[3]) + 1}`;
  }
  return CHARACTER_EDITOR_COLUMNS.get(fieldName)?.[0] ?? fieldName;
}

function characterColumnRange(field) {
  const known = CHARACTER_EDITOR_COLUMNS.get(field.fieldName);
  if (known) return [known[1], known[2]];
  if (CHARACTER_SLOT_COLUMN.test(field.fieldName)) return [0, ITEM_COUNT - 1];
  return [0, Math.min(2 ** (field.byteLength * 8) - 1, Number.MAX_SAFE_INTEGER)];
}

function characterObjectLabel(entityHandle) {
  const role = /^character-initial-record:rom-role:([0-9A-F]{2})$/u.exec(entityHandle);
  if (role) return `人物 · 初始模板 ${role[1]}`;
  const growth = /^character-initial-record:growth-profile:([A-D])$/u.exec(entityHandle);
  if (growth) return `人物成长曲线 ${growth[1]}`;
  if (entityHandle === characterInitialGoldHandle) return "初始金币";
  return `人物数据 · ${entityHandle}`;
}

const CHARACTER_FRAGMENT_LABELS = new Map([
  ["character-initial-record.initial-template", "人物初始模板"],
  ["character-initial-record.growth-a", "人物成长曲线 A"],
  ["character-initial-record.growth-b", "人物成长曲线 B"],
  ["character-initial-record.growth-c", "人物成长曲线 C"],
  ["character-initial-record.growth-d", "人物成长曲线 D"],
]);

/** 一个已发布片段一个字段对象（约束第 13 条）：片段里的每个实体一行，列按字段并集铺开。 */
export function characterObjects(document, {asset} = {}) {
  const byFragment = new Map();
  for (const field of characterFieldDescriptions(document, {asset})) {
    if (field.fieldName === "payload_hex" && field.readOnly) continue;
    if (!byFragment.has(field.fragmentId)) byFragment.set(field.fragmentId, []);
    byFragment.get(field.fragmentId).push(field);
  }
  return [...byFragment.entries()].map(([fragmentId, rows]) => {
    const handles = [...new Set(rows.map(field => field.entityHandle))];
    return {
      id: fragmentId,
      label: CHARACTER_FRAGMENT_LABELS.get(fragmentId) ?? `人物数据 · ${fragmentId}`,
      fragmentIds: [fragmentId],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: handles, rowLabels: handles.map(characterObjectLabel),
        columns: [...new Set(rows.map(field => field.fieldName))].map(name => {
          const carriers = rows.filter(field => field.fieldName === name);
          const column = {name, label: characterColumnLabel(name),
            rows: carriers.map(field => field.entityHandle)};
          if (name === "slot_flags") return {...column,
            semantic: {kind: "bit-labels"},
            bits: equipmentSlotBits(document.equipment_slot_flags?.slots, "equipment_slot")};
          if (typeof carriers[0].defaultValue === "string") return {...column, text: true};
          if (name === "present") return {...column, boolean: true};
          const [min, max] = characterColumnRange(carriers[0]);
          return {...column, min, max};
        })},
    };
  });
}

function characterFieldBytes(field, value) {
  const byteLength = fieldByteLength(field);
  if (typeof value === "string") {
    const bytes = bytesFromHex(value, field.fieldName);
    if (bytes.length !== byteLength)
      throw new GameDataEncodingError(`${field.fieldName} 必须正好 ${byteLength} 个字节`);
    return bytes;
  }
  const [minimum, maximum] = characterColumnRange(field);
  const integer = editorInteger(typeof value === "boolean" ? Number(value) : value,
    field.fieldName, minimum, maximum);
  const payload = new Uint8Array(byteLength);
  for (let byte = 0; byte < payload.length; byte += 1) payload[byte] = (integer >>> (byte * 8)) & 0xff;
  return payload;
}

export function serializeCharacterField(field) {
  if (field.resourceId !== CHARACTER_FIELD_RESOURCE || field.readOnly)
    throw new GameDataEncodingError("人物字段身份无效");
  return characterFieldBytes(field, field.value);
}

export function validateCharacterPreimage(fields, fragmentId, baseline) {
  const spec = gameDataComponentSpecs(CHARACTER_FIELD_RESOURCE).find(item => item.fragmentId === fragmentId);
  if (!spec || baseline.length !== spec.length)
    throw new GameDataEncodingError("人物 Origin 片段身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    if (field.fieldName === "payload_hex") continue;
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (field.resourceId !== CHARACTER_FIELD_RESOURCE || fieldFragmentId(field) !== fragmentId || seen.has(key))
      throw new GameDataEncodingError("人物 Origin 字段身份不符");
    seen.add(key);
    const expected = characterFieldBytes(field, field.defaultValue);
    const offset = fieldOffsetInFragment(field);
    if (!Number.isSafeInteger(offset)) throw new GameDataEncodingError("人物字段物理位置无效");
    const observed = baseline.subarray(offset, offset + expected.length);
    if (observed.length !== expected.length || observed.some((byte, index) => byte !== expected[index]))
      throw new GameDataEncodingError("人物 Origin 与绑定原像不同");
  }
}

export function validateCharacterFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, characterFieldDescriptions, validateCharacterAsset);
}

export function encodeCharacterFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== CHARACTER_FIELD_RESOURCE || values.has(key)) {
      throw new GameDataEncodingError("character field identity duplicated or foreign");
    }
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new GameDataEncodingError(`character field missing ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const specs = gameDataComponentSpecs(CHARACTER_FIELD_RESOURCE);
  const payloads = new Map(specs.map(spec => [spec.fragmentId, new Uint8Array(spec.length)]));
  for (const spec of specs) {
    const raw = fields.find(row => row.entityHandle === spec.fragmentId && row.fieldName === "payload_hex");
    const value = take(spec.fragmentId, "payload_hex");
    const payload = bytesFromHex(raw?.writeback?.state === "unpermitted" ? raw.defaultValue : value,
      spec.fragmentId);
    if (payload.length !== spec.length) throw new GameDataEncodingError(`${spec.fragmentId} length changed`);
    payloads.get(spec.fragmentId).set(payload);
  }
  const template = payloads.get("character-initial-record.initial-template");
  writeLittleEndian(template, templateOffset(0x645d), 3,
    editorInteger(take(characterInitialGoldHandle, "value"), "initial gold", 0, 0xffffff),
    "initial gold");
  for (let roleId = 0; roleId < CHARACTER_COUNT; roleId += 1) {
    const handle = characterRoleHandle(roleId);
    for (const [field, [width, minimum, maximum]] of Object.entries(CHARACTER_EDITABLE_FIELDS)) {
      writeLittleEndian(template,
        editorInteger(characterSourceOffset(fields, handle, field), `role ${roleId} ${field} offset`, 0, template.length - width),
        width, editorInteger(take(handle, field), `role ${roleId} ${field}`, minimum, maximum),
        `role ${roleId} ${field}`);
    }
  }
  // Source offsets are fixed by the published Original; use the same source table
  // from field metadata to avoid reconstructing CPU addresses in this encoder.
  for (const roleId of [0, 1, 2]) {
    const handle = characterRoleHandle(roleId);
    const slot = fields.find(field => field.entityHandle === handle && field.fieldName === "slot_flags");
    if (!slot) throw new GameDataEncodingError(`character role ${roleId} slot flags missing`);
    template[characterSourceOffset(fields, handle, "slot_flags")] = editorInteger(take(handle, "slot_flags"), `role ${roleId} slot flags`, 0, 0xff);
    for (const field of ["present", "status"]) {
      const descriptor = fields.find(item => item.entityHandle === handle && item.fieldName === field);
      if (!descriptor) throw new GameDataEncodingError(`character role ${roleId} ${field} missing`);
      template[characterSourceOffset(fields, handle, field)] = characterByteValue(
        take(handle, field), `role ${roleId} ${field}`,
      );
    }
    for (const kind of ["equipment", "inventory"]) {
      const base = templateOffset((kind === "equipment" ? 0x6496 : 0x64ae) + roleId * 8);
      for (let slotIndex = 0; slotIndex < 8; slotIndex += 1) {
        template[base + slotIndex] = editorInteger(take(handle, `${kind}.${slotIndex}`),
          `role ${roleId} ${kind} ${slotIndex}`, 0, ITEM_COUNT - 1);
      }
    }
  }
  for (const [profile, length] of [["A", 0x57], ["B", 0x5c], ["C", 0x35], ["D", 0x3d]]) {
    const payload = payloads.get(`${CHARACTER_FIELD_RESOURCE}.growth-${profile.toLowerCase()}`);
    for (let index = 0; index < length; index += 1) {
      payload[index] = editorInteger(take(characterGrowthHandle(profile), `values.${index}`),
        `growth ${profile}[${index}]`, 0, 0xff);
    }
  }
  if (values.size) throw new GameDataEncodingError("character build fields incomplete or unknown");
  return specs.map(spec => ({fragment_id: spec.fragmentId, payload: payloads.get(spec.fragmentId), relocations: []}));
}

function characterSourceOffset(fields, handle, fieldName) {
  const field = fields.find(item => item.entityHandle === handle && item.fieldName === fieldName);
  if (!field) throw new GameDataEncodingError(`character field missing ${handle}/${fieldName}`);
  return field.physical?.offsetInFragment ?? field.offsetInFragment;
}

const MONSTER_OWNER = "monster-profile";
const monsterHandle = id => `monster:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const MONSTER_BYTES = Object.freeze([
  ["flags", "flags"], ["packed_a", "packed-a"], ["packed_b", "packed-b"],
  ["attack_code", "attack-code"], ["defense_code", "defense-code"], ["speed", "speed"],
]);
const MONSTER_STATS = Object.freeze([
  ["hp", "hp"], ["attack", "attack"], ["defense", "defense"],
  ["experience", "experience-code"], ["gold", "gold-code"],
]);

function monsterMultiplier(record, key) {
  // ROM 10:0F45 pushes flags; 10:0F5E tests those same C0 bits. Only zero
  // executes the two ASL/ROL pairs at 10:0F63-0F6C (HP x4). The same flags
  // select death/drop tiers at 17:0E71 and 17:024D; do not decouple them.
  // See shiftboss/plans/archive/decouple-monster-flags-hp-encoding.md.
  if (key === "hp") return (record.flags & 0xc0) === 0 ? 4 : 1;
  if (key === "attack") return record.attack_code & 0x80 ? 4 : 1;
  if (key === "defense") return record.defense_code & 0x80 ? 4 : 1;
  if (key === "experience") return record.flags & 0x20 ? 100 : 1;
  if (key === "gold") return record.flags & 0x10 ? 100 : 1;
  throw new GameDataEncodingError(`unknown monster statistic ${key}`);
}

function monsterStatByte(record, key, value) {
  const multiplier = monsterMultiplier(record, key);
  editorInteger(value, `monster ${key}`, 0, 255 * multiplier);
  if (value % multiplier) throw new GameDataEncodingError(
    `monster ${key} must be divisible by its ROM multiplier ${multiplier}`);
  return value / multiplier;
}

export function monsterFieldDescriptions(document, {asset} = {}) {
  recordsById(document?.records, MONSTER_COUNT, "id", "monsters.records");
  const fields = [];
  for (const [position, row] of document.records.entries()) {
    const common = {resourceId: MONSTER_OWNER, entityHandle: monsterHandle(row.id), recordId: row.id, byteLength: 1};
    for (const [key, slug] of MONSTER_BYTES) fields.push({...common, fieldName: key,
      defaultValue: editorInteger(row[key], `monster ${row.id} ${key}`, 0, 255),
      documentPath: ["records", position, key], fragmentId: `${MONSTER_OWNER}.${slug}`, offsetInFragment: row.id});
    for (const [key, slug] of MONSTER_STATS) {
      const value = row[key]?.value;
      monsterStatByte(row, key, value);
      fields.push({...common, fieldName: key, defaultValue: value,
        documentPath: ["records", position, key, "value"], fragmentId: `${MONSTER_OWNER}.${slug}`, offsetInFragment: row.id});
    }
    if (row.id < MONSTER_DROP_FIRST_ID) {
      if (row.drop?.participates !== false || row.drop?.item?.kind !== "not-participating")
        throw new GameDataEncodingError(`monster ${row.id} must remain outside the drop table`);
    } else {
      if (row.drop?.participates !== true) throw new GameDataEncodingError(`monster ${row.id} must participate in the drop table`);
      const item = row.drop?.item?.item_id;
      if (item !== null) editorInteger(item, "monster drop item", 1, ITEM_COUNT - 1);
      fields.push({...common, fieldName: "drop.item_id", defaultValue: item,
        documentPath: ["records", position, "drop", "item", "item_id"],
        fragmentId: `${MONSTER_OWNER}.drop-items`, offsetInFragment: row.id - MONSTER_DROP_FIRST_ID});
    }
  }
  // The 32-byte table has no published editable semantic leaves. Its Original
  // component is a read-only field, so even opaque build bytes come from fields.
  const matches = (asset?.components || []).map((row, index) => ({row, index}))
    .filter(({row}) => row.id === `${MONSTER_OWNER}.special-lookup`);
  if (matches.length !== 1) throw new GameDataEncodingError("monster special lookup Original missing or repeated");
  const {row: lookup, index} = matches[0];
  if (lookup.length !== 32 || bytesFromHex(lookup.payload_hex, "monster special lookup").length !== 32)
    throw new GameDataEncodingError("monster special lookup must contain 32 bytes");
  fields.push({resourceId: MONSTER_OWNER, entityHandle: lookup.id, fieldName: "payload_hex",
    assetPath: ["components", index, "payload_hex"], defaultValue: lookup.payload_hex,
    fragmentId: lookup.id, offsetInFragment: 0, byteLength: 32});
  return fields;
}

const MONSTER_EDITOR_LABELS = Object.freeze({
  flags: "标志",
  packed_a: "属性码 A",
  packed_b: "属性码 B",
  attack_code: "攻击码",
  defense_code: "防御码",
  speed: "速度",
  hp: "生命值",
  attack: "攻击力",
  defense: "防御力",
  experience: "经验值",
  gold: "金钱值",
  "drop.item_id": "掉落物品",
  payload_hex: "特殊查找表原值",
});

export function monsterObjects(document, {asset} = {}) {
  const fields = monsterFieldDescriptions(document, {asset});
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: entityHandle === `${MONSTER_OWNER}.special-lookup`
      ? "怪物特殊查找表" : `怪物 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows
      .filter(field => !field.readOnly)
      .map(field => {
        const record = document.records.find(row => Number(row.id) === field.recordId);
        const multiplier = Number(record?.[field.fieldName]?.multiplier || 1);
        return {
          name: field.fieldName,
          label: MONSTER_EDITOR_LABELS[field.fieldName] || field.fieldName,
          ...(field.fieldName === "payload_hex" ? {text: true} : {}),
          min: 0,
          step: multiplier,
          ...(field.fieldName === "drop.item_id" ? {
            nullable: true, nullLabel: "不掉落",
            semantic: {kind: "reference", targetModule: "item-entry"},
            candidates: {resourceId: "item-entry", documentPath: ["records"],
              filter: {path: ["id"], values: Array.from({length: ITEM_COUNT - 1}, (_, index) => index + 1)},
              value: ["id"], label: ["id_hex", "name"]},
          } : {}),
          max: ["hp", "attack", "defense", "experience", "gold"].includes(field.fieldName)
            ? 255 * multiplier : field.fieldName === "drop.item_id" ? ITEM_COUNT - 1 : 0xff,
        };
      })},
  }));
}

function monsterSelectedValue(fields, name) {
  return fields.find(field => field.fieldName === name)?.value;
}

function monsterWorkingMultiplier(fields, name) {
  const flags = Number(monsterSelectedValue(fields, "flags")) || 0;
  if (name === "hp") return (flags & 0xc0) === 0 ? 4 : 1;
  if (name === "experience") return flags & 0x20 ? 100 : 1;
  if (name === "gold") return flags & 0x10 ? 100 : 1;
  if (name === "attack") return Number(monsterSelectedValue(fields, "attack_code")) & 0x80 ? 4 : 1;
  if (name === "defense") return Number(monsterSelectedValue(fields, "defense_code")) & 0x80 ? 4 : 1;
  return 1;
}

export function serializeMonsterField(field, selected) {
  if (field?.resourceId !== MONSTER_OWNER || field.readOnly)
    throw new GameDataEncodingError("monster field is read-only or invalid");
  if (field.fieldName === "payload_hex") {
    const bytes = bytesFromHex(field.value, "monster special lookup");
    if (bytes.length !== 32) throw new GameDataEncodingError("monster special lookup must contain 32 bytes");
    return bytes;
  }
  if (field.fieldName === "drop.item_id") {
    if (field.value === null) return new Uint8Array([0]);
    if (!Number.isInteger(field.value)) throw new GameDataEncodingError("monster drop item must be an integer");
    editorInteger(field.value, "monster drop item", 1, ITEM_COUNT - 1);
    return new Uint8Array([field.value]);
  }
  if (!Number.isInteger(field.value)) throw new GameDataEncodingError("monster field must be an integer");
  if (["hp", "attack", "defense", "experience", "gold"].includes(field.fieldName)) {
    const multiplier = monsterWorkingMultiplier(selected, field.fieldName);
    if (field.value < 0 || field.value > 0xffff || field.value % multiplier)
      throw new GameDataEncodingError(`monster ${field.fieldName} has invalid working value`);
    const raw = field.value / multiplier;
    if (raw > 0xff) throw new GameDataEncodingError(`monster ${field.fieldName} exceeds byte range`);
    return new Uint8Array([raw]);
  }
  editorInteger(field.value, `monster ${field.fieldName}`, 0, 0xff);
  return new Uint8Array([field.value]);
}

function validateMonsterAsset(asset, original) {
  if (asset?.resource_id !== MONSTER_OWNER || original?.resource_id !== MONSTER_OWNER)
    throw new GameDataEncodingError("monster asset identity changed");
  monsterFieldDescriptions(asset.document, {asset});
  const expected = structuredClone(original);
  for (const field of monsterFieldDescriptions(original.document, {asset: original})) {
    const path = field.assetPath ?? ["document", ...field.documentPath];
    const value = path.reduce((node, key) => node?.[key], asset);
    if (field.readOnly && !canonicalJsonEqual(value, field.defaultValue))
      throw new GameDataEncodingError("monster special lookup remains read-only");
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] = value;
  }
  if (!canonicalJsonEqual(asset, expected)) throw new GameDataEncodingError(
    "monster edits cannot change identity, names, sources, thresholds or preimages");
}

export function validateMonsterFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, monsterFieldDescriptions, validateMonsterAsset);
}

export function encodeMonsterFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== MONSTER_OWNER || values.has(key)) throw new GameDataEncodingError("monster field identity duplicated or foreign");
    const value = defaults ? field.defaultValue : field.value;
    if (field.readOnly && !canonicalJsonEqual(value, field.defaultValue)) throw new GameDataEncodingError("monster read-only field changed");
    values.set(key, value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new GameDataEncodingError(`monster field missing ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const specs = gameDataComponentSpecs(MONSTER_OWNER);
  const payloads = new Map(specs.map(spec => [spec.fragmentId, new Uint8Array(spec.length)]));
  for (let id = 0; id < MONSTER_COUNT; id++) {
    const handle = monsterHandle(id), record = {};
    for (const [key, slug] of MONSTER_BYTES) {
      record[key] = editorInteger(take(handle, key), `monster ${key}`, 0, 255);
      payloads.get(`${MONSTER_OWNER}.${slug}`)[id] = record[key];
    }
    for (const [key, slug] of MONSTER_STATS)
      payloads.get(`${MONSTER_OWNER}.${slug}`)[id] = monsterStatByte(record, key, take(handle, key));
    if (id >= MONSTER_DROP_FIRST_ID) {
      const item = take(handle, "drop.item_id");
      payloads.get(`${MONSTER_OWNER}.drop-items`)[id - MONSTER_DROP_FIRST_ID] = item === null ? 0
        : editorInteger(item, "monster drop item", 1, ITEM_COUNT - 1);
    }
  }
  const lookupId = `${MONSTER_OWNER}.special-lookup`;
  const lookup = bytesFromHex(take(lookupId, "payload_hex"), "monster special lookup");
  if (lookup.length !== 32 || values.size) throw new GameDataEncodingError("monster build fields incomplete or unknown");
  payloads.set(lookupId, lookup);
  return specs.map(spec => ({fragment_id: spec.fragmentId, payload: payloads.get(spec.fragmentId), relocations: []}));
}

export function projectMonsterFieldView(document) {
  const hex = value => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  const derive = (target, key, get) => Object.defineProperty(target, key, {enumerable: true, configurable: true, get});
  for (const row of document.records) {
    for (const key of ["flags", "packed_a", "packed_b", "attack_code", "defense_code"])
      derive(row, `${key}_hex`, () => hex(row[key]));
    for (const [key] of MONSTER_STATS) {
      derive(row[key], "multiplier", () => monsterMultiplier(row, key));
      derive(row[key], "raw", () => monsterStatByte(row, key, row[key].value));
    }
    derive(row, "attack_aux", () => row.attack_code & 0x7f);
    derive(row, "defense_aux", () => row.defense_code & 0x7f);
    if (row.drop.participates) {
      const item = row.drop.item;
      derive(item, "kind", () => item.item_id === null ? "no-drop" : "item-reference");
      derive(item, "item_id_hex", () => item.item_id === null ? null : hex(item.item_id));
    }
    const probability = row.drop.probability;
    const threshold = () => {
      const found = document.drop_probability_thresholds.find(entry => entry.tier === ((row.flags >> 6) & 3));
      if (!found) throw new GameDataEncodingError("monster drop threshold missing");
      return found;
    };
    derive(probability, "tier", () => (row.flags >> 6) & 3);
    derive(probability, "numerator", () => threshold().numerator);
    derive(probability, "denominator", () => threshold().denominator);
    derive(probability.sources, "threshold", () => threshold().sources.threshold);
  }
}

const BATTLE_TEST_ENTRY_PARTS = Object.freeze({
  enabled: ["handler-pointer", 2, null], repeatable: ["repeat-check", 2, null],
  scene_id: ["scene-id", 1, 0xef], x: ["x", 1, 0xff], y: ["y", 1, 0xff],
  state_flag: ["state-flag-check", 1, 0xff], encounter_id: ["encounter-id", 1, ENCOUNTER_FORMATION_COUNT - 1],
  intro_text_record_id: ["intro-text", 1, 0xff], completed_text_record_id: ["completed-text", 1, 0xff],
});
const battleFormationHandle = (id, slot) => `encounter-formation:${id.toString(16).toUpperCase().padStart(2, "0")}:slot:${slot}`;
function battleEntryValue(name, value) {
  const maximum = BATTLE_TEST_ENTRY_PARTS[name]?.[2];
  if (maximum === null) {
    if (typeof value !== "boolean") throw new GameDataEncodingError("battle-test enabled/repeatable must be booleans");
    return value;
  }
  return editorInteger(value, name, 0, maximum);
}

export function battleTestFieldDescriptions(document) {
  const descriptions = Object.entries(BATTLE_TEST_ENTRY_PARTS).map(([name, [slug, width]]) => ({
    resourceId: "battle-test-point", entityHandle: "battle-test:entry", fieldName: name,
    documentPath: [name], defaultValue: battleEntryValue(name, document[name]), recordId: "entry",
    fragmentId: `battle-test-point.${slug}`, offsetInFragment: 0, byteLength: width,
    ...(name === "state_flag" ? {additionalFragments: [{fragmentId: "battle-test-point.state-flag-set", offsetInFragment: 0, byteLength: 1}]} : {}),
  }));
  recordsById(document.formations, ENCOUNTER_FORMATION_COUNT, "id", "battle-test formations");
  for (const [position, formation] of document.formations.entries()) {
    recordsById(formation.slots, 4, "slot", `formation ${formation.id} slots`);
    for (const [slotPosition, slot] of formation.slots.entries()) for (const [column, name] of ["monster_id", "count"].entries()) {
      descriptions.push({resourceId: "battle-test-point", entityHandle: battleFormationHandle(formation.id, slot.slot),
        fieldName: name, recordId: formation.id, slotId: slot.slot,
        documentPath: ["formations", position, "slots", slotPosition, name],
        defaultValue: editorInteger(slot[name], name, 0, name === "count" ? 9 : MONSTER_COUNT - 1),
        fragmentId: "battle-test-point.formations", offsetInFragment: formation.id * 8 + slot.slot * 2 + column, byteLength: 1});
    }
  }
  return descriptions;
}

function validateBattleTestAsset(asset, original) {
  if (asset?.resource_id !== "battle-test-point" || original?.resource_id !== "battle-test-point")
    throw new GameDataEncodingError("battle-test asset identity changed");
  battleTestFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of battleTestFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected)) throw new GameDataEncodingError("战斗测试只能修改已发布入口和编队字段");
  const before = new Map(original.document.formations.map(row => [row.id, row]));
  for (const formation of asset.document.formations) {
    const slots = [...formation.slots].sort((a, b) => a.slot - b.slot);
    const oldSlots = [...before.get(formation.id).slots].sort((a, b) => a.slot - b.slot);
    if (slots.every((slot, index) => slot.monster_id === oldSlots[index].monster_id && slot.count === oldSlots[index].count)) continue;
    let total = 0, emptySeen = false;
    for (const slot of slots) {
      if (!slot.count) emptySeen = true;
      else if (emptySeen) throw new GameDataEncodingError("有效编队槽必须连续排列在空槽之前");
      total += slot.count;
    }
    if (total < 1 || total > 9) throw new GameDataEncodingError("编队怪物总数必须是 1–9");
  }
}
export function validateBattleTestFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, battleTestFieldDescriptions, validateBattleTestAsset);
}

export function encodeBattleTestFields(fields, {defaults = false} = {}) {
  const byKey = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "battle-test-point" || byKey.has(key)) throw new GameDataEncodingError("战斗测试字段身份重复或越界");
    byKey.set(key, field);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]), field = byKey.get(key);
    if (!field) throw new GameDataEncodingError(`战斗测试字段缺失：${key}`);
    byKey.delete(key); return defaults ? field.defaultValue : field.value;
  };
  const payloads = Object.fromEntries(gameDataComponentSpecs("battle-test-point").map(spec => [spec.slug, new Uint8Array(spec.length)]));
  for (const [name, [slug]] of Object.entries(BATTLE_TEST_ENTRY_PARTS)) {
    const value = battleEntryValue(name, take("battle-test:entry", name));
    if (name === "enabled") writeLittleEndian(payloads[slug], 0, 2,
      value ? BATTLE_TEST_HANDLER_STORED : BATTLE_TEST_ORIGINAL_HANDLER_STORED, slug);
    else if (name === "repeatable") payloads[slug].set(value ? [0xea, 0xea] : [0xd0, 0x14]);
    else payloads[slug][0] = value;
    if (name === "state_flag") payloads["state-flag-set"][0] = value;
  }
  for (let id = 0; id < ENCOUNTER_FORMATION_COUNT; id++) for (let slot = 0; slot < 4; slot++) {
    for (const [column, name] of ["monster_id", "count"].entries()) payloads.formations[id * 8 + slot * 2 + column] =
      editorInteger(take(battleFormationHandle(id, slot), name), name, 0, name === "count" ? 9 : MONSTER_COUNT - 1);
  }
  if (byKey.size) throw new GameDataEncodingError("战斗测试字段身份未登记");
  return gameDataComponentSpecs("battle-test-point").map(spec => ({fragment_id: spec.fragmentId, payload: payloads[spec.slug], relocations: []}));
}

const BATTLE_TEST_EDITOR_LABELS = Object.freeze({
  enabled: "启用测试点", repeatable: "可重复（忽略完成位）", scene_id: "测试点目标场景",
  x: "测试点 X 坐标", y: "测试点 Y 坐标", state_flag: "全局完成位（检查）",
  encounter_id: "遭遇编队 ID", intro_text_record_id: "战前文字记录 ID",
  completed_text_record_id: "完成后文字记录 ID", monster_id: "怪物 ID", count: "数量",
});
const BATTLE_TEST_REPEATABLE_BYTES = Object.freeze([0xea, 0xea]);
const BATTLE_TEST_IGNORED_BYTES = Object.freeze([0xd0, 0x14]);

function battleEntryMaximum(name) {
  const maximum = BATTLE_TEST_ENTRY_PARTS[name]?.[2];
  if (maximum === undefined) throw new GameDataEncodingError(`战斗测试入口字段身份不符：${name}`);
  return maximum;
}

function storedHandlerBytes(enabled) {
  const value = enabled ? BATTLE_TEST_HANDLER_STORED : BATTLE_TEST_ORIGINAL_HANDLER_STORED;
  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

/** 一个物理片段一个字段对象：入口 9 段各 1 个字段，编队 456 字节按 4 槽 × 2 列铺开。 */
export function battleTestObjects(document) {
  const fields = battleTestFieldDescriptions(document);
  const entry = fields.filter(field => field.recordId === "entry");
  const formations = fields.filter(field => field.recordId !== "entry");
  const rows = [...new Set(formations.map(field => field.entityHandle))];
  return [
    {id: "battle-test-point.entry", label: "战斗测试点入口",
      fragmentIds: [...new Set(entry.map(field => field.fragmentId))],
      fields: entry.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: ["battle-test:entry"], rowLabels: ["入口"],
        columns: entry.map(field => {
          const maximum = battleEntryMaximum(field.fieldName);
          return maximum === null
            ? {name: field.fieldName, label: BATTLE_TEST_EDITOR_LABELS[field.fieldName], boolean: true}
            : {name: field.fieldName, label: BATTLE_TEST_EDITOR_LABELS[field.fieldName], min: 0, max: maximum,
              ...(["intro_text_record_id", "completed_text_record_id"].includes(field.fieldName)
                ? {semantic: {kind: "text-record", targetModule: "text-record", region: 5},
                  candidates: {document: "project.text-catalog", documentPath: ["records"],
                    filter: {path: ["region"], values: [5]}, value: ["record"],
                    label: ["node_id", "display_text"]}} : {}),
              ...(["scene_id", "x", "y"].includes(field.fieldName) ? {semantic: {kind: "coordinate",
                fields: {scene: "scene_id", x: "x", y: "y"}},
                ...(field.fieldName === "scene_id" ? {candidates: {document: "project.scenes",
                  documentPath: ["editable_scenes"], value: ["id"], label: ["name"]}} : {})} : {})};
        })}},
    {id: "battle-test-point.formations", label: "战斗测试编队",
      fragmentIds: ["battle-test-point.formations"],
      fields: formations.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows, rowLabels: rows,
        columns: ["monster_id", "count"].map(name => ({name,
          label: name === "monster_id" ? "怪物" : BATTLE_TEST_EDITOR_LABELS[name],
          min: 0, max: name === "count" ? 9 : MONSTER_COUNT - 1,
          ...(name === "monster_id" ? {
            semantic: {kind: "reference", targetModule: "monster-profile",
              emptyWhen: {field: "count", value: 0}},
            candidates: {resourceId: "monster-profile", documentPath: ["records"],
              value: ["id"], label: ["id_hex", "name"]},
          } : {})}))}},
  ];
}

function battleTestFieldPosition(field) {
  const entry = BATTLE_TEST_ENTRY_PARTS[field.fieldName];
  if (field.resourceId === "battle-test-point" && field.entityHandle === "battle-test:entry" && entry)
    return {fragmentId: `battle-test-point.${entry[0]}`, offsetInFragment: 0, byteLength: entry[1]};
  const match = /^encounter-formation:([0-9A-F]{2}):slot:([0-9])$/u.exec(String(field.entityHandle));
  if (field.resourceId === "battle-test-point" && match && ["monster_id", "count"].includes(field.fieldName)) {
    const id = Number.parseInt(match[1], 16), slot = Number(match[2]);
    if (id < ENCOUNTER_FORMATION_COUNT && slot < 4) return {fragmentId: "battle-test-point.formations",
      offsetInFragment: id * 8 + slot * 2 + (field.fieldName === "monster_id" ? 0 : 1), byteLength: 1, slot};
  }
  throw new GameDataEncodingError("战斗测试字段身份不符");
}

export function serializeBattleTestField(field) {
  const position = battleTestFieldPosition(field);
  if (position.byteLength === 2) {
    const value = battleEntryValue(field.fieldName, field.value);
    if (field.fieldName === "enabled") return storedHandlerBytes(value);
    return new Uint8Array(value ? BATTLE_TEST_REPEATABLE_BYTES : BATTLE_TEST_IGNORED_BYTES);
  }
  const maximum = position.fragmentId === "battle-test-point.formations"
    ? (field.fieldName === "count" ? 9 : MONSTER_COUNT - 1) : battleEntryMaximum(field.fieldName);
  const value = editorInteger(fieldValue(field.value, field.fieldName), field.fieldName, 0, maximum);
  return new Uint8Array(field.fieldName === "state_flag" ? [value, value] : [value]);
}

export function validateBattleTestPreimage(fields, fragmentId, baseline) {
  const spec = gameDataComponentSpecs("battle-test-point").find(item => item.fragmentId === fragmentId);
  if (!spec || baseline.length !== spec.length)
    throw new GameDataEncodingError("战斗测试 Origin 片段身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    const position = battleTestFieldPosition(field), key = `${field.entityHandle}:${field.fieldName}`;
    const includesFragment = position.fragmentId === fragmentId
      || (fragmentId === "battle-test-point.state-flag-set" && field.fieldName === "state_flag");
    if (!includesFragment) continue;
    if (seen.has(key))
      throw new GameDataEncodingError("战斗测试 Origin 字段身份不符");
    seen.add(key);
    const encoded = serializeBattleTestField({...field, value: field.defaultValue});
    const expected = field.fieldName === "state_flag"
      ? encoded.subarray(fragmentId === "battle-test-point.state-flag-set" ? 1 : 0,
        fragmentId === "battle-test-point.state-flag-set" ? 2 : 1) : encoded;
    const observed = baseline.subarray(position.offsetInFragment, position.offsetInFragment + expected.length);
    if (observed.length !== expected.length || observed.some((byte, index) => byte !== expected[index]))
      throw new GameDataEncodingError("战斗测试 Origin 与绑定原像不同");
  }
  if (seen.size !== (fragmentId === "battle-test-point.formations" ? spec.length : 1))
    throw new GameDataEncodingError("战斗测试 Origin 字段身份不符");
}

export function projectBattleTestFieldView(document) {
  const derived = (row, name, read) => Object.defineProperty(row, name, {enumerable: true, get: read});
  const hex = value => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  for (const name of ["scene_id", "x", "y", "state_flag", "encounter_id"])
    derived(document, `${name}_hex`, () => hex(document[name]));
  derived(document, "repeat_check_bytes", () => document.repeatable ? "EA EA" : "D0 14");
  derived(document, "handler_pointer_stored", () => document.enabled ? BATTLE_TEST_HANDLER_STORED : BATTLE_TEST_ORIGINAL_HANDLER_STORED);
  derived(document, "handler_pointer_stored_hex", () => hex(document.handler_pointer_stored));
  derived(document, "handler_cpu", () => document.handler_pointer_stored + 1);
  derived(document, "handler_cpu_hex", () => hex(document.handler_cpu));
  const flag = document.interaction_state;
  if (flag) {
    derived(flag, "flag_id", () => document.state_flag);
    derived(flag, "flag_id_hex", () => hex(document.state_flag));
    derived(flag, "runtime_byte", () => flag.runtime_bitset_base + (document.state_flag >>> 3));
    derived(flag, "runtime_byte_hex", () => `0x${flag.runtime_byte.toString(16).toUpperCase().padStart(4, "0")}`);
    derived(flag, "bit_index", () => document.state_flag & 7);
    derived(flag, "bit_mask", () => 1 << flag.bit_index);
    derived(flag, "bit_mask_hex", () => hex(flag.bit_mask));
  }
  derived(document, "encounter_resource", () => `encounter-formation:${document.encounter_id.toString(16).toUpperCase().padStart(2, "0")}`);
  for (const formation of document.formations) {
    derived(formation, "total_monsters", () => formation.slots.reduce((sum, slot) => sum + slot.count, 0));
    derived(formation, "within_runtime_limit", () => formation.total_monsters <= 9);
    for (const slot of formation.slots) {
      derived(slot, "active", () => slot.count > 0);
      derived(slot, "monster_id_hex", () => hex(slot.monster_id));
      derived(slot, "monster_resource", () => slot.count ? `monster:${slot.monster_id.toString(16).toUpperCase().padStart(2, "0")}` : null);
    }
  }
  derived(document, "selected_formation", () => document.formations.find(row => row.id === document.encounter_id));
}

async function encodeVehicles(asset) {
  const edited = cloneTables(await baselineComponentTables(asset, "vehicle-preset"));
  const document = asset.document;
  const presets = recordsById(
    document.presets,
    VEHICLE_PRESET_COUNT,
    "preset_id",
    "vehicles.presets",
  );
  for (const [presetId, preset] of presets) {
    if (!Array.isArray(preset.loadout) ||
        preset.loadout.length !== VEHICLE_LOADOUT_SLOT_COUNT) {
      throw new GameDataEncodingError(`vehicle preset ${presetId} loadout is incomplete`);
    }
    const start = presetId * VEHICLE_LOADOUT_SLOT_COUNT;
    for (const [slot, value] of preset.loadout.entries()) {
      edited.loadouts[start + slot] = editorInteger(
        fieldValue(value, "vehicle loadout item"),
        "vehicle loadout item",
        0,
        ITEM_COUNT - 1,
      );
    }
    writeLittleEndian(
      edited.defense,
      presetId * 2,
      2,
      editorInteger(fieldValue(preset.defense, "vehicle defense"), "vehicle defense", 0, 0xffff),
      "vehicle defense",
    );
    writeLittleEndian(
      edited["chassis-weight"],
      presetId * 2,
      2,
      editorInteger(
        fieldValue(preset.chassis_weight, "chassis weight"),
        "chassis weight",
        0,
        0xffff,
      ),
      "chassis weight",
    );
    edited["ammo-capacities"][presetId] = editorInteger(
      fieldValue(preset.ammo_capacity, "ammo capacity"),
      "ammo capacity",
      0,
      0xff,
    );
    edited["equipped-masks"][presetId] = editorInteger(
      fieldValue(preset.equipped_mask, "equipped mask"),
      "equipped mask",
      0,
      0xff,
    );
    edited["mount-masks"][presetId] = editorInteger(
      fieldValue(preset.mount_mask, "mount mask"),
      "mount mask",
      0,
      0xff,
    );
  }
  const placement = plainObject(document.initial_placement)
    ? document.initial_placement.records : null;
  if (!Array.isArray(placement) || placement.length !== VEHICLE_COUNT) {
    throw new GameDataEncodingError("vehicle initial placement must contain eight records");
  }
  for (const raw of placement) {
    const row = requireObject(raw, "vehicle initial placement record");
    const slot = editorInteger(row.vehicle_slot, "vehicle_slot", 0, VEHICLE_COUNT - 1);
    edited["initial-placement"][slot] = row.placed
      ? editorInteger(row.scene_id, "scene_id", 0, VEHICLE_PLACEMENT_SCENE_LAST_ID)
      : VEHICLE_PLACEMENT_UNPLACED_SCENE;
    edited["initial-placement"][VEHICLE_PLACEMENT_SLOT_COUNT + slot] =
      editorInteger(row.x, "placement x", 0, 0xff);
    edited["initial-placement"][VEHICLE_PLACEMENT_SLOT_COUNT + VEHICLE_COUNT + slot] =
      editorInteger(row.y, "placement y", 0, 0xff);
  }
  return edited;
}

const VEHICLE_FIELD_RESOURCE = "vehicle-preset";
const vehiclePresetHandle = id =>
  `${VEHICLE_FIELD_RESOURCE}:preset:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const vehiclePlacementHandle = id =>
  `${VEHICLE_FIELD_RESOURCE}:placement:${id.toString(16).toUpperCase().padStart(2, "0")}`;

function vehicleField(resourceId, entityHandle, fieldName, defaultValue, documentPath,
  fragmentId, offsetInFragment, byteLength = 1) {
  return {resourceId, entityHandle, fieldName, defaultValue, documentPath,
    fragmentId, offsetInFragment, byteLength};
}

function vehicleFieldValue(record, key, label) {
  return editorInteger(fieldValue(record?.[key], label), label, 0,
    key === "defense" || key === "chassis_weight" ? 0xffff : 0xff);
}

/** Describe every byte-owning leaf of the published vehicle-preset components. */
export function vehicleFieldDescriptions(document) {
  requireObject(document, `${VEHICLE_FIELD_RESOURCE}.document`);
  const presets = recordsById(document.presets, VEHICLE_PRESET_COUNT,
    "preset_id", "vehicles.presets");
  const fields = [];
  for (const [id, preset] of presets) {
    const position = document.presets.findIndex(row => Number(row.preset_id) === id);
    if (!Array.isArray(preset.loadout) || preset.loadout.length !== VEHICLE_LOADOUT_SLOT_COUNT) {
      throw new GameDataEncodingError(`vehicle preset ${id} loadout is incomplete`);
    }
    for (let slot = 0; slot < VEHICLE_LOADOUT_SLOT_COUNT; slot++) {
      const itemId = editorInteger(fieldValue(preset.loadout[slot],
        `vehicles.presets[${id}].loadout[${slot}]`),
      `vehicles.presets[${id}].loadout[${slot}]`, 0, ITEM_COUNT - 1);
      fields.push({...vehicleField(VEHICLE_FIELD_RESOURCE, vehiclePresetHandle(id),
        `loadout_${slot}`, itemId, ["presets", position, "loadout", slot, "item_id"],
        "vehicle-preset.loadouts", id * VEHICLE_LOADOUT_SLOT_COUNT + slot), recordId: id});
    }
    for (const [name, path, fragment, width, maximum] of [
      ["defense", "defense", "vehicle-preset.defense", 2, 0xffff],
      ["chassis_weight", "chassis_weight", "vehicle-preset.chassis-weight", 2, 0xffff],
      ["ammo_capacity", "ammo_capacity", "vehicle-preset.ammo-capacities", 1, 0xff],
      ["equipped_mask", "equipped_mask", "vehicle-preset.equipped-masks", 1, 0xff],
      ["mount_mask", "mount_mask", "vehicle-preset.mount-masks", 1, 0xff],
    ]) {
      const value = editorInteger(fieldValue(preset[name],
        `vehicles.presets[${id}].${name}`), `vehicles.presets[${id}].${name}`,
      0, maximum);
      fields.push({...vehicleField(VEHICLE_FIELD_RESOURCE, vehiclePresetHandle(id), name,
        value, ["presets", position, name, name === "chassis_weight" ? "internal_units" : "value"], fragment,
        width === 2 ? id * 2 : id, width), recordId: id});
    }
  }
  const placement = requireObject(document.initial_placement,
    "vehicles.initial_placement");
  if (!Array.isArray(placement.records) || placement.records.length !== VEHICLE_COUNT) {
    throw new GameDataEncodingError("vehicle initial placement must contain eight records");
  }
  for (const slot of [8, 9, 10]) {
    const marker = placement.disabled_slots?.find(row => Number(row.slot) === slot)?.marker_hex;
    if (String(marker).toUpperCase() !== "0XFE") {
      throw new GameDataEncodingError(`vehicle disabled slot ${slot} must remain FE`);
    }
  }
  for (const [position, row] of placement.records.entries()) {
    const slot = editorInteger(row.vehicle_slot, `initial_placement.records[${position}].vehicle_slot`,
      0, VEHICLE_COUNT - 1);
    const handle = vehiclePlacementHandle(slot);
    const path = ["initial_placement", "records", position];
    fields.push({...vehicleField(VEHICLE_FIELD_RESOURCE, handle, "scene_id",
      row.scene_id === null ? null : editorInteger(row.scene_id,
        `placement ${slot} scene_id`, 0, VEHICLE_PLACEMENT_SCENE_LAST_ID),
      [...path, "scene_id"], "vehicle-preset.initial-placement", slot), recordId: slot});
    fields.push({...vehicleField(VEHICLE_FIELD_RESOURCE, handle, "x",
      editorInteger(row.x, `placement ${slot} x`, 0, 0xff), [...path, "x"],
      "vehicle-preset.initial-placement", VEHICLE_PLACEMENT_SLOT_COUNT + slot), recordId: slot});
    fields.push({...vehicleField(VEHICLE_FIELD_RESOURCE, handle, "y",
      editorInteger(row.y, `placement ${slot} y`, 0, 0xff), [...path, "y"],
      "vehicle-preset.initial-placement", VEHICLE_PLACEMENT_SLOT_COUNT + VEHICLE_COUNT + slot), recordId: slot});
  }
  return fields;
}

function validateVehicleAsset(asset, original) {
  if (asset?.resource_id !== VEHICLE_FIELD_RESOURCE || original?.resource_id !== VEHICLE_FIELD_RESOURCE
      || asset.schema !== ASSET_SCHEMAS[VEHICLE_FIELD_RESOURCE]
      || original.schema !== asset.schema) {
    throw new GameDataEncodingError("vehicle asset identity changed");
  }
  vehicleFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of vehicleFieldDescriptions(original.document)) {
    const path = field.documentPath;
    const value = path.reduce((node, key) => node?.[key], asset.document);
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      structuredClone(value);
  }
  if (!canonicalJsonEqual(asset, expected)) {
    throw new GameDataEncodingError(
      "vehicle-preset only published loadout, attributes and initial placement fields are editable",
    );
  }
}

const VEHICLE_COLUMN_LABELS = new Map([
  ["defense", "底盘防御"], ["chassis_weight", "自重"], ["ammo_capacity", "弹仓容量"],
  ["equipped_mask", "已装备槽掩码"], ["mount_mask", "挂载件掩码"],
  ["scene_id", "所在地图"], ["x", "X 坐标"], ["y", "Y 坐标"],
]);
const VEHICLE_LOADOUT_COLUMN = /^loadout_(\d+)$/u;
const VEHICLE_FRAGMENT_LABELS = new Map([
  ["vehicle-preset.loadouts", "战车初始装备"], ["vehicle-preset.defense", "战车底盘防御"],
  ["vehicle-preset.chassis-weight", "战车自重"], ["vehicle-preset.ammo-capacities", "战车弹仓容量"],
  ["vehicle-preset.equipped-masks", "战车已装备槽掩码"], ["vehicle-preset.mount-masks", "战车挂载件掩码"],
  ["vehicle-preset.initial-placement", "战车初始配置位置"],
]);

function vehicleColumnLabel(fieldName) {
  const loadout = VEHICLE_LOADOUT_COLUMN.exec(fieldName);
  if (loadout) return `装备槽 ${Number(loadout[1]) + 1}`;
  return VEHICLE_COLUMN_LABELS.get(fieldName) ?? fieldName;
}

function vehicleColumnRange(field) {
  if (VEHICLE_LOADOUT_COLUMN.test(field.fieldName)) return [0, ITEM_COUNT - 1];
  if (field.fieldName === "defense" || field.fieldName === "chassis_weight") return [0, 0xffff];
  if (field.fieldName === "scene_id") return [0, VEHICLE_PLACEMENT_SCENE_LAST_ID];
  return [0, 0xff];
}

function vehicleMaskBits(document, name) {
  const bits = equipmentSlotBits(document.presets?.[0]?.[name]?.slots, "equipment_column");
  if (document.presets.some(preset =>
    JSON.stringify(equipmentSlotBits(preset[name]?.slots, "equipment_column")) !== JSON.stringify(bits)))
    throw new GameDataEncodingError(`${name} 的装备列标签不一致`);
  return bits;
}

/** 一个已发布片段一个字段对象（约束第 13 条）：片段里的每个预设一行，列按字段并集铺开。 */
export function vehicleObjects(document) {
  const byFragment = new Map();
  for (const field of vehicleFieldDescriptions(document)) {
    if (!byFragment.has(field.fragmentId)) byFragment.set(field.fragmentId, []);
    byFragment.get(field.fragmentId).push(field);
  }
  return [...byFragment.entries()].map(([fragmentId, rows]) => {
    const handles = [...new Set(rows.map(field => field.entityHandle))];
    return {
      id: fragmentId,
      label: VEHICLE_FRAGMENT_LABELS.get(fragmentId) ?? `战车数据 · ${fragmentId}`,
      fragmentIds: [fragmentId],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: handles, rowLabels: handles,
        columns: [...new Set(rows.map(field => field.fieldName))].map(name => {
          const carriers = rows.filter(field => field.fieldName === name);
          const [min, max] = vehicleColumnRange(carriers[0]);
          return {name, label: vehicleColumnLabel(name), min, max,
            nullable: name === "scene_id", nullLabel: "未放置",
            ...(["equipped_mask", "mount_mask"].includes(name) ? {
              semantic: {kind: "bit-labels"},
              bits: vehicleMaskBits(document, name),
            } : {}),
            ...(["scene_id", "x", "y"].includes(name) ? {semantic: {kind: "coordinate",
              fields: {scene: "scene_id", x: "x", y: "y"}},
              ...(name === "scene_id" ? {candidates: {document: "project.scenes",
                documentPath: ["editable_scenes"], value: ["id"], label: ["name"]}} : {})} : {}),
            rows: carriers.map(field => field.entityHandle)};
        })},
    };
  });
}

export function serializeVehicleField(field) {
  if (field?.resourceId !== VEHICLE_FIELD_RESOURCE || field.readOnly)
    throw new GameDataEncodingError("战车字段身份无效");
  if (field.fieldName === "scene_id" && field.value === null)
    return Uint8Array.of(VEHICLE_PLACEMENT_UNPLACED_SCENE);
  const [minimum, maximum] = vehicleColumnRange(field);
  const value = editorInteger(field.value, field.fieldName, minimum, maximum);
  const payload = new Uint8Array(fieldByteLength(field));
  for (let byte = 0; byte < payload.length; byte += 1) payload[byte] = (value >>> (byte * 8)) & 0xff;
  return payload;
}

export function validateVehiclePreimage(fields, fragmentId, baseline) {
  const spec = gameDataComponentSpecs(VEHICLE_FIELD_RESOURCE).find(item => item.fragmentId === fragmentId);
  if (!spec || baseline.length !== spec.length)
    throw new GameDataEncodingError("战车 Origin 片段身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (field.resourceId !== VEHICLE_FIELD_RESOURCE || fieldFragmentId(field) !== fragmentId || seen.has(key))
      throw new GameDataEncodingError("战车 Origin 字段身份不符");
    seen.add(key);
    const expected = serializeVehicleField({...field, value: field.defaultValue});
    const offset = fieldOffsetInFragment(field);
    if (!Number.isSafeInteger(offset)) throw new GameDataEncodingError("战车字段物理位置无效");
    const observed = baseline.subarray(offset, offset + expected.length);
    if (observed.length !== expected.length || observed.some((byte, index) => byte !== expected[index]))
      throw new GameDataEncodingError("战车 Origin 与绑定原像不同");
  }
}

export function validateVehicleFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, vehicleFieldDescriptions, validateVehicleAsset);
  for (const field of vehicleFieldDescriptions(original.document)) {
    if (field.fieldName !== "mount_mask") continue;
    const override = overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
    if (override && ((override.value ^ field.defaultValue) & 0x1f)) {
      throw new GameDataEncodingError("战车开孔低五位未决，必须保留 Original");
    }
  }
}

// Keep the document-shaped projection useful to legacy renderers without
// turning derived labels into Working fields. The ROM-owned values above are
// the only writable leaves; these labels are recomputed after the shared field
// getters are attached.
export function projectVehicleFieldView(document) {
  for (const preset of document?.presets || []) {
    const equipped = Number(preset.equipped_mask?.value);
    if (Number.isInteger(equipped) && Array.isArray(preset.equipped_mask?.slots)) {
      preset.equipped_mask.value_hex = `0x${equipped.toString(16).toUpperCase().padStart(2, "0")}`;
      preset.equipped_mask.states = equipmentNamedStates(
        equipped, preset.equipped_mask.slots, "equipment_column",
      );
    }
    const mount = Number(preset.mount_mask?.value);
    if (Number.isInteger(mount) && Array.isArray(preset.mount_mask?.slots)) {
      preset.mount_mask.value_hex = `0x${mount.toString(16).toUpperCase().padStart(2, "0")}`;
      preset.mount_mask.states = equipmentNamedStates(
        mount, preset.mount_mask.slots, "equipment_column",
      );
    }
  }
  for (const row of document?.initial_placement?.records || []) {
    const scene = row.scene_id;
    row.placed = scene !== null && scene !== undefined && Number(scene) !== VEHICLE_PLACEMENT_UNPLACED_SCENE;
    row.scene_id_hex = row.placed
      ? `0x${Number(scene).toString(16).toUpperCase().padStart(2, "0")}`
      : `0x${VEHICLE_PLACEMENT_UNPLACED_SCENE.toString(16).toUpperCase().padStart(2, "0")}`;
  }
}

export function encodeVehicleFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== VEHICLE_FIELD_RESOURCE || values.has(key)) {
      throw new GameDataEncodingError("vehicle field identity duplicated or foreign");
    }
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new GameDataEncodingError(`vehicle field missing ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const payloads = new Map(gameDataComponentSpecs(VEHICLE_FIELD_RESOURCE).map(spec =>
    [spec.fragmentId, new Uint8Array(spec.length)]));
  for (let id = 0; id < VEHICLE_PRESET_COUNT; id++) {
    const handle = vehiclePresetHandle(id);
    for (let slot = 0; slot < VEHICLE_LOADOUT_SLOT_COUNT; slot++)
      payloads.get("vehicle-preset.loadouts")[id * VEHICLE_LOADOUT_SLOT_COUNT + slot] =
        editorInteger(take(handle, `loadout_${slot}`), "vehicle loadout item", 0, ITEM_COUNT - 1);
    for (const [name, fragment, width, maximum] of [
      ["defense", "vehicle-preset.defense", 2, 0xffff],
      ["chassis_weight", "vehicle-preset.chassis-weight", 2, 0xffff],
      ["ammo_capacity", "vehicle-preset.ammo-capacities", 1, 0xff],
      ["equipped_mask", "vehicle-preset.equipped-masks", 1, 0xff],
      ["mount_mask", "vehicle-preset.mount-masks", 1, 0xff],
    ]) {
      const value = editorInteger(take(handle, name), `vehicle ${name}`, 0, maximum);
      if (width === 2) writeLittleEndian(payloads.get(fragment), id * 2, 2, value, name);
      else payloads.get(fragment)[id] = value;
    }
  }
  const placement = payloads.get("vehicle-preset.initial-placement");
  placement.fill(VEHICLE_PLACEMENT_UNPLACED_SCENE, 0, VEHICLE_PLACEMENT_SLOT_COUNT);
  placement.fill(0, VEHICLE_PLACEMENT_SLOT_COUNT);
  placement.fill(0, VEHICLE_PLACEMENT_SLOT_COUNT + VEHICLE_COUNT);
  for (let slot = 0; slot < VEHICLE_COUNT; slot++) {
    const handle = vehiclePlacementHandle(slot);
    const scene = take(handle, "scene_id");
    placement[slot] = scene === null ? VEHICLE_PLACEMENT_UNPLACED_SCENE :
      editorInteger(scene, "vehicle scene_id", 0, VEHICLE_PLACEMENT_SCENE_LAST_ID);
    placement[VEHICLE_PLACEMENT_SLOT_COUNT + slot] = editorInteger(take(handle, "x"), "vehicle placement x", 0, 0xff);
    placement[VEHICLE_PLACEMENT_SLOT_COUNT + VEHICLE_COUNT + slot] = editorInteger(take(handle, "y"), "vehicle placement y", 0, 0xff);
  }
  placement[8] = placement[9] = placement[10] = 0xfe;
  if (values.size) throw new GameDataEncodingError("vehicle build fields incomplete or unknown");
  return gameDataComponentSpecs(VEHICLE_FIELD_RESOURCE).map(spec => ({
    fragment_id: spec.fragmentId, payload: payloads.get(spec.fragmentId), relocations: [],
  }));
}

function validateWantedPair(raw, label) {
  const pair = requireObject(raw, label);
  const high = editorInteger(
    fieldValue(pair.high_target_id, `${label}.high_target_id`),
    `${label}.high_target_id`,
    0,
    0x0f,
  );
  const low = editorInteger(
    fieldValue(pair.low_target_id, `${label}.low_target_id`),
    `${label}.low_target_id`,
    0,
    0x0f,
  );
}

function validateWantedDocument(document) {
  requireObject(document, "wanted.document");
  validateWantedPair(
    document.default_pair,
    "wanted.default_pair",
  );
  editorInteger(
    document.target_count,
    "wanted.target_count",
    WANTED_TARGET_COUNT,
    WANTED_TARGET_COUNT,
  );
  if (!Array.isArray(document.targets) ||
      document.targets.length !== WANTED_TARGET_COUNT) {
    throw new GameDataEncodingError(
      `wanted.targets must contain ${WANTED_TARGET_COUNT} records`,
    );
  }
  const targets = new Map();
  for (const [position, raw] of document.targets.entries()) {
    const target = requireObject(raw, `wanted.targets[${position}]`);
    const index = editorInteger(
      target.index,
      `wanted.targets[${position}].index`,
      1,
      WANTED_TARGET_COUNT,
    );
    if (targets.has(index)) {
      throw new GameDataEncodingError(`wanted.targets has duplicate index ${index}`);
    }
    targets.set(index, target);
  }
  for (let index = 1; index <= WANTED_TARGET_COUNT; index += 1) {
    const target = targets.get(index);
    if (!target) {
      throw new GameDataEncodingError(`wanted.targets is missing index ${index}`);
    }
    // scene_id identifies the immutable scene-table row. That table is not an
    // editable component of wanted-record, so accepting a different scene order
    // would make a saved target appear under the wrong poster location.
    const sceneId = editorInteger(
      target.scene_id,
      `wanted.targets[${index}].scene_id`,
      0,
      0xff,
    );
    const expectedSceneId = WANTED_TARGET_SCENE_IDS[index - 1];
    if (sceneId !== expectedSceneId) {
      throw new GameDataEncodingError(
        `wanted.targets[${index}].scene_id must be ${expectedSceneId}`,
      );
    }
    validateWantedPair(
      target,
      `wanted.targets[${index}]`,
    );
  }
  if (!Array.isArray(document.bounty_codes) || document.bounty_codes.length !== 11) {
    throw new GameDataEncodingError("wanted.bounty_codes must contain 11 records");
  }
  for (const [position, row] of document.bounty_codes.entries()) {
    editorInteger(row?.wanted_id, `wanted.bounty_codes[${position}].wanted_id`, position + 1, position + 1);
    editorInteger(fieldValue(row?.raw_code, `wanted.bounty_codes[${position}].raw_code`),
      `wanted.bounty_codes[${position}].raw_code`, 0, 0xe8);
  }
}

const wantedFields = Object.freeze(["high_target_id", "low_target_id"]);
const wantedHandle = index => index === 0 ? "wanted-record:default-pair" : `wanted-record:target:${index}`;
export function wantedFieldDescriptions(document) {
  validateWantedDocument(document);
  const pairFields = [{index: 0, path: ["default_pair"], pair: document.default_pair},
    ...document.targets.map((pair, position) => ({index: pair.index, path: ["targets", position], pair}))]
    .flatMap(({index, path, pair}) => wantedFields.map((fieldName, column) => ({
      resourceId: "wanted-record", entityHandle: wantedHandle(index), fieldName,
      recordId: index, documentPath: [...path, fieldName], defaultValue: pair[fieldName],
      fragmentId: `wanted-record.${index === 0 ? "default-pair" : "targets"}`,
      offsetInFragment: index === 0 ? 0 : index - 1, byteLength: 1,
      bitMask: column === 0 ? 0xf0 : 0x0f, bitShift: column === 0 ? 4 : 0,
      pairedDefaultValue: pair[wantedFields[column === 0 ? 1 : 0]],
    })));
  return [...pairFields, ...document.bounty_codes.map((row, position) => ({
    resourceId: "wanted-record", entityHandle: `wanted-record:bounty:${row.wanted_id}`,
    fieldName: "raw_code", recordId: row.wanted_id,
    documentPath: ["bounty_codes", position, "raw_code"], defaultValue: row.raw_code,
    fragmentId: "wanted-record.bounty-codes", offsetInFragment: position, byteLength: 1,
  }))];
}

function validateWantedAsset(asset, original) {
  if (original?.resource_id !== "wanted-record" || asset?.resource_id !== "wanted-record")
    throw new GameDataEncodingError("wanted asset identity changed");
  validateWantedDocument(original.document);
  validateWantedDocument(asset.document);
  const expected = structuredClone(original);
  for (const description of wantedFieldDescriptions(original.document)) {
    const path = description.documentPath;
    const parent = path.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[path.at(-1)] = path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new GameDataEncodingError("通缉字段只允许修改目标对或赏金代码，记录身份和组件证据不能改变");
}

export function validateWantedFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, wantedFieldDescriptions, validateWantedAsset);
}

export function encodeWantedFields(fields, {defaults = false} = {}) {
  const specs = gameDataComponentSpecs("wanted-record");
  const payloads = new Map(specs.map(spec => [spec.fragmentId, new Uint8Array(spec.length)]));
  const positions = new Map(Array.from({length: 13}, (_, index) => wantedFields.map((name, column) => [
    JSON.stringify([wantedHandle(index), name]), {fragmentId: specs[index === 0 ? 0 : 1].fragmentId,
      offset: index === 0 ? 0 : index - 1, mask: column === 0 ? 0xf0 : 0x0f, shift: column === 0 ? 4 : 0},
  ])).flat());
  for (let index = 1; index <= 11; index += 1) positions.set(
    JSON.stringify([`wanted-record:bounty:${index}`, "raw_code"]),
    {fragmentId: specs[2].fragmentId, offset: index - 1, mask: null, shift: 0});
  const seen = new Set();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]), position = positions.get(key);
    if (field.resourceId !== "wanted-record" || !position || seen.has(key)
        || (position.mask !== null && (field.bitMask !== position.mask || field.bitShift !== position.shift)))
      throw new GameDataEncodingError("通缉字段身份或位域无效");
    seen.add(key);
    const value = editorInteger(fieldValue(defaults ? field.defaultValue : field.value, key),
      key, 0, position.mask === null ? 0xe8 : 15);
    if (position.mask === null) payloads.get(position.fragmentId)[position.offset] = value;
    else payloads.get(position.fragmentId)[position.offset] |= (value << position.shift) & position.mask;
  }
  if (seen.size !== positions.size) throw new GameDataEncodingError("通缉字段未覆盖完整组件");
  return specs.map(spec => ({fragment_id: spec.fragmentId, payload: payloads.get(spec.fragmentId), relocations: []}));
}

const WANTED_TARGETS = Array.from({length: 12}, (_, index) => index + 1);
const WANTED_COLUMN_LABELS = Object.freeze({high_target_id: "编队 ID 高 4 位", low_target_id: "编队 ID 低 4 位"});

function wantedFieldPosition(field) {
  const bounty = /^wanted-record:bounty:(\d+)$/u.exec(field.entityHandle);
  if (field.resourceId === "wanted-record" && field.fieldName === "raw_code" && bounty) {
    const index = Number(bounty[1]);
    if (index >= 1 && index <= 11) return {index, fragmentId: "wanted-record.bounty-codes",
      offset: index - 1, shift: 0, bounty: true};
  }
  const match = /^wanted-record:target:(\d+)$/u.exec(field.entityHandle);
  const index = field.entityHandle === "wanted-record:default-pair" ? 0 : match ? Number(match[1]) : -1;
  const column = wantedFields.indexOf(field.fieldName);
  if (field.resourceId !== "wanted-record" || index < 0 || index > 12 || column < 0)
    throw new GameDataEncodingError("通缉字段身份无效");
  return {index, column, fragmentId: index === 0 ? "wanted-record.default-pair" : "wanted-record.targets",
    offset: index === 0 ? 0 : index - 1, shift: column === 0 ? 4 : 0};
}

/** 一段一个字段对象：默认对 1 个字节、目标 12 个字节，每字节高/低 4 位各一个字段。 */
export function wantedObjects() {
  const pairs = ["wanted-record.default-pair", "wanted-record.targets"].map((fragmentId, component) => {
    const indexes = component === 0 ? [0] : WANTED_TARGETS, rows = indexes.map(wantedHandle);
    return {id: fragmentId, label: component === 0 ? "默认对" : "目标", fragmentIds: [fragmentId],
      fields: indexes.flatMap(index => wantedFields.map(name => [wantedHandle(index), name])),
      editor: {kind: "bitfield-table", rows, rowLabels: rows,
        columns: wantedFields.map((name, column) => ({name, label: WANTED_COLUMN_LABELS[name], min: 0, max: 15,
          bitMask: column === 0 ? 0xf0 : 0x0f, bitShift: column === 0 ? 4 : 0}))}};
  });
  return [...pairs, {id: "wanted-record.bounty-codes", label: "赏金代码",
    fragmentIds: ["wanted-record.bounty-codes"],
    fields: Array.from({length: 11}, (_, index) => [`wanted-record:bounty:${index + 1}`, "raw_code"]),
    editor: {kind: "numeric-table", rows: Array.from({length: 11}, (_, index) => `wanted-record:bounty:${index + 1}`),
      columns: [{name: "raw_code", label: "赏金代码", min: 0, max: 0xe8}]}}];
}

// 一字节里的两个 4 位字段合成同一个字节；另一半不在候选里时用它自己的默认值。
export function serializeWantedField(field, selected = [field]) {
  const position = wantedFieldPosition(field);
  if (position.bounty) return new Uint8Array([
    editorInteger(fieldValue(field.value, field.fieldName), field.fieldName, 0, 0xe8)]);
  const half = wantedFields[position.column === 0 ? 1 : 0];
  const other = selected.find(item => item.entityHandle === field.entityHandle && item.fieldName === half);
  const value = editorInteger(fieldValue(field.value, field.fieldName), field.fieldName, 0, 15);
  const otherValue = editorInteger(fieldValue(other ? other.value : field.pairedDefaultValue,
    half), half, 0, 15);
  return new Uint8Array([position.shift === 4 ? (value << 4) | otherValue : (otherValue << 4) | value]);
}

export function validateWantedPreimage(fields, fragmentId, baseline) {
  const specs = gameDataComponentSpecs("wanted-record");
  const component = ["wanted-record.default-pair", "wanted-record.targets", "wanted-record.bounty-codes"].indexOf(fragmentId);
  if (component < 0 || baseline.length !== specs[component].length)
    throw new GameDataEncodingError("通缉 Origin 组件身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    const position = wantedFieldPosition(field), key = `${field.entityHandle}:${field.fieldName}`;
    if (position.fragmentId !== fragmentId || seen.has(key))
      throw new GameDataEncodingError("通缉 Origin 字段身份不符");
    seen.add(key);
    const expected = position.bounty ? baseline[position.offset]
      : position.shift === 4 ? baseline[position.offset] >> 4 : baseline[position.offset] & 15;
    if (expected !== field.defaultValue) throw new GameDataEncodingError("通缉 Origin 与绑定原像不同");
  }
}

export async function validateGameDataComponentPreimages(asset, resourceId) {
  await baselineComponentTables(asset, resourceId);
}

export function shellPriceFieldDescriptions(document) {
  const records = recordsById(document.records, 14, "id", "shells.records");
  return document.records.flatMap((row, position) => {
    const entityHandle = `shell:${row.id.toString(16).toUpperCase().padStart(2, "0")}`;
    return [
      {
        resourceId: "shell-record", entityHandle, fieldName: "price.raw_code", recordId: row.id,
        documentPath: ["records", position, "price", "raw_code"],
        defaultValue: editorInteger(records.get(row.id).price?.raw_code,
          "shell vending price code", 0, 0xe8),
        fragmentId: "shell-record.vending-price-codes", offsetInFragment: row.id, byteLength: 1,
      },
      ...(Object.prototype.hasOwnProperty.call(row, "parameter_raw") ? [{
        resourceId: "shell-record", entityHandle, fieldName: "parameter_raw", recordId: row.id,
        documentPath: ["records", position, "parameter_raw"],
        defaultValue: editorInteger(row.parameter_raw, "shell parameter raw", 0, 0xff),
        writeback: ROM_WRITE_PENDING,
      }] : []),
      ...(Object.prototype.hasOwnProperty.call(row, "visual_packed") ? [{
        resourceId: "shell-record", entityHandle, fieldName: "visual_packed", recordId: row.id,
        documentPath: ["records", position, "visual_packed"],
        defaultValue: editorInteger(row.visual_packed, "shell visual packed byte", 0, 0xff),
        writeback: {state: "unpermitted"},
      }] : []),
    ];
  });
}

const SHELL_EDITOR_LABELS = Object.freeze({
  "price.raw_code": "售货机价格码",
  parameter_raw: "效果参数原值",
  visual_packed: "攻击特效打包值",
});

export function shellObjects(document) {
  const descriptions = shellPriceFieldDescriptions(document);
  const byHandle = new Map();
  for (const field of descriptions) {
    if (!Number.isInteger(field.defaultValue)) continue;
    const rows = byHandle.get(field.entityHandle) || [];
    rows.push(field);
    byHandle.set(field.entityHandle, rows);
  }
  return [...byHandle.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `炮弹 · ${entityHandle}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId).filter(Boolean))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows
      .filter(field => !field.readOnly)
      .map(field => ({
        name: field.fieldName,
        label: SHELL_EDITOR_LABELS[field.fieldName] || field.fieldName,
        min: 0,
        max: field.fieldName === "price.raw_code" ? 0xe8 : 0xff,
        ...(field.fieldName === "visual_packed" ? {visualMask: 0x3f} : {}),
        ...(field.fieldName === "visual_packed" ? {
          semantic: {kind: "reference", targetModule: "attack-visual"},
          candidates: {resourceId: "attack-visual", documentPath: ["records"],
            filter: {path: ["id"], values: Array.from({length: 0x40}, (_, id) => id)},
            value: ["id"], label: ["handle"]},
        } : {}),
        ...(field.fieldName === "price.raw_code" ? {unit: "G", candidates: {
          resourceId: "item-entry",
          documentPath: ["equipment_editor", "numeric_codes"],
          filter: {path: ["available"], values: [true]},
          value: ["raw_code"],
          label: ["value", "raw_code_hex"],
        }} : {}),
      }))},
  }));
}

export function serializeShellField(field) {
  if (field?.resourceId !== "shell-record" || field.fieldName !== "price.raw_code"
      || !fieldFragmentId(field) || fieldFragmentId(field) !== "shell-record.vending-price-codes"
      || !Number.isInteger(fieldOffsetInFragment(field)) || !Number.isInteger(field.value)
      || field.value < 0 || field.value > 0xe8) {
    throw new GameDataEncodingError("shell-record field identity or value invalid");
  }
  return new Uint8Array([field.value]);
}

function validateShellPriceAsset(asset, original) {
  if (asset?.resource_id !== "shell-record" || original?.resource_id !== "shell-record")
    throw new GameDataEncodingError("shell price asset identity changed");
  shellPriceFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of shellPriceFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new GameDataEncodingError("炮弹只允许修改已登记字段；身份、物理来源和派生投影不能改变");
}

export function validateShellPriceFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, shellPriceFieldDescriptions, validateShellPriceAsset);
}

export function encodeShellPriceFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(14), seen = new Set();
  for (const field of fields) {
    if (!fieldFragmentId(field)) continue;
    const id = field.recordId;
    if (field.resourceId !== "shell-record" || !Number.isInteger(id) || id < 0 || id >= 14
        || field.entityHandle !== `shell:${id.toString(16).toUpperCase().padStart(2, "0")}`
        || field.fieldName !== "price.raw_code" || seen.has(id))
      throw new GameDataEncodingError("炮弹价格字段身份无效");
    seen.add(id);
    payload[id] = editorInteger(defaults ? field.defaultValue : field.value, "shell vending price code", 0, 0xe8);
  }
  if (seen.size !== 14) throw new GameDataEncodingError("炮弹价格字段未覆盖完整组件");
  return [{fragment_id: "shell-record.vending-price-codes", payload, relocations: []}];
}

// Derived labels are read-only consumers of the raw-code field and the existing
// published numeric codebook. They never become additional Working values.
export async function projectShellPriceView(document, {repository, revisionId}) {
  const items = await repository.getOriginal("item-entry", {revisionId});
  if (items?.revision_id !== revisionId) throw new GameDataEncodingError("炮弹价格缺少同版本数值表");
  const options = items.value?.document?.equipment_editor?.numeric_codes;
  if (!Array.isArray(options)) throw new GameDataEncodingError("炮弹价格缺少已发布数值表");
  const byCode = new Map(options.map(option => [option.raw_code, option]));
  for (const row of document.records) {
    for (const key of ["value", "available", "raw_code_hex"]) Object.defineProperty(row.price, key, {
      enumerable: true, get() {
        const option = byCode.get(row.price.raw_code);
        if (!option?.available) throw new GameDataEncodingError("炮弹价格码不在已发布数值表中");
        return option[key];
      },
    });
    if (!Number.isInteger(row.visual_packed)) continue;
    const visual = key => Object.defineProperty(row, key, {enumerable: true,
      get: () => {
        const packed = row.visual_packed;
        const code = packed & 0x3f;
        if (key === "visual_code") return code;
        if (key === "visual_variant") return packed >> 6;
        if (key === "pre_shift_value") return packed >> 3;
        return `0x${(key === "visual_packed_hex" ? packed : code)
          .toString(16).toUpperCase().padStart(2, "0")}`;
      }});
    for (const key of ["visual_packed_hex", "visual_code", "visual_code_hex",
      "visual_variant", "pre_shift_value"]) visual(key);
    const table = document.tables?.visual_selectors;
    if (Array.isArray(table?.values) && row.id < table.values.length)
      Object.defineProperty(table.values, row.id, {enumerable: true, get: () => row.visual_packed});
    if (Array.isArray(table?.values_hex) && row.id < table.values_hex.length)
      Object.defineProperty(table.values_hex, row.id, {enumerable: true,
        get: () => row.visual_packed_hex});
  }
}

function weaponMountableSlotsMask(slots) {
  const masks = {main_gun: 0x80, sub_gun: 0x40, special: 0x20};
  if (!Array.isArray(slots) || new Set(slots).size !== slots.length ||
      slots.some(slot => typeof slot !== "string" || !Object.hasOwn(masks, slot))) {
    throw new GameDataEncodingError("weapon mountable_slots must be a unique set of main_gun/sub_gun/special");
  }
  return slots.reduce((mask, slot) => mask | masks[slot], 0);
}

const itemHandle = id =>
  `${ITEM_FIELD_RESOURCE}:item:${id.toString(16).toUpperCase().padStart(2, "0")}`;

function itemField(resourceId, entityHandle, fieldName, defaultValue, documentPath,
  fragmentId, offsetInFragment, byteLength = 1, extra = {}) {
  return {resourceId, entityHandle, fieldName, defaultValue, documentPath,
    fragmentId, offsetInFragment, byteLength, ...extra};
}

function itemRawCode(record, field, label, {available = true} = {}) {
  const value = requireObject(record[field], label);
  const code = editorInteger(value.raw_code, `${label}.raw_code`, 0, 0xff);
  if (available && code >= ITEM_NUMERIC_FIRST_UNAVAILABLE_CODE) {
    throw new GameDataEncodingError(`${label} uses unavailable numeric code ${code}`);
  }
  return code;
}

/** Describe all semantic leaves and every opaque Original byte of item-entry. */
export function itemFieldDescriptions(document, {asset} = {}) {
  const records = recordsById(document?.records, ITEM_COUNT, "id", "items.records");
  const fields = [];
  for (const [id, record] of records) {
    const position = document.records.findIndex(row => Number(row.id) === id);
    const handle = itemHandle(id);
    const common = {resourceId: ITEM_FIELD_RESOURCE, entityHandle: handle,
      recordId: id, byteLength: 1};
    fields.push({...common, fieldName: "id", defaultValue: id,
      documentPath: ["records", position, "id"], readOnly: true,
      edit_policy: "immutable", immutable_basis: "记录身份由固定表下标决定"});
    fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "price.raw_code",
      itemRawCode(record, "price", `items.records[${id}].price`, {available: false}),
      ["records", position, "price", "raw_code"],
      "item-entry.price-codes", id), ...common});
    if (id >= 0x01 && id <= 0x22) {
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "defense.raw_code",
        itemRawCode(record, "defense", `items.records[${id}].defense`),
        ["records", position, "defense", "raw_code"],
        "item-entry.equipment-values", id), ...common});
    } else if (id >= ITEM_ATTACK_FIRST && id <= ITEM_ATTACK_LAST) {
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "attack.raw_code",
        itemRawCode(record, "attack", `items.records[${id}].attack`),
        ["records", position, "attack", "raw_code"],
        "item-entry.equipment-values", id), ...common});
    }
    if (id >= 0x41 && id <= 0x90) {
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "defense.raw_code",
        itemRawCode(record, "defense", `items.records[${id}].defense`),
        ["records", position, "defense", "raw_code"],
        "item-entry.equipment-values", id + 0x34), ...common});
      const weight = requireObject(record.tank_weight, `items.records[${id}].tank_weight`);
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "tank_weight.raw",
        editorInteger(weight.raw, `items.records[${id}].tank_weight.raw`, 0, 0xff),
        ["records", position, "tank_weight", "raw"],
        "item-entry.tank-weight", id - 0x41), ...common});
    }
    if (id >= 0x79 && id <= 0x90) {
      const capacity = requireObject(record.engine_capacity,
        `items.records[${id}].engine_capacity`);
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "engine_capacity.raw",
        editorInteger(capacity.raw, `items.records[${id}].engine_capacity.raw`, 0, 0xff),
        ["records", position, "engine_capacity", "raw"],
        "item-entry.engine-capacity", id - 0x79), ...common});
    }
    if (id <= ITEM_ATTACK_LAST) {
      const equipment = requireObject(record.equipment, `items.records[${id}].equipment`);
      const rawFlags = editorInteger(equipment.raw_flags,
        `items.records[${id}].equipment.raw_flags`, 0, 0xff);
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "equipment.raw_flags",
        rawFlags, ["records", position, "equipment", "raw_flags"],
        "item-entry.equipment-flags", id, 1, {readOnly: true, bitMask: 0xff,
          edit_policy: "immutable", immutable_basis: "整字节由战斗效果、适用位置及目标范围位组成"}), ...common});
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "equipment.battle_effect_code",
        editorInteger(equipment.battle_effect_code,
          `items.records[${id}].equipment.battle_effect_code`, 0, 7),
        ["records", position, "equipment", "battle_effect_code"],
        "item-entry.equipment-flags", id, 1, {bitMask: 0x07}), ...common});
      const unresolved = editorInteger(equipment.unresolved_bits ?? 0,
        `items.records[${id}].equipment.unresolved_bits`, 0, 0xff);
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "equipment.unresolved_bits",
        unresolved, ["records", position, "equipment", "unresolved_bits"],
        "item-entry.equipment-flags", id, 1, {bitMask: 0xff,
          writeback: ROM_WRITE_PENDING}), ...common});
      if (id <= 0x40) {
        const roleMask = editorInteger(equipment.role_mask ?? 0,
          `items.records[${id}].equipment.role_mask`, 0, 0xe0);
        fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "equipment.role_mask",
          roleMask, ["records", position, "equipment", "role_mask"],
          "item-entry.equipment-flags", id, 1, {bitMask: 0xe0}), ...common});
      } else {
        const slots = record.mountable_slots;
        weaponMountableSlotsMask(slots);
        fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "mountable_slots",
          [...slots], ["records", position, "mountable_slots"],
          "item-entry.equipment-flags", id, 1, {bitMask: 0xe0}), ...common});
      }
      if (id >= ITEM_ATTACK_FIRST) {
        const targetScope = requireObject(equipment.target_scope,
          `items.records[${id}].equipment.target_scope`);
        const bits = editorInteger(targetScope.bits,
          `items.records[${id}].equipment.target_scope.bits`, 0, ITEM_ATTACK_TARGET_SCOPE_MASK);
        if (!ITEM_ATTACK_TARGET_SCOPE_BITS.has(bits))
          throw new GameDataEncodingError(`items.records[${id}] uses invalid target scope`);
        fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "equipment.target_scope.bits",
          bits, ["records", position, "equipment", "target_scope", "bits"],
          "item-entry.equipment-flags", id, 1, {bitMask: ITEM_ATTACK_TARGET_SCOPE_MASK}), ...common});
      }
    }
    if (id >= ITEM_ATTACK_FIRST && id <= ITEM_ATTACK_LAST) {
      const visual = requireObject(record.attack_visual,
        `items.records[${id}].attack_visual`);
      fields.push({...itemField(ITEM_FIELD_RESOURCE, handle, "attack_visual.visual_code",
        editorInteger(visual.visual_code,
          `items.records[${id}].attack_visual.visual_code`, 0, ITEM_ATTACK_VISUAL_CODE_MAX),
        ["records", position, "attack_visual", "visual_code"],
        "item-entry.attack-visual-codes", id - ITEM_ATTACK_FIRST), ...common});
    }
  }
  const matches = (asset?.components || []).map((row, index) => ({row, index}))
    .filter(({row}) => row.id === "item-entry.numeric-codebook");
  if (matches.length !== 1) throw new GameDataEncodingError("items numeric codebook Original missing or repeated");
  const {row: codebook, index} = matches[0];
  const payload = bytesFromHex(codebook.payload_hex, "items numeric codebook");
  if (codebook.length !== ITEM_NUMERIC_CODEBOOK_BYTES || payload.length !== ITEM_NUMERIC_CODEBOOK_BYTES)
    throw new GameDataEncodingError("items numeric codebook must contain 394 bytes");
  fields.push({resourceId: ITEM_FIELD_RESOURCE, entityHandle: codebook.id, fieldName: "payload_hex",
    defaultValue: codebook.payload_hex, assetPath: ["components", index, "payload_hex"],
    writeback: ROM_WRITE_PENDING,
    fragmentId: codebook.id, offsetInFragment: 0, byteLength: ITEM_NUMERIC_CODEBOOK_BYTES});
  const valuesMatches = (asset?.components || []).map((row, index) => ({row, index}))
    .filter(({row}) => row.id === "item-entry.equipment-values");
  if (valuesMatches.length !== 1) throw new GameDataEncodingError("items equipment values Original missing or repeated");
  const {row: valuesComponent, index: valuesIndex} = valuesMatches[0];
  const valuesPayload = bytesFromHex(valuesComponent.payload_hex, "items equipment values");
  if (valuesComponent.length !== 0xc5 || valuesPayload.length !== 0xc5)
    throw new GameDataEncodingError("items equipment values must contain 197 bytes");
  fields.push({resourceId: ITEM_FIELD_RESOURCE, entityHandle: valuesComponent.id, fieldName: "payload_hex",
    defaultValue: valuesComponent.payload_hex, writeback: ROM_WRITE_PENDING,
    assetPath: ["components", valuesIndex, "payload_hex"], fragmentId: valuesComponent.id,
    offsetInFragment: 0, byteLength: 0xc5});
  return fields;
}

const ITEM_EDITOR_LABELS = Object.freeze({
  "price.raw_code": "价格码",
  "defense.raw_code": "防御数值码",
  "attack.raw_code": "攻击数值码",
  "tank_weight.raw": "重量原值",
  "engine_capacity.raw": "引擎容量原值",
  "equipment.battle_effect_code": "战斗效果码",
  "equipment.unresolved_bits": "未解析位原值",
  "equipment.role_mask": "适用位置掩码",
  mountable_slots: "可装位",
  "equipment.target_scope.bits": "目标范围位",
  "attack_visual.visual_code": "攻击特效码",
  payload_hex: "组件原始字节",
});

/** Provide one field-object table per item record for the shared item page. */
export function itemObjects(document) {
  const fields = itemFieldDescriptions(document, {asset: {components: [
    {id: "item-entry.numeric-codebook", length: ITEM_NUMERIC_CODEBOOK_BYTES,
      payload_hex: "00".repeat(ITEM_NUMERIC_CODEBOOK_BYTES)},
    {id: "item-entry.equipment-values", length: 0xc5,
      payload_hex: "00".repeat(0xc5)},
  ]}});
  const byHandle = new Map();
  for (const field of fields) {
    if (!byHandle.has(field.entityHandle)) byHandle.set(field.entityHandle, []);
    byHandle.get(field.entityHandle).push(field);
  }
  return [...byHandle.entries()].map(([entityHandle, rows]) => {
    const id = Number(rows.find(field => field.fieldName === "id")?.defaultValue);
    const writable = rows.filter(field => !field.readOnly && field.fieldName !== "mountable_slots");
    const record = document.records.find(row => Number(row.id) === id);
    return {
      id: entityHandle,
      label: `${record?.name || "物品"} · ${entityHandle}`,
      fragmentIds: [...new Set(rows.map(field => field.fragmentId).filter(Boolean))],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: [entityHandle],
        ...(rows.some(field => field.fieldName === "mountable_slots") ? {sets: {
          mountable_slots: [["main_gun", "主炮"], ["sub_gun", "副炮"], ["special", "S-E"]],
        }} : {}),
        columns: writable.map(field => ({
          name: field.fieldName,
          label: ITEM_EDITOR_LABELS[field.fieldName] || field.fieldName,
          ...(field.fieldName === "payload_hex" ? {text: true} : {}),
          min: 0,
          max: field.fieldName === "attack_visual.visual_code" ? ITEM_ATTACK_VISUAL_CODE_MAX
            : field.bitMask === 0x07 ? 7 : field.bitMask === 0xe0 ? 224 : 255,
          ...(field.fieldName === "equipment.role_mask" ? {step: 32} : {}),
          ...(field.fieldName === "attack_visual.visual_code" ? {visualMask: 0x7f} : {}),
          ...(field.fieldName === "attack_visual.visual_code" ? {
            semantic: {kind: "reference", targetModule: "attack-visual"},
            candidates: {resourceId: "attack-visual", documentPath: ["records"],
              value: ["id"], label: ["handle"]},
          } : {}),
          ...(["price.raw_code", "attack.raw_code", "defense.raw_code"].includes(field.fieldName)
            ? {candidates: {resourceId: "item-entry", documentPath: ["equipment_editor", "numeric_codes"],
              ...(field.fieldName === "price.raw_code" ? {} : {filter: {path: ["available"], values: [true]}}),
              value: ["raw_code"], label: ["value", "raw_code_hex"]}} : {}),
          ...(field.fieldName === "equipment.target_scope.bits"
            ? {candidates: {resourceId: "item-entry", documentPath: ["equipment_editor", "attack_target_scopes"],
              value: ["bits"], label: ["label", "bits_hex"]}} : {}),
          ...(field.fieldName === "equipment.battle_effect_code"
            ? {candidates: {resourceId: "item-entry", documentPath: ["equipment_editor", "core_battle_effect_codes"],
              value: [], label: []}} : {}),
          ...(field.fieldName === "equipment.role_mask"
            ? {semantic: {kind: "bit-labels"}, bits: {resourceId: "item-entry", documentPath: ["equipment_editor", "human_roles"],
              value: ["mask"], label: ["name"]}} : {}),
        }))},
    };
  });
}

function itemFieldByte(field, selected) {
  const sameByte = selected.filter(candidate => fieldFragmentId(candidate) === fieldFragmentId(field)
    && fieldOffsetInFragment(candidate) === fieldOffsetInFragment(field) && fieldByteLength(candidate) === 1);
  if (fieldFragmentId(field) === "item-entry.equipment-flags") {
    const take = name => {
      const candidate = sameByte.find(row => row.fieldName === name);
      if (!candidate) throw new GameDataEncodingError(`item equipment field missing ${name}`);
      return fieldRomValue(candidate);
    };
    const id = field.recordId;
    const effect = editorInteger(take("equipment.battle_effect_code"), "item effect code", 0, 7);
    const upper = id <= 0x40
      ? editorInteger(take("equipment.role_mask"), "item role mask", 0, 0xe0)
      : weaponMountableSlotsMask(take("mountable_slots"));
    const middle = id >= ITEM_ATTACK_FIRST
      ? editorInteger(take("equipment.target_scope.bits"), "item target scope", 0, ITEM_ATTACK_TARGET_SCOPE_MASK)
      : editorInteger(take("equipment.unresolved_bits"), "item unresolved bits", 0, 0xff)
        & ITEM_ATTACK_TARGET_SCOPE_MASK;
    if (id >= ITEM_ATTACK_FIRST && !ITEM_ATTACK_TARGET_SCOPE_BITS.has(middle))
      throw new GameDataEncodingError("item target scope is invalid");
    return new Uint8Array([upper | middle | effect]);
  }
  if (!field.bitMask) {
    if (!Number.isInteger(field.value) || field.value < 0 || field.value > 0xff)
      throw new GameDataEncodingError(`item field ${field.fieldName} must be a byte`);
    return new Uint8Array([field.value]);
  }
  let value = 0;
  for (const candidate of sameByte) {
    const candidateValue = fieldRomValue(candidate);
    const part = candidate.fieldName === "mountable_slots"
      ? weaponMountableSlotsMask(candidateValue) : candidateValue;
    if (!Number.isInteger(part) || part < 0 || part > 0xff)
      throw new GameDataEncodingError(`item field ${candidate.fieldName} must be a byte`);
    value = (value & ~candidate.bitMask) | (part & candidate.bitMask);
  }
  return new Uint8Array([value]);
}

export function serializeItemField(field, selected) {
  if (!fieldFragmentId(field) || fieldByteLength(field) !== 1) {
    throw new GameDataEncodingError(`item field ${field.fieldName} is not a writable byte`);
  }
  return itemFieldByte(field, selected);
}

function validateItemAsset(asset, original) {
  if (asset?.resource_id !== ITEM_FIELD_RESOURCE || original?.resource_id !== ITEM_FIELD_RESOURCE
      || asset.schema !== ASSET_SCHEMAS[ITEM_FIELD_RESOURCE] || original.schema !== asset.schema)
    throw new GameDataEncodingError("item asset identity changed");
  itemFieldDescriptions(asset.document, {asset});
  const expected = structuredClone(original);
  for (const field of itemFieldDescriptions(original.document, {asset: original})) {
    const path = field.assetPath ?? ["document", ...field.documentPath];
    const value = path.reduce((node, key) => node?.[key], asset);
    if (field.readOnly && !canonicalJsonEqual(value, field.defaultValue))
      throw new GameDataEncodingError(`item-entry read-only field changed: ${field.fieldName}`);
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] = structuredClone(value);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new GameDataEncodingError("item-entry only published item fields may change");
}

export function validateItemFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, itemFieldDescriptions, validateItemAsset);
}

/** Numeric labels read the same code field, so saved drafts compare against its current value. */
export function projectItemFieldView(document) {
  const hex = value => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
  const derive = (target, key, get) => Object.defineProperty(target, key, {enumerable: true, get});
  const byCode = new Map(document.equipment_editor.numeric_codes.map(option => [option.raw_code, option]));
  for (const row of document.records) {
    for (const name of ["price", "attack", "defense"]) {
      const value = row[name];
      if (!value) continue;
      for (const key of ["value", "available", "raw_code_hex"]) Object.defineProperty(value, key, {
        enumerable: true, get() {
          const option = byCode.get(value.raw_code);
          if (!option) throw new GameDataEncodingError(`item-entry 缺少数值码 ${value.raw_code}`);
          return option[key];
        },
      });
    }
    if (row.tank_weight) {
      derive(row.tank_weight, "tons", () => row.tank_weight.raw / 10);
      derive(row.tank_weight, "internal_units", () => row.tank_weight.raw * 10);
    }
    if (row.engine_capacity) {
      derive(row.engine_capacity, "tons", () => row.engine_capacity.raw);
      derive(row.engine_capacity, "internal_units", () => row.engine_capacity.raw * 100);
    }
    if (row.equipment) {
      const equipment = row.equipment;
      const flags = () => {
        const upper = row.id <= 0x40 ? equipment.role_mask : weaponMountableSlotsMask(row.mountable_slots);
        const middle = row.id >= ITEM_ATTACK_FIRST ? equipment.target_scope.bits
          : equipment.unresolved_bits & ITEM_ATTACK_TARGET_SCOPE_MASK;
        return (equipment.raw_flags & ~(0x07 | 0xe0 | ITEM_ATTACK_TARGET_SCOPE_MASK))
          | upper | middle | equipment.battle_effect_code;
      };
      row.equipment = Object.defineProperties({}, {
        ...Object.getOwnPropertyDescriptors(equipment),
        raw_flags: {enumerable: true, get: flags},
        raw_flags_hex: {enumerable: true, get: () => hex(flags())},
      });
      derive(row.equipment, "roles", () => document.equipment_editor.human_roles
        .filter(role => (row.equipment.role_mask || 0) & role.mask));
      if (equipment.target_scope) {
        const scope = equipment.target_scope;
        for (const key of ["id", "label", "marker_tile", "bits_hex", "marker_tile_hex"]) {
          derive(scope, key, () => document.equipment_editor.attack_target_scopes
            .find(option => option.bits === scope.bits)?.[key]);
        }
      }
    }
    if (row.attack_visual) {
      derive(row.attack_visual, "visual_code_hex", () => hex(row.attack_visual.visual_code));
      derive(row.attack_visual, "resource_id", () => `attack-visual:${hex(row.attack_visual.visual_code).slice(2)}`);
    }
  }
}

export function encodeItemFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    if (!fieldFragmentId(field) && field.readOnly) continue;
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== ITEM_FIELD_RESOURCE || values.has(key))
      throw new GameDataEncodingError("item field identity duplicated or foreign");
    values.set(key, fieldRomValue(field, {defaults}));
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new GameDataEncodingError(`item field missing ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const specs = gameDataComponentSpecs(ITEM_FIELD_RESOURCE);
  const payloads = new Map(specs.map(spec => [spec.fragmentId, new Uint8Array(spec.length)]));
  const valuesOpaque = bytesFromHex(take("item-entry.equipment-values", "payload_hex"), "items equipment values");
  if (valuesOpaque.length !== 0xc5) throw new GameDataEncodingError("items equipment values length changed");
  payloads.get("item-entry.equipment-values").set(valuesOpaque);
  for (let id = 0; id < ITEM_COUNT; id += 1) {
    const handle = itemHandle(id);
    payloads.get("item-entry.price-codes")[id] = editorInteger(
      take(handle, "price.raw_code"), "item price", 0, 0xff,
    );
    if (id >= 0x01 && id <= 0x22) {
      payloads.get("item-entry.equipment-values")[id] = editorInteger(
        take(handle, "defense.raw_code"), "item defense", 0, 0xff,
      );
    } else if (id >= ITEM_ATTACK_FIRST && id <= ITEM_ATTACK_LAST) {
      payloads.get("item-entry.equipment-values")[id] = editorInteger(
        take(handle, "attack.raw_code"), "item attack", 0, 0xff,
      );
    }
    if (id >= 0x41 && id <= 0x90) {
      payloads.get("item-entry.equipment-values")[id + 0x34] = editorInteger(
        take(handle, "defense.raw_code"), "tank defense", 0, 0xff,
      );
      payloads.get("item-entry.tank-weight")[id - 0x41] = editorInteger(
        take(handle, "tank_weight.raw"), "item tank weight", 0, 0xff,
      );
    }
    if (id >= 0x79 && id <= 0x90)
      payloads.get("item-entry.engine-capacity")[id - 0x79] = editorInteger(
        take(handle, "engine_capacity.raw"), "item engine capacity", 0, 0xff,
      );
    if (id <= ITEM_ATTACK_LAST) {
      const rawFlags = editorInteger(take(handle, "equipment.raw_flags"), "item raw flags", 0, 0xff);
      const unresolved = editorInteger(take(handle, "equipment.unresolved_bits"), "item unresolved bits", 0, 0xff);
      const effect = editorInteger(take(handle, "equipment.battle_effect_code"), "item effect code", 0, 7);
      const upper = id <= 0x40
        ? editorInteger(take(handle, "equipment.role_mask"), "item role mask", 0, 0xe0)
        : weaponMountableSlotsMask(take(handle, "mountable_slots"));
      const middle = id >= ITEM_ATTACK_FIRST
        ? editorInteger(take(handle, "equipment.target_scope.bits"), "item target scope", 0, ITEM_ATTACK_TARGET_SCOPE_MASK)
        : unresolved & ITEM_ATTACK_TARGET_SCOPE_MASK;
      if (id >= ITEM_ATTACK_FIRST && !ITEM_ATTACK_TARGET_SCOPE_BITS.has(middle))
        throw new GameDataEncodingError("item target scope is invalid");
      const known = 0x07 | 0xe0 | ITEM_ATTACK_TARGET_SCOPE_MASK;
      payloads.get("item-entry.equipment-flags")[id] = (rawFlags & ~known) | effect | upper | middle;
    }
    if (id >= ITEM_ATTACK_FIRST && id <= ITEM_ATTACK_LAST)
      payloads.get("item-entry.attack-visual-codes")[id - ITEM_ATTACK_FIRST] = editorInteger(
        take(handle, "attack_visual.visual_code"), "item attack visual", 0, ITEM_ATTACK_VISUAL_CODE_MAX,
      );
  }
  const codebook = bytesFromHex(take("item-entry.numeric-codebook", "payload_hex"), "items numeric codebook");
  if (codebook.length !== ITEM_NUMERIC_CODEBOOK_BYTES)
    throw new GameDataEncodingError("items numeric codebook length changed");
  payloads.get("item-entry.numeric-codebook").set(codebook);
  if (values.size) throw new GameDataEncodingError("item build fields incomplete or unknown");
  return specs.map(spec => ({fragment_id: spec.fragmentId, payload: payloads.get(spec.fragmentId), relocations: []}));
}

export async function gameDataAssetInputSha256(asset) {
  return sha256Hex(new TextEncoder().encode(gameDataAssetCanonicalJson(
    gameDataRomInput(asset),
  )));
}

/** Every field in the validated semantic asset now belongs to the ROM build. */
function gameDataRomInput(asset) {
  requireObject(asset, "game-data asset");
  return asset;
}

function gameDataAssetCanonicalJson(asset) {
  return stableJson(asset);
}

// Python canonical_json_bytes sorts object keys lexicographically. Building a
// temporary JavaScript object and then JSON.stringify-ing it is insufficient:
// ECMAScript reorders integer-looking keys numerically during enumeration.
// Rendering recursively avoids that observable mismatch for lookup maps in
// item and vehicle documents.
const PYTHON_FLOAT_FIELDS = new Set([
  "engine_capacity_tons",
  "equipment_tons",
  "remaining_tons",
  "total_tons",
]);

function stableJson(value, fieldName = null, parentFieldName = null) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new GameDataEncodingError("canonical JSON number is not finite");
    }
    const normalized = Object.is(value, -0) ? 0 : value;
    const rendered = JSON.stringify(normalized);
    // JSON.parse erases the lexical distinction between Python's 4 and 4.0.
    // These schema-defined derived weight fields are floats in mm_data.py, so
    // retain Python's canonical trailing .0 when their value is integral.
    const schemaFloat = PYTHON_FLOAT_FIELDS.has(fieldName) ||
      (fieldName === "tons" &&
        (parentFieldName === "tank_weight" || parentFieldName === "chassis_weight"));
    return schemaFloat && Number.isInteger(normalized)
      ? `${rendered}.0` : rendered;
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableJson(item, fieldName, parentFieldName)).join(",")}]`;
  }
  if (!plainObject(value)) {
    throw new GameDataEncodingError("asset value is not canonical JSON");
  }
  return `{${Object.keys(value).sort().map(key => {
    if (value[key] === undefined) {
      throw new GameDataEncodingError(`canonical JSON field ${key} is undefined`);
    }
    return `${JSON.stringify(key)}:${stableJson(value[key], key, fieldName)}`;
  }).join(",")}}`;
}
