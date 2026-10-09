import { registerModuleComponent, esc, resourceLabel, itemResourceUid, recordUid, audioCommandLabel, currentTextReference } from './element-tree-DsgOBeTK.js';
import { db } from './battle-result-script-runtime-B_EClFew.js';
import { labeledBitmaskMarkup } from './rectangle-preset-controls-vTa_haKM.js';
import { facilityConfigurationSummaryContext, facilityConfigurationLabel } from './configuration-summary-NWu3_nCt.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup } from './scene-elevators-N46oPTJC.js';

// @editor-module 设施配置实例与传送终端配置的引用供给

const FACILITY_CONFIGURATION_MODULE_ID = "facility-config";
const FACILITY_DIRECTORY_DOCUMENT_ID = "project.facilities";
const FACILITY_CONFIGURATION_DOCUMENT_ID = "facility-config";
const INSTANCE_PREFIX = "application-config-instance";
const TELEPORT_HANDLE = "facility-config:teleport-terminal";

function teleportSaveDestinationMarkup({
  name, fieldId, active, dirty = false, control = "facility", componentAttributes = "",
} = {}) {
  const attribute = control === "save" ? "data-save-page-field" : "data-teleport-save-field";
  return labeledBitmaskMarkup({
    choices: [{value: fieldId, label: name}], active: () => active,
    inputAttributes: () => `${attribute}="${esc(fieldId)}" aria-label="${esc(name)}本存档开启状态"`,
    rootAttributes: componentAttributes,
    className: `labeled-bitmask-row${dirty ? " is-dirty" : ""}`,
  });
}

registerModuleComponent(FACILITY_CONFIGURATION_MODULE_ID, "save-destination", {
  render: teleportSaveDestinationMarkup,
});

