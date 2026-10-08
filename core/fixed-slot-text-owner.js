// @editor-module 定长运行时文字槽的字段对象与按槽编码。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldByteLength} from "./field-codec.js";

const FIXED_SLOT_TEXT_RESOURCE_ID = "fixed-text-slot";
const COMPONENT_PREFIX = `${FIXED_SLOT_TEXT_RESOURCE_ID}.`;

function requireSlot(condition, message) {
  if (!condition) throw new TypeError(`定长文字槽：${message}`);
}

function slotBytes(raw, length) {
  requireSlot(typeof raw === "string" && Number.isInteger(length) && length > 0,
    "槽缺少定长编码");
  const hex = raw.replaceAll(/\s/gu, "");
  requireSlot(hex.length === length * 2 && /^[0-9a-f]+$/iu.test(hex), "槽编码长度或字节无效");
  return Uint8Array.from({length}, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}

export function fixedSlotTextFieldDescriptions(document) {
  requireSlot(document?.schema === "metalmaxcn.game-data.asset.fixed-slots"
    && document.slots && typeof document.slots === "object"
    && !Array.isArray(document.slots), "文档身份无效");
  const occupied = new Set();
  return Object.entries(document.slots).map(([id, slot]) => {
    requireSlot((id.startsWith("ui-status:")
      ? /^ui-status:(?:0[0-9A-F]|1[01])$/u.test(id)
      : /^[a-z0-9][a-z0-9.:-]*$/u.test(id)) && slot?.id === id,
      `槽身份无效：${id}`);
    const {component_slug: slug, component_offset: offset, length, raw_hex: raw} = slot;
    requireSlot(typeof slug === "string" && /^[a-z0-9-]+$/u.test(slug)
      && Number.isInteger(offset) && offset >= 0, `${id} 片段位置无效`);
    slotBytes(raw, length);
    for (let byte = offset; byte < offset + length; byte += 1) {
      const key = `${slug}:${byte}`;
      requireSlot(!occupied.has(key), `${id} 与其他槽重叠`);
      occupied.add(key);
    }
    return {resourceId: FIXED_SLOT_TEXT_RESOURCE_ID,
      entityHandle: `${FIXED_SLOT_TEXT_RESOURCE_ID}:${id}`, fieldName: "raw_hex",
      recordId: id, documentPath: ["slots", id, "raw_hex"], defaultValue: raw,
      fragmentId: `${COMPONENT_PREFIX}${slug}`, offsetInFragment: offset,
      byteLength: length};
  });
}

export function fixedSlotTextObjects(document) {
  const groups = new Map();
  for (const field of fixedSlotTextFieldDescriptions(document)) {
    if (!groups.has(field.fragmentId)) groups.set(field.fragmentId, []);
    groups.get(field.fragmentId).push(field);
  }
  return [...groups].map(([fragmentId, rows]) => ({
    id: fragmentId, label: `定长文字槽 · ${fragmentId}`, fragmentIds: [fragmentId],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: rows.map(field => field.entityHandle),
      columns: [{name: "raw_hex", label: "文字编码", text: true}]},
  }));
}

export function serializeFixedSlotTextField(field) {
  requireSlot(field?.resourceId === FIXED_SLOT_TEXT_RESOURCE_ID
    && field.fieldName === "raw_hex", "字段身份无效");
  return slotBytes(field.value, fieldByteLength(field));
}

function validateFixedSlotTextAsset(candidate, original) {
  const expected = structuredClone(original);
  const fields = fixedSlotTextFieldDescriptions(original.document);
  requireSlot(candidate?.resource_id === FIXED_SLOT_TEXT_RESOURCE_ID
    && canonicalJsonEqual(Object.keys(candidate.document?.slots || {}).sort(),
      Object.keys(original.document.slots).sort()), "资源或槽集合漂移");
  for (const field of fields) {
    const id = field.recordId;
    const current = candidate.document.slots[id];
    slotBytes(current?.raw_hex, field.byteLength);
    expected.document.slots[id].raw_hex = current.raw_hex;
  }
  requireSlot(canonicalJsonEqual(candidate, expected), "只允许修改槽编码");
}

export function validateFixedSlotTextFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, fixedSlotTextFieldDescriptions,
    validateFixedSlotTextAsset);
}

export function encodeFixedSlotTextFields(fields, {defaults = false} = {}) {
  const payloads = new Map();
  const occupied = new Set();
  for (const field of fields) {
    requireSlot(field.resourceId === FIXED_SLOT_TEXT_RESOURCE_ID
      && field.fieldName === "raw_hex", "编码字段身份无效");
    const bytes = slotBytes(defaults ? field.defaultValue : field.value, field.byteLength);
    const fragmentId = field.physical?.component.fragment_id ?? field.fragmentId;
    const offset = field.physical?.offsetInFragment ?? field.offsetInFragment;
    const end = offset + bytes.length;
    requireSlot(Number.isInteger(offset) && offset >= 0 && Number.isInteger(end),
      "字段偏移无效");
    const payload = payloads.get(fragmentId) || [];
    if (payload.length < end) payload.length = end;
    bytes.forEach((byte, index) => {
      const key = `${fragmentId}:${offset + index}`;
      requireSlot(!occupied.has(key), "字段字节重叠");
      occupied.add(key);
      payload[offset + index] = byte;
    });
    payloads.set(fragmentId, payload);
  }
  return [...payloads].map(([fragment_id, bytes]) => {
    requireSlot(Array.from({length: bytes.length}, (_, index) => bytes[index])
      .every(Number.isInteger), `${fragment_id} 有未发布的空洞`);
    return {fragment_id, payload: Uint8Array.from(bytes), relocations: []};
  });
}

export function validateFixedSlotTextPreimage(fields, fragmentId, baseline) {
  for (const field of fields) {
    if ((field.physical?.component.fragment_id ?? field.fragmentId) !== fragmentId) continue;
    const offset = field.physical?.offsetInFragment ?? field.offsetInFragment;
    const bytes = slotBytes(field.defaultValue, field.byteLength);
    requireSlot(offset + bytes.length <= baseline.length
      && bytes.every((byte, index) => baseline[offset + index] === byte),
    `${field.recordId} Original 与绑定原像不同`);
  }
}
