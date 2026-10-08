// @editor-module 应用配置族起始指针：每个 XX 资源的一对高低字节构成一个 u16 指针，
// 指向已发布的应用配置实例。写入许可未发布，构建保留 Original。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

const APPLICATION_CONFIG_FAMILY_OWNER = "application-config-family";
const APPLICATION_CONFIG_FAMILY_COMPILER_ID = "application-config-family/v1";
/** 低字节在前：一个族资源就是一个小端 u16 指针。 */
const APPLICATION_CONFIG_FAMILY_FIELDS = Object.freeze([
  "configuration_pointer_low",
  "configuration_pointer_high",
]);
export const APPLICATION_CONFIG_FAMILY_RESOURCE_IDS = Object.freeze(
  Array.from({length: 16}, (_, index) => `${APPLICATION_CONFIG_FAMILY_OWNER}:${
    index.toString(16).toUpperCase().padStart(2, "0")}`),
);

/** 候选是已发布的应用配置实例；指针值就是它的 CPU 地址。 */
const CANDIDATE_SOURCE = Object.freeze({
  document: "project.facilities",
  documentPath: Object.freeze(["configuration_loader", "pointer_entries"]),
  value: Object.freeze(["target_cpu"]),
  label: Object.freeze(["label", "target_cpu_hex"]),
});

const require = (condition, message) => {if (!condition) throw new TypeError(message);};

function byteValue(value, label) {
  require(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} 必须是 u8`);
  return value;
}

function resourceIdOf(document, asset) {
  const resourceId = asset?.resource_id ?? document?.resource_id;
  require(APPLICATION_CONFIG_FAMILY_RESOURCE_IDS.includes(resourceId),
    `${APPLICATION_CONFIG_FAMILY_OWNER} 资源身份无效：${resourceId ?? "（空）"}`);
  return resourceId;
}

function familyLabel(document, resourceId) {
  const family = document?.family_id_hex ?? resourceId.slice(APPLICATION_CONFIG_FAMILY_OWNER.length + 1);
  const label = typeof document?.label === "string" && document.label ? ` · ${document.label}` : "";
  return `应用配置族 0x${String(family).replace(/^0x/u, "")}${label}`;
}

function applicationConfigFamilyFieldDescriptions(document, {asset} = {}) {
  const resourceId = resourceIdOf(document, asset);
  const pointerAddress = document?.pointer_address;
  require(pointerAddress?.space === "prg" && Number.isSafeInteger(pointerAddress.offset)
    && pointerAddress.length === 2
    && pointerAddress.end_exclusive === pointerAddress.offset + 2,
  `${resourceId} 缺少已发布的指针物理位置`);
  return APPLICATION_CONFIG_FAMILY_FIELDS.map((fieldName, index) => ({
    resourceId, entityHandle: resourceId, fieldName, writeback: ROM_WRITE_PENDING,
    documentPath: [fieldName],
    defaultValue: byteValue(document?.[fieldName], `${resourceId}.${fieldName}`),
    publishedAddress: {space: "prg", offset: pointerAddress.offset + index,
      length: 1, end_exclusive: pointerAddress.offset + index + 1},
  }));
}

function applicationConfigFamilyObjects(document, {asset} = {}) {
  const resourceId = resourceIdOf(document, asset);
  const label = familyLabel(document, resourceId);
  return [{
    id: resourceId,
    label,
    fragmentIds: [],
    fields: APPLICATION_CONFIG_FAMILY_FIELDS.map(fieldName => [resourceId, fieldName]),
    editor: {kind: "numeric-table", rows: [resourceId], rowLabels: [label],
      columns: [{name: "configuration_pointer", label: "配置族起始指针",
        candidates: CANDIDATE_SOURCE,
        linked: {fields: [...APPLICATION_CONFIG_FAMILY_FIELDS], littleEndian: true}}]},
  }];
}

/**
 * 发布正文把指针的 CPU 地址另存一份 `target_cpu`；它以高低字节为准，编辑后按字节重算，
 * 因此它不是字段，只在这一处投影出来。
 */
function projectApplicationConfigFamilyView(document) {
  if (!document) return;
  const pointer = (byteValue(document.configuration_pointer_high, "配置族指针高字节") * 0x100)
    + byteValue(document.configuration_pointer_low, "配置族指针低字节");
  if (Object.hasOwn(document, "target_cpu")) document.target_cpu = pointer;
  if (Object.hasOwn(document, "target_cpu_hex")) {
    document.target_cpu_hex = `0x${pointer.toString(16).toUpperCase().padStart(4, "0")}`;
  }
}

function serializeApplicationConfigFamilyField(field) {
  require(field?.resourceId === field?.entityHandle
    && APPLICATION_CONFIG_FAMILY_FIELDS.includes(field?.fieldName),
  `${APPLICATION_CONFIG_FAMILY_OWNER} 字段身份无效`);
  return new Uint8Array([byteValue(field.value, `${field.resourceId}.${field.fieldName}`)]);
}

function validateApplicationConfigFamilyAsset(asset, original) {
  const resourceId = resourceIdOf(original?.document, original);
  if (asset?.resource_id !== original.resource_id) {
    throw new TypeError(`${resourceId} 编辑改变了资源身份`);
  }
  const expected = structuredClone(original);
  for (const fieldName of APPLICATION_CONFIG_FAMILY_FIELDS) {
    expected.document[fieldName] = byteValue(asset.document?.[fieldName], `${resourceId}.${fieldName}`);
  }
  require(canonicalJsonEqual(asset, expected),
    `${resourceId} 只允许修改配置族起始指针，身份与证据不可修改`);
}

function validateApplicationConfigFamilyFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, applicationConfigFamilyFieldDescriptions,
    validateApplicationConfigFamilyAsset);
}

export function applicationConfigFamilyFieldOwner(resourceId) {
  require(APPLICATION_CONFIG_FAMILY_RESOURCE_IDS.includes(resourceId),
    `${APPLICATION_CONFIG_FAMILY_OWNER} 资源身份无效：${resourceId ?? "（空）"}`);
  return Object.freeze({
    compilerId: APPLICATION_CONFIG_FAMILY_COMPILER_ID,
    describe: applicationConfigFamilyFieldDescriptions,
    validate: validateApplicationConfigFamilyFieldOverrides,
    // 物理位置未发布：没有片段可编码，构建只保留 Original。
    encode: () => [],
    objects: applicationConfigFamilyObjects,
    objectCount: () => 1,
    projectView: projectApplicationConfigFamilyView,
    serializeField: serializeApplicationConfigFamilyField,
    documentView: true,
    legacyClosed: true,
  });
}
