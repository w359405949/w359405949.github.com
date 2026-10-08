// @editor-module 编码角色成长参数表，不决定 ROM 放置。
// Owner parameters only. Physical placement belongs to RomLinker.
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldByteLength} from "./field-codec.js";
import {CHARACTER_GROWTH_TABLE_SHAPES} from "./shared-table-shapes.js";
export const CHARACTER_GROWTH_COMPILER_ID = "character-growth/v1";
export const CHARACTER_GROWTH_COMPONENT_CODEC = "metalmaxcn.character-growth-parameter";
const OWNER = "character-growth";
const TABLES = CHARACTER_GROWTH_TABLE_SHAPES.map(([name, , count, width]) => {
  if (name === "random-growth-increment-table")
    return [name, ["random_growth_increment_tiers"], count, ["increment_tier"], width, "roll", 0];
  if (name === "experience-thresholds")
    return [name, ["experience_thresholds"], count, ["required_total_experience"], width, "current_level", 1];
  if (name === "max-hp-contributions")
    return [name, ["max_hp_contributions"], count, ["contribution"], width, "level", 0];
  const skill = name.replace("-skill-requirements", "");
  return [name, ["skill_requirement_curves", `${skill}_skill`, "requirements"], count,
    ["primary_attribute_increment", "vitality_increment"], width, "resulting_skill_level", 1];
});
const TABLE_LABELS = new Map([
  ["random-growth-increment-table", "角色成长 · 随机成长增量"],
  ["experience-thresholds", "角色成长 · 经验阈值"],
  ["max-hp-contributions", "角色成长 · 最大 HP 累加贡献"],
  ["battle-skill-requirements", "角色成长 · 战斗技能需求"],
  ["repair-skill-requirements", "角色成长 · 修理技能需求"],
  ["driving-skill-requirements", "角色成长 · 驾驶技能需求"],
]);
const COLUMN_LABELS = new Map([
  ["increment_tier", "增量"],
  ["required_total_experience", "累计经验"],
  ["contribution", "贡献"],
  ["primary_attribute_increment", "主属性增量"],
  ["vitality_increment", "体力增量"],
]);
const rowsAt = (doc, path) => path.reduce((value, key) => value?.[key], doc);
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function characterGrowthComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown character-growth owner");
  return TABLES.map(([name, , count, , width]) => ({fragmentId: `${OWNER}.${name}`, length: count * width}));
}
export function characterGrowthAssetSchema(resourceId) {
  characterGrowthComponentSpecs(resourceId);
  return "metalmaxcn.module-asset.character-growth";
}
function validateCharacterGrowthAsset(asset, original) {
  for (const candidate of [asset, original]) {
    requireValue(candidate?.resource_id === OWNER && candidate.schema === characterGrowthAssetSchema(OWNER)
      && candidate.edit_policy === "mutable", "character-growth identity/policy drift");
    const doc = candidate.document;
    requireValue(doc?.module_id === OWNER && doc.schema === characterGrowthAssetSchema(OWNER)
      && doc.record_count === TABLES.reduce((sum, table) => sum + table[2], 0), "character-growth document identity/count drift");
    for (const [name, path, count, fields, width, identity, first] of TABLES) {
      const rows = rowsAt(doc, path);
      requireValue(Array.isArray(rows) && rows.length === count, `${name}: record count drift`);
      rows.forEach((row, index) => {
        requireValue(row[identity] === index + first, `${name}: identity/order drift`);
        for (const field of fields) {
          const maximum = fields.length === 2 ? 15 : 2 ** (width * 8) - 1;
          requireValue(Number.isInteger(row[field]) && row[field] >= 0 && row[field] <= maximum,
            `${name}.${field}: 必须是 0..${maximum} 的整数`);
        }
        if (width === 3 && index) requireValue(row[fields[0]] >= rows[index - 1][fields[0]], "经验阈值必须非降");
      });
    }
  }
  const expected = structuredClone(original);
  for (const [, path, , fields] of TABLES) {
    rowsAt(asset.document, path).forEach((row, index) => {
      const target = rowsAt(expected.document, path)[index];
      for (const field of fields) target[field] = row[field];
    });
  }
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改人物成长参数，不能修改身份、源地址或其他证据");
}

export function characterGrowthFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER, "growth field owner drift");
  return TABLES.flatMap(([name, path, count, fields, width, identity, first]) => {
    const records = rowsAt(document, path), seen = new Set();
    requireValue(Array.isArray(records) && records.length === count, "growth field collection drift");
    return records.flatMap((row, index) => {
      const id = row[identity];
      requireValue(Number.isInteger(id) && id >= first && id < first + count && !seen.has(id), "growth field identity drift");
      seen.add(id);
      return fields.map((fieldName, column) => ({resourceId: OWNER,
        entityHandle: `${OWNER}:${name}:${identity}:${id}`, fieldName,
        documentPath: [...path, index, fieldName], defaultValue: row[fieldName],
        fragmentId: `${OWNER}.${name}`, offsetInFragment: (id - first) * width, byteLength: width,
        ...(fields.length === 2 ? {bitMask: column === 0 ? 0xf0 : 0x0f, bitShift: column === 0 ? 4 : 0,
          pairedDefaultValue: row[fields[column === 0 ? 1 : 0]]} : {}),
      }));
    });
  });
}

