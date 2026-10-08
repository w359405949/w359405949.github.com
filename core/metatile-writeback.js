// @editor-module 元图块组成与属性低两位的序列化声明。
import {fieldFragmentId, fieldOffsetInFragment} from "./field-codec.js";

export const METATILE_COMPILER_ID = "metatile-tables/v1";
export const METATILE_COMPONENT_CODEC = "metalmaxcn.metatile-tables";
export const METATILE_WRITE_PERMISSION = Object.freeze({target: "rom", state: "permitted"});

export function metatileComponentSpecs(resourceId) {
  if (resourceId === "metatile-set") return [
    {fragmentId: "metatile-set.definitions-00", length: 748},
    {fragmentId: "metatile-set.attributes-00", length: 187},
  ];
  if (resourceId === "metatile-page") return Array.from({length: 55}, (_, page) => {
    const suffix = page.toString(16).toUpperCase().padStart(2, "0");
    return [{fragmentId: `metatile-page.definitions-${suffix}`, length: 256},
      {fragmentId: `metatile-page.attributes-${suffix}`, length: 64}];
  }).flat();
  throw new TypeError("元图块字段对象身份无效");
}

export function metatileAssetSchema(resourceId) {
  metatileComponentSpecs(resourceId);
  return `metalmaxcn.semantic-owner.${resourceId}`;
}

// 属性高六位保留 Origin，Working 的调色板选择只贡献低两位。
export function metatileRomField(field, {defaults = false} = {}) {
  const value = defaults ? field.defaultValue : field.value;
  if (!field.entityHandle?.includes("attributes")) return {...field, value};
  if (!Array.isArray(value) || value.length !== field.defaultValue?.length
      || !value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255))
    throw new TypeError("元图块属性字段值无效");
  return {...field, value: value.map((byte, index) => (field.defaultValue[index] & 0xFC) | (byte & 3))};
}

export function validateMetatilePreimage(fields, fragmentId, baseline) {
  const selected = fields.filter(field => fieldFragmentId(field) === fragmentId);
  if (selected.length !== 1 || fieldOffsetInFragment(selected[0]) !== 0)
    throw new TypeError("元图块 Origin 字段身份不符");
  const bytes = selected[0].defaultValue.flat(Infinity);
  if (bytes.length !== baseline.length || bytes.some((byte, index) => byte !== baseline[index]))
    throw new TypeError("元图块 Origin 与绑定基线不符");
}