function byteId(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function hexByte(value) {
  const id = byteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function instanceHandle(familyId, recordId) {
  const family = byteId(familyId);
  const record = byteId(recordId);
  return family === null || record === null
    ? "" : `${INSTANCE_PREFIX}:${hexByte(family)}:${hexByte(record)}`;
}

function configurationHandle(entry) {
  const direct = String(entry?.handle || entry?.uid || "").trim();
  if (direct === TELEPORT_HANDLE) return TELEPORT_HANDLE;
  if (/^application-config-instance:[0-9a-f]{2}:[0-9a-f]{2}$/iu.test(direct)) {
    const [, family, record] = direct.split(":");
    return instanceHandle(Number.parseInt(family, 16), Number.parseInt(record, 16));
  }
  return instanceHandle(entry?.family_id, entry?.id ?? entry?.record_id);
}

function requestedHandle({entry = null, handle = "", value = ""} = {}) {
  return configurationHandle(entry)
    || configurationHandle({handle: String(handle || value || "").trim()});
}

function semanticStatusLabel(status) {
  return ({
    "confirmed-purpose": "用途已确认",
    "purpose-inferred": "用途推定",
    "structure-confirmed-purpose-unknown": "结构已确认、用途待定",
  })[String(status || "")] || String(status || "语义状态未定");
}

function namespaceLabel(entry) {
  const namespace = String(entry?.value_namespace?.namespace || "unknown");
  const count = Array.isArray(entry?.values) ? entry.values.length : null;
  const unit = ({
    item: "道具 ID",
    shell: "炮弹 ID",
    "service-goods": String(entry?.value_namespace?.goods_label || "服务项"),
    "vehicle-preset": "出租车型",
    unknown: "原始值",
  })[namespace] || namespace;
  return count === null ? unit : `${count} 个${unit}`;
}

function valueSummary(entry, full = false) {
  const values = Array.isArray(entry?.values) ? entry.values : [];
  if (!values.length) return "当前记录没有负载值";
  const namespace = entry?.value_namespace?.namespace;
  const shown = (full ? values : values.slice(0, 8)).map(value => {
    if (namespace === "item") return resourceLabel(itemResourceUid(value));
    if (namespace === "shell") return resourceLabel(recordUid("shell-record", value));
    if (entry.family_id === 0x0A) return audioCommandLabel(value);
    const good = entry?.value_namespace?.goods?.find(good => Number(good.value) === value);
    return currentTextReference(good?.text_record || good?.resource_uid).label || good?.label || `$${hexByte(value)}`;
  });
  return `${shown.join(" ")}${values.length > shown.length ? " …" : ""}`;
}

function teleportSummary(entry) {
  const instances = Number(entry?.instances?.length);
  const destinations = Number(entry?.configuration?.destination_count);
  return [
    Number.isInteger(instances) ? `${instances} 个场景布点` : "",
    Number.isInteger(destinations) ? `${destinations} 个目的地` : "",
    entry?.investigation_command_id_hex
      ? `调查命令 ${String(entry.investigation_command_id_hex).replace(/^0x/iu, "$")}` : "",
  ].filter(Boolean).join(" · ");
}

function configurationPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  full = false,
} = {}) {
  const identity = requestedHandle({entry, handle, value});
  if (!identity) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>设施配置引用未解析</small></span>`;
  }
  if (identity === TELEPORT_HANDLE) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>${esc(String(entry?.label || "时空隧道传送终端"))}</b>
      <small>${esc(entry ? teleportSummary(entry) : identity)}</small>
    </span>`;
  }
  const label = String(entry?.label || identity);
  const summary = entry
    ? `${namespaceLabel(entry)} · ${valueSummary(entry, full)}` : identity;
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(label)}</b><small>${esc(summary)}</small>
  </span>`;
}

function configurationReferenceItem(entry) {
  const identity = configurationHandle(entry);
  if (!identity) return null;
  if (identity === TELEPORT_HANDLE) {
    const label = String(entry?.label || "时空隧道传送终端");
    const summary = teleportSummary(entry);
    return {
      value: identity,
      label,
      description: "固定传送终端配置",
      meta: summary,
      preview: configurationPreviewMarkup({entry}),
      filter: [identity, label, summary, entry?.kind, entry?.semantic_status]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  }
  const label = String(entry?.label || identity);
  const namespace = namespaceLabel(entry);
  const status = semanticStatusLabel(entry?.semantic_status);
  return {
    value: identity,
    label,
    description: `${namespace} · ${status}`,
    meta: valueSummary(entry),
    preview: configurationPreviewMarkup({entry}),
    filter: [identity, entry?.family_id, hexByte(entry?.family_id), entry?.id,
      hexByte(entry?.id), label, namespace, status, entry?.kind, entry?.record_payload,
      valueSummary(entry)].filter(Boolean).join(" ").toLowerCase(),
  };
}

function currentConfigurationMaps(documentValue) {
  const records = new Map((documentValue?.records || []).map(record => [record.id, record]));
  const families = new Map((documentValue?.families || []).map(family => [
    byteId(family?.id),
    new Map((family?.records || []).map(record => [byteId(record?.id), record?.record_id])),
  ]));
  return {records, families};
}

function configurationInstanceEntries(directory, documentValue) {
  const pointerEntries = directory?.configuration_loader?.pointer_entries;
  if (!Array.isArray(pointerEntries)) {
    throw new TypeError(`${FACILITY_DIRECTORY_DOCUMENT_ID} 缺少 configuration_loader.pointer_entries`);
  }
  const {records: currentRecords, families: currentFamilies} = currentConfigurationMaps(
    documentValue,
  );
  return pointerEntries.flatMap(family => {
    const familyId = byteId(family?.family_id);
    if (familyId === null || !Array.isArray(family?.records)) {
      throw new TypeError(`${FACILITY_DIRECTORY_DOCUMENT_ID} 的配置族身份无效`);
    }
    const currentFamily = currentFamilies.get(familyId);
    if (!currentFamily) {
      throw new TypeError(`${FACILITY_CONFIGURATION_DOCUMENT_ID} 缺少配置族 $${hexByte(familyId)}`);
    }
    return family.records.map(record => {
      const recordId = byteId(record?.id);
      if (recordId === null) {
        throw new TypeError(`配置族 $${hexByte(familyId)} 含无效实例 ID`);
      }
      const canonicalId = currentFamily.get(recordId);
      if (typeof canonicalId !== "string" || !canonicalId) {
        throw new TypeError(`当前配置正文缺少 ${instanceHandle(familyId, recordId)}`);
      }
      const currentRecord = currentRecords.get(canonicalId);
      if (!currentRecord || !Array.isArray(currentRecord.slots)) {
        throw new TypeError(`当前配置正文缺少 canonical record ${canonicalId}`);
      }
      const values = currentRecord.slots.map((slot, slotIndex) => {
        const value = byteId(slot?.value);
        if (value === null) {
          throw new TypeError(`${canonicalId} 的槽 ${slotIndex} 不是 u8`);
        }
        return value;
      });
      return {
        ...record,
        family_id: familyId,
        id: recordId,
        handle: instanceHandle(familyId, recordId),
        kind: family?.kind,
        semantic_status: family?.semantic_status,
        record_payload: family?.record_payload,
        value_namespace: family?.value_namespace,
        canonical_record_id: canonicalId,
        payload_length: byteId(currentRecord?.payload_length) ?? byteId(record?.payload_length),
        values,
      };
    });
  });
}

function teleportConfigurationEntry(directory) {
  const teleport = (directory?.facilities || []).find(entry => entry?.id === "teleport-terminal");
  return teleport ? {...teleport, handle: TELEPORT_HANDLE} : null;
}

async function prepareFacilityConfigurationComponent(props) {
  try {
    const [directory, documentValue, summaryContext] = await Promise.all([
      db.getDocument(FACILITY_DIRECTORY_DOCUMENT_ID, null),
      db.getDocument(FACILITY_CONFIGURATION_DOCUMENT_ID, null),
      facilityConfigurationSummaryContext(),
    ]);
    if (!documentValue || !Array.isArray(documentValue.records)) {
      throw new TypeError(`${FACILITY_CONFIGURATION_DOCUMENT_ID} 缺少当前 records 正文`);
    }
    const entries = configurationInstanceEntries(directory, documentValue).map(entry => {
      const current = {...entry, summaryContext};
      return {...current, label: facilityConfigurationLabel(current)};
    });
    const teleport = teleportConfigurationEntry(directory);
    if (!teleport) {
      throw new TypeError(`${FACILITY_DIRECTORY_DOCUMENT_ID} 缺少 teleport-terminal 配置`);
    }
    entries.push(teleport);
    const identities = entries.map(configurationHandle);
    if (identities.some(identity => !identity) || new Set(identities).size !== entries.length) {
      throw new TypeError(`${FACILITY_CONFIGURATION_MODULE_ID} 的候选句柄为空或重复`);
    }
    const requested = requestedHandle(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => configurationHandle(entry) === requested) || null,
      error: entries.length ? "" : `${FACILITY_CONFIGURATION_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function facilityConfigurationReferencePickerMarkup({
  entries = [],
  value = null,
  label = "设施配置",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: FACILITY_CONFIGURATION_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(FACILITY_CONFIGURATION_MODULE_ID, {
  item: configurationReferenceItem,
  className: "facility-configuration-reference-field",
  filterLabel: "过滤设施配置",
  filterPlaceholder: "全局句柄／配置族／实例／用途／当前值",
});

registerModuleComponent(FACILITY_CONFIGURATION_MODULE_ID, "reference", {
  prepare: prepareFacilityConfigurationComponent,
  render: facilityConfigurationReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(FACILITY_CONFIGURATION_MODULE_ID, kind, {
    prepare: prepareFacilityConfigurationComponent,
    render: configurationPreviewMarkup,
  });
}