export function characterGrowthObjects(document) {
  const fields = characterGrowthFieldDescriptions(document);
  return TABLES.map(([name, , , names, width]) => {
    const tableFields = fields.filter(field => field.fragmentId === `${OWNER}.${name}`);
    const rows = [...new Set(tableFields.map(field => field.entityHandle))];
    return {
      id: `${OWNER}.${name}`, label: TABLE_LABELS.get(name),
      fragmentIds: [`${OWNER}.${name}`],
      fields: tableFields.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: names.length === 2 ? "bitfield-table" : "numeric-table", rows,
        columns: names.map((fieldName, index) => ({name: fieldName,
          label: COLUMN_LABELS.get(fieldName), min: 0, max: names.length === 2 ? 15 : 2 ** (width * 8) - 1,
          ...(names.length === 2 && index === 0 ? {bitMask: 0xf0, bitShift: 4} : {}),
          ...(names.length === 2 && index === 1 ? {bitMask: 0x0f, bitShift: 0} : {})}))},
    };
  });
}
export function validateCharacterGrowthFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, characterGrowthFieldDescriptions, validateCharacterGrowthAsset);
}
export function encodeCharacterGrowthFields(fields, {defaults = false} = {}) {
  const supplied = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    requireValue(field.resourceId === OWNER && !supplied.has(key), "growth build field identity duplicate/drift");
    supplied.set(key, defaults ? field.defaultValue : field.value);
  }
  const result = TABLES.map(([name, , count, names, width, identity, first]) => {
    const payload = new Uint8Array(count * width);
    let previous = 0;
    for (let row = 0; row < count; row++) {
      const values = names.map(fieldName => {
        const key = JSON.stringify([`${OWNER}:${name}:${identity}:${row + first}`, fieldName]);
        const value = supplied.get(key), maximum = names.length === 2 ? 15 : 2 ** (width * 8) - 1;
        requireValue(supplied.has(key) && Number.isInteger(value) && value >= 0 && value <= maximum,
          "growth build fields incomplete/value drift");
        supplied.delete(key); return value;
      });
      const value = names.length === 2 ? (values[0] << 4) | values[1] : values[0];
      requireValue(width !== 3 || value >= previous, "经验阈值必须非降");
      previous = value;
      for (let byte = 0; byte < width; byte++) payload[row * width + byte] = (value >>> (byte * 8)) & 255;
    }
    return {fragment_id: `${OWNER}.${name}`, payload, relocations: []};
  });
  requireValue(supplied.size === 0, "unknown growth build field");
  return result;
}

function growthFieldIdentity(field) {
  const match = new RegExp(`^${OWNER}:(.+):(\\w+):(\\d+)$`, "u").exec(field.entityHandle);
  const table = TABLES.find(row => row[0] === match?.[1]);
  requireValue(table && field.resourceId === OWNER && table[4] === fieldByteLength(field), "growth field identity drift");
  return {table, id: Number(match[3])};
}

export function serializeCharacterGrowthField(field, selected = [field]) {
  const {table, id} = growthFieldIdentity(field);
  const [, , count, names, width, identity, first] = table;
  requireValue(id >= first && id < first + count && names.includes(field.fieldName), "growth field identity drift");
  const values = new Map(selected.filter(candidate => candidate.entityHandle === field.entityHandle)
    .map(candidate => [candidate.fieldName, candidate.value]));
  for (const name of names) {
    const candidate = selected.find(item => item.entityHandle === field.entityHandle && item.fieldName === name);
    const value = candidate ? candidate.value : field.pairedDefaultValue;
    const maximum = names.length === 2 ? 15 : 2 ** (width * 8) - 1;
    requireValue(Number.isInteger(value) && value >= 0 && value <= maximum, "growth field value drift");
    values.set(name, value);
  }
  const raw = names.length === 2 ? (values.get(names[0]) << 4) | values.get(names[1]) : values.get(names[0]);
  const payload = new Uint8Array(width);
  for (let byte = 0; byte < width; byte++) payload[byte] = (raw >>> (byte * 8)) & 255;
  return payload;
}

export function validateCharacterGrowthPreimage(fields, fragmentId, baseline) {
  const table = TABLES.find(row => `${OWNER}.${row[0]}` === fragmentId);
  requireValue(table && baseline.length === table[2] * table[4] && fields.length === table[2] * table[3].length,
    "growth Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const {table: identity, id} = growthFieldIdentity(field);
    requireValue(identity === table && !seen.has(`${id}:${field.fieldName}`), "growth Origin field identity drift");
    const raw = Array.from({length: table[4]}, (_, byte) => baseline[(id - table[6]) * table[4] + byte] << (byte * 8))
      .reduce((value, part) => value | part, 0);
    const expected = table[3].length === 2 ? (field.fieldName === table[3][0] ? raw >> 4 : raw & 15) : raw;
    requireValue(expected === field.defaultValue, "character growth Origin differs from bound baseline");
    seen.add(`${id}:${field.fieldName}`);
  }
}
