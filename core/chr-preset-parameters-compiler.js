// @editor-module 编码共享 CHR bank 前缀与七项预设；物理写入由 linker 负责。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
import {byteTableFieldObjectCodec} from "./field-object.js";
export const CHR_PRESET_COMPILER_ID = "chr-preset-parameters/v1";
export const CHR_PRESET_COMPONENT_CODEC = "metalmaxcn.chr-preset-parameters";
const OWNER = "chr-bank-mapping-service";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function chrPresetComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown CHR preset owner");
  return [{fragmentId: `${OWNER}.two-bank-presets`, length: 18}];
}
export function chrPresetAssetSchema(resourceId) {
  chrPresetComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateChrPresetAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === chrPresetAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === chrPresetAssetSchema(OWNER), "CHR preset identity/policy drift");
    const prefix = doc.shared_chr_bank_register_0_3_prefix, pairs = doc.shared_chr_bank_register_4_5_preset_pairs;
    requireValue(Array.isArray(prefix) && prefix.length === 4 && Array.isArray(pairs) && pairs.length === 7,
      "expected four shared banks and seven preset pairs");
    requireValue(Number.isInteger(doc.chr_bank_count) && doc.chr_bank_count > 0 && doc.chr_bank_count <= 256,
      "invalid published CHR bank count");
    const banks = [...prefix];
    pairs.forEach((row, index) => {
      requireValue(row.preset_id === index && row.selector_even_offset === index * 2, "CHR preset identity/order drift");
      banks.push(row.register_4, row.register_5);
    });
    requireValue(banks.every(bank => Number.isInteger(bank) && bank >= 0 && bank < doc.chr_bank_count),
      "CHR Bank 编码必须在 ROM 的 bank 范围内");
  }
  const expected = structuredClone(original), doc = asset.document;
  expected.document.shared_chr_bank_register_0_3_prefix = structuredClone(doc.shared_chr_bank_register_0_3_prefix);
  doc.shared_chr_bank_register_4_5_preset_pairs.forEach((row, index) => {
    for (const field of ["register_4", "register_5"]) {
      expected.document.shared_chr_bank_register_4_5_preset_pairs[index][field] = row[field];
    }
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改共享 CHR 预设，身份、代码与原始证据不可修改");
}

const PREFIX = "shared_chr_bank_register_0_3_prefix", PAIRS = "shared_chr_bank_register_4_5_preset_pairs";
const identities = [
  ...Array.from({length: 4}, (_, register) => [`${OWNER}:shared-register:${register}`, "bank"]),
  ...Array.from({length: 7}, (_, preset) => [4, 5].map(register => [`${OWNER}:preset:${preset}`, `register_${register}`])).flat(),
];
const SHARED_BANK_HANDLES = Array.from({length: 4}, (_, register) => `${OWNER}:shared-register:${register}`);
const PRESET_HANDLES = Array.from({length: 7}, (_, preset) => `${OWNER}:preset:${preset}`);
const chrPresetByteCodec = byteTableFieldObjectCodec({resourceId: OWNER,
  fragmentId: chrPresetComponentSpecs(OWNER)[0].fragmentId, fields: identities});
export const chrPresetFieldObjectCodec = Object.freeze({...chrPresetByteCodec,
  objects: () => chrPresetByteCodec.objects().map(definition => ({...definition,
    label: "共享 CHR Bank 与七项预设",
    editor: {kind: "numeric-table", rows: [...SHARED_BANK_HANDLES, ...PRESET_HANDLES],
      rowLabels: [...SHARED_BANK_HANDLES.map((_, register) => `寄存器 ${register}`),
        ...PRESET_HANDLES.map((_, preset) => `预设 ${preset}`)],
      columns: [
        {name: "bank", label: "CHR Bank 编号", rows: SHARED_BANK_HANDLES},
        {name: "register_4", label: "寄存器 4 CHR Bank 编号", rows: PRESET_HANDLES},
        {name: "register_5", label: "寄存器 5 CHR Bank 编号", rows: PRESET_HANDLES},
      ]}}))});
export function chrPresetFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document[PREFIX]?.length === 4 && document[PAIRS]?.length === 7,
    "CHR field collection drift");
  const fragmentId = chrPresetComponentSpecs(OWNER)[0].fragmentId, seen = new Set();
  return [
    ...Array.from({length: 4}, (_, register) => ({resourceId: OWNER,
      entityHandle: `${OWNER}:shared-register:${register}`, fieldName: "bank", documentPath: [PREFIX, register],
      defaultValue: document[PREFIX][register], fragmentId, offsetInFragment: register, byteLength: 1})),
    ...document[PAIRS].flatMap((row, index) => {
      requireValue(Number.isInteger(row.preset_id) && row.preset_id >= 0 && row.preset_id < 7
        && row.selector_even_offset === row.preset_id * 2 && !seen.has(row.preset_id), "CHR preset field identity drift");
      seen.add(row.preset_id);
      return [4, 5].map(register => ({resourceId: OWNER, entityHandle: `${OWNER}:preset:${row.preset_id}`,
        fieldName: `register_${register}`, documentPath: [PAIRS, index, `register_${register}`],
        defaultValue: row[`register_${register}`], fragmentId,
        offsetInFragment: 4 + row.preset_id * 2 + register - 4, byteLength: 1}));
    }),
  ];
}
export function validateChrPresetFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, chrPresetFieldDescriptions, validateChrPresetAsset);
}
export function encodeChrPresetFields(fields, {defaults = false} = {}) {
  const positions = new Map(identities.map((key, index) => [JSON.stringify(key), index]));
  const payload = new Uint8Array(18), seen = new Set();
  for (const field of fields) {
    const index = positions.get(JSON.stringify([field.entityHandle, field.fieldName]));
    const value = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === OWNER && index !== undefined && !seen.has(index)
      && Number.isInteger(value) && value >= 0 && value <= 255, "CHR build field identity/value drift");
    seen.add(index); payload[index] = value;
  }
  requireValue(seen.size === 18, "CHR build fields incomplete");
  return [{fragment_id: chrPresetComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}
