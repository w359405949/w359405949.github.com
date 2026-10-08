// @editor-module 校验特殊取得音效的六项物品引用，编码为逻辑片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const ACQUISITION_AUDIO_ITEMS_COMPILER_ID = "acquisition-audio-items/v1";
export const ACQUISITION_AUDIO_ITEMS_COMPONENT_CODEC = "metalmaxcn.acquisition-audio-items";
const OWNER = "item-acquisition-service";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function acquisitionAudioItemsComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown acquisition-audio owner");
  return [{fragmentId: `${OWNER}.special-audio-item-ids`, length: 6}];
}
export function acquisitionAudioItemsAssetSchema(resourceId) {
  acquisitionAudioItemsComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateAcquisitionAudioItemsAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === acquisitionAudioItemsAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === acquisitionAudioItemsAssetSchema(OWNER), "acquisition-audio identity/policy drift");
    requireValue(doc.record_count === 6 && Array.isArray(doc.records) && doc.records.length === 6,
      "expected six acquisition items");
    const ids = doc.records.map(row => {
      const match = typeof row.item_reference === "string" && /^human-item:([0-9A-F]{2})$/u.exec(row.item_reference);
      requireValue(match, "必须选择人物物品");
      const id = Number.parseInt(match[1], 16);
      requireValue(id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)), "invalid human-item identity");
      return id;
    });
    requireValue(new Set(ids).size === 6, "六项取得音效物品不能重复");
  }
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    expected.document.records[index].item_reference = row.item_reference;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改物品引用，固定音频命令与源地址不能修改");
}

const HANDLE = `${OWNER}:special-audio-items`;
export function acquisitionAudioItemsFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document.records?.length === 6, "acquisition field collection drift");
  return [{resourceId: OWNER, entityHandle: HANDLE, fieldName: "records", documentPath: ["records"],
    defaultValue: document.records, resetLabel: "特殊取得音效物品名单（全部 6 项）",
    fragmentId: acquisitionAudioItemsComponentSpecs(OWNER)[0].fragmentId, offsetInFragment: 0, byteLength: 6}];
}
export function validateAcquisitionAudioItemsFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, acquisitionAudioItemsFieldDescriptions, validateAcquisitionAudioItemsAsset);
}

/** 物品候选：控件候选与写入校验共用这一份声明。 */
const ITEM_CANDIDATE_SOURCE = Object.freeze({resourceId: "item-entry", documentPath: ["records"],
  filter: {path: ["category", "owner"], values: ["human"]},
  value: {path: ["id"], hex: 2, prefix: "human-item:"}, label: ["id_hex", "name"]});

/** 六项物品是一个值：六个位置只是这一列的投影。 */
export function acquisitionAudioItemsObjects() {
  const fragmentId = acquisitionAudioItemsComponentSpecs(OWNER)[0].fragmentId;
  return [{id: fragmentId, label: "特殊取得音效物品", fragmentIds: [fragmentId],
    fields: [[HANDLE, "records"]],
    editor: {kind: "reference-table",
      rows: Array.from({length: 6}, (_, slot) => ({handle: HANDLE, element: slot})),
      rowLabels: Array.from({length: 6}, (_, slot) => `取得 ${slot + 1}`),
      columns: [{name: "records", label: "物品引用", element: {path: ["item_reference"]},
        semantic: {kind: "reference", targetModule: "item-entry"},
        candidates: ITEM_CANDIDATE_SOURCE}]}}];
}

/** 写入校验与控件候选同源：整段是一张表，按 elementPath 逐条比。 */
export function acquisitionAudioItemsReferenceRule(field) {
  return field?.fieldName === "records"
    ? {source: ITEM_CANDIDATE_SOURCE, elementPath: ["item_reference"]} : null;
}

function acquisitionItemIds(records) {
  requireValue(Array.isArray(records) && records.length === 6, "expected six acquisition field references");
  const seen = new Set();
  return records.map((row, slot) => {
    const match = typeof row?.item_reference === "string" && /^human-item:([0-9A-F]{2})$/u.exec(row.item_reference);
    const id = match && Number.parseInt(match[1], 16);
    requireValue(match && id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)) && !seen.has(id),
      "invalid or duplicate acquisition item");
    seen.add(id);
    return id;
  });
}

export function serializeAcquisitionAudioItemField(field) {
  requireValue(field?.resourceId === OWNER && field.entityHandle === HANDLE && field.fieldName === "records",
    "acquisition build field identity drift");
  return Uint8Array.from(acquisitionItemIds(field.value));
}

export function validateAcquisitionAudioItemsPreimage(fields, fragmentId, baseline) {
  requireValue(fragmentId === acquisitionAudioItemsComponentSpecs(OWNER)[0].fragmentId && fields.length === 1
    && baseline.length === 6, "acquisition Origin table identity/length drift");
  acquisitionItemIds(fields[0].defaultValue).forEach((id, slot) => requireValue(id === baseline[slot],
    "acquisition Origin differs from bound baseline"));
}
export function encodeAcquisitionAudioItemsFields(fields, {defaults = false} = {}) {
  requireValue(fields.length === 1 && fields[0].resourceId === OWNER
    && fields[0].entityHandle === HANDLE && fields[0].fieldName === "records", "acquisition build field identity drift");
  const records = defaults ? fields[0].defaultValue : fields[0].value, seen = new Set();
  requireValue(Array.isArray(records) && records.length === 6, "expected six acquisition field references");
  const payload = Uint8Array.from(records, row => {
    const match = typeof row?.item_reference === "string" && /^human-item:([0-9A-F]{2})$/u.exec(row.item_reference);
    const id = match && Number.parseInt(match[1], 16);
    requireValue(match && id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)) && !seen.has(id),
      "invalid or duplicate acquisition item");
    seen.add(id); return id;
  });
  return [{fragment_id: acquisitionAudioItemsComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}
