// @editor-module encounter-zone owner 的 94 项候选与抽取摘要
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {mountFieldObjectSelect, mountFieldObjectMappedChoice, mountFieldObjectReset,
  mountFieldObjectNumber} from "../../ui/field-object-editor.js";
import {writeAccessMarker} from "../../ui/write-access-marker.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const ENCOUNTER_ZONE_MODULE_ID = "encounter-zone";
const ENCOUNTER_ZONE_DOCUMENT_ID = "scene-encounter-zone";

export async function mountEncounterZoneControls(host, object, {sharedTables}) {
  const entityHandle = object.fields[0].entityHandle;
  const choices = [
    {key: "class", label: "类别", shift: 0, values: [0, 1, 2, 3]},
    {key: "ambush", label: "伏击阈值", shift: 2, values: sharedTables.ambush_thresholds},
    {key: "meter", label: "计量初值", shift: 4, values: sharedTables.meter_initial_values},
    {key: "reserved", label: "保留位", shift: 6, values: [0, 1, 2, 3]},
  ];
  for (const choice of choices) {
    const target = host.querySelector(`[data-encounter-config-choice="${choice.key}"]`);
    if (!target) continue;
    mountFieldObjectMappedChoice(target, object, {entityHandle, fieldName: "config", label: choice.label,
      selectionValue: value => (value >> choice.shift) & 3,
      fieldValueFor: (value, current) => (current & ~(3 << choice.shift)) | (Number(value) << choice.shift),
      optionsMarkup: () => choice.values.map((value, index) =>
        `<option value="${index}">${value}</option>`).join(""),
      allowedSelection: value => /^[0-3]$/u.test(value)});
  }
  await Promise.all([...host.querySelectorAll("[data-encounter-entry-choice]")].map(async target => {
    await mountFieldObjectSelect(target, object, `entry.${target.dataset.encounterEntryChoice}`);
    const empty = target.querySelector('option[value="0"]');
    if (empty) empty.textContent = "空槽";
    const field = object.fields.find(row => row.fieldName === `entry.${target.dataset.encounterEntryChoice}`);
    if (field.writeback?.state === "unpermitted")
      target.insertAdjacentHTML("beforeend", writeAccessMarker({writebackMissing: true}));
  }));
  const resetHost = host.querySelector("[data-encounter-zone-reset]");
  if (resetHost) mountFieldObjectReset(resetHost, object);
}

export function mountEncounterWeightControls(host, object) {
  for (const target of host.querySelectorAll("[data-encounter-weight]")) {
    mountFieldObjectNumber(target, object, `weight.${target.dataset.encounterWeight}`, {reset: true});
  }
}

function zoneId(value) {
  const result = Number(value?.zone_id ?? value?.id ?? value);
  return Number.isInteger(result) && result >= 0 && result <= 0x5d ? result : null;
}

function idHex(value) {
  const id = zoneId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = zoneId(entry);
  if (direct !== null) return direct;
  const match = /^(?:encounter-zone|scene-encounter-zone):([0-9a-f]{1,2})$/iu.exec(
    String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : zoneId(value);
}

function zoneSummary(entry) {
  if (entry?.rolls_encounters === false) return "不抽取随机遭遇";
  const active = Number(entry?.active_entry_count);
  const weight = Number(entry?.selection_weight_total);
  const ambush = Number(entry?.ambush_threshold);
  return [
    Number.isInteger(active) ? `${active} 个有效槽` : "",
    Number.isInteger(weight) ? `总权重 ${weight}` : "",
    Number.isInteger(ambush) ? `伏击阈值 ${ambush}` : "",
  ].filter(Boolean).join(" · ");
}

function zonePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>遇敌区引用未解析</small></span>`;
  }
  const resolved = entry || {zone_id: id};
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>遇敌区 ${idHex(id)}</b><small>${esc(zoneSummary(resolved))}</small>
  </span>`;
}

function zoneReferenceItem(entry) {
  const id = zoneId(entry);
  if (id === null) return null;
  const hex = idHex(id);
  const summary = zoneSummary(entry);
  return {
    value: String(id),
    label: `${hex} · 遇敌区`,
    description: summary,
    meta: summary,
    preview: zonePreviewMarkup({entry}),
    filter: [id, hex, `0x${hex}`, `$${hex}`, `encounter-zone:${hex}`,
      summary].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareEncounterZoneComponent(props) {
  try {
    const documentValue = await db.getDocument(ENCOUNTER_ZONE_DOCUMENT_ID, null);
    const sourceEntries = documentValue?.zones;
    if (!Array.isArray(sourceEntries)) {
      throw new TypeError(`${ENCOUNTER_ZONE_DOCUMENT_ID} 缺少 zones 候选表`);
    }
    const entries = sourceEntries.map(entry => {
      const {reference_count: _references, ...candidate} = entry;
      return candidate;
    });
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry
        ? (({reference_count: _references, ...candidate}) => candidate)(props.entry)
        : entries.find(entry => zoneId(entry) === requestedId) || null,
      error: entries.length ? "" : `${ENCOUNTER_ZONE_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function encounterZoneReferencePickerMarkup({
  entries = [], value = null, label = "遇敌区", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: ENCOUNTER_ZONE_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(ENCOUNTER_ZONE_MODULE_ID, {
  item: zoneReferenceItem,
  className: "encounter-zone-reference-field",
  filterLabel: "过滤遇敌区",
  filterPlaceholder: "ID／有效槽／权重",
});

registerModuleComponent(ENCOUNTER_ZONE_MODULE_ID, "reference", {
  prepare: prepareEncounterZoneComponent,
  render: encounterZoneReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(ENCOUNTER_ZONE_MODULE_ID, kind, {
    prepare: prepareEncounterZoneComponent,
    render: zonePreviewMarkup,
  });
}
