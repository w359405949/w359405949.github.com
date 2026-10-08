// @editor-module encounter-formation owner 的候选与预览
//
// 编队候选固定来自 battle-test-point/formations。怪物显示名则按当前
// monster-profile -> text-record 正文现查；提取期 name hint 只在文字权威尚未载入时提示。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {currentTextReference} from "../../core/resource-index.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {updateReferencePickerItem} from "../../ui/reference-picker.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const ENCOUNTER_FORMATION_MODULE_ID = "encounter-formation";
const ENCOUNTER_FORMATION_RESOURCE_ID = "battle-test-point";
const MONSTER_RESOURCE_ID = "monster-profile";

function formationId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function formationIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const fromEntry = formationId(entry);
  if (fromEntry !== null) return fromEntry;
  const reference = String(handle || "").trim();
  const match = /^encounter-formation:([0-9a-f]{1,2})$/iu.exec(reference);
  if (match) return Number.parseInt(match[1], 16);
  return formationId({id: value});
}

function formationIdHex(entry) {
  const id = formationId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function monsterNameRecord(entry) {
  const direct = String(entry?.name_reference?.node_id || "");
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(direct)) return direct;
  const id = Number(entry?.name_text_record_id);
  const region = Number.parseInt(String(entry?.name_text_region ?? "01"), 16);
  if (!Number.isInteger(id) || id < 0 || id > 999
      || !Number.isInteger(region) || region < 0 || region > 0xff) return "";
  const regionHex = region.toString(16).toUpperCase().padStart(2, "0");
  return `record:${regionHex}:${String(id).padStart(3, "0")}`;
}

function currentMonsterName(entry, fallback) {
  const record = monsterNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function activeSlots(entry) {
  return (Array.isArray(entry?.slots) ? entry.slots : []).filter(slot =>
    Number(slot?.count) > 0);
}

function formationLabel(entry) {
  const slots = activeSlots(entry);
  if (!slots.length) return "空编队";
  return slots.map(slot => {
    const fallback = `怪物 $${Number(slot.monster_id).toString(16)
      .toUpperCase().padStart(2, "0")}`;
    return `${slot.current_name || slot.monster_name_hint || fallback}×${Number(slot.count)}`;
  }).join(" + ");
}

function formationStat(entry) {
  const count = activeSlots(entry).reduce((sum, slot) => sum + Number(slot.count), 0);
  const status = count > 9 ? "超出运行时 9 体上限" : "运行时上限内";
  return `${activeSlots(entry).length} 组 · ${count} 体 · ${status}`;
}

function encounterFormationPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const id = formationIdFromReference({entry, handle, value});
  const resolved = entry || {id};
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>遭遇编队引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-encounter-formation-id="${id}">
    <b>${esc(formationLabel(resolved))}</b>
    <small>${esc(formationStat(resolved))}</small>
  </span>`;
}

function encounterFormationReferenceItem(entry) {
  const id = formationId(entry);
  if (id === null) return null;
  const idHex = formationIdHex(entry);
  const label = formationLabel(entry);
  const stat = formationStat(entry);
  return {
    value: String(id),
    group: 'formation', groupLabel: '战斗编队',
    label: `${idHex} · ${label}`,
    description: stat,
    meta: `encounter-formation:${idHex}`,
    preview: encounterFormationPreviewMarkup({entry}),
    filter: [id, idHex, `0x${idHex}`, `$${idHex}`,
      `encounter-formation:${idHex}`, label, stat]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function formationRows(documentValue) {
  const formations = documentValue?.formations;
  if (!Array.isArray(formations)) {
    throw new TypeError(`${ENCOUNTER_FORMATION_RESOURCE_ID} 缺少 formations 候选表`);
  }
  return formations;
}

function monsterRows(documentValue) {
  const records = documentValue?.records;
  return Array.isArray(records) ? records : [];
}

function enrichFormations(formations, monsters) {
  const monsterById = new Map(monsters.map(entry => [Number(entry.id), entry]));
  return formations.map(formation => ({
    ...formation,
    slots: (formation.slots || []).map(slot => {
      const monster = monsterById.get(Number(slot.monster_id));
      const monsterHex = Number(slot.monster_id).toString(16).toUpperCase().padStart(2, "0");
      const fallback = String(monster?.name || slot.monster_name_hint || `怪物 $${monsterHex}`);
      return {
        ...slot,
        current_name: monster ? currentMonsterName(monster, fallback) : fallback,
      };
    }),
  }));
}

async function prepareEncounterFormationComponent(props) {
  try {
    const [formationDocument, monsterDocument] = await Promise.all([
      db.getResourceDocument(ENCOUNTER_FORMATION_RESOURCE_ID, null),
      db.getResourceDocument(MONSTER_RESOURCE_ID, null),
    ]);
    const entries = enrichFormations(
      formationRows(formationDocument),
      monsterRows(monsterDocument),
    );
    const requestedId = formationIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => formationId(entry) === requestedId) || null,
      formationDocument,
      monsterDocument,
      error: entries.length ? "" : "encounter-formation 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function encounterFormationReferencePickerMarkup({
  entries = [],
  value = null,
  label = "遭遇编队",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  pending = false,
  picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: ENCOUNTER_FORMATION_MODULE_ID},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
    pending,
  });
}

async function hydrateEncounterFormationReference(root) {
  hydrateReferenceFieldPickers(root);
  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'resource-inline-link';
  link.textContent = '编辑编队 ↗';
  const syncLink = () => {
    const id = formationIdFromReference({value: root.dataset.moduleReferenceValue});
    link.disabled = id === null;
    link.dataset.resourceTarget = `encounter-formation:${formationIdHex({id})}`;
  };
  syncLink();
  root.append(link);
  new MutationObserver(syncLink).observe(root, {
    attributes: true, attributeFilter: ['data-module-reference-value'],
  });
  const [resolved, monsters, fields] = await Promise.all([
    db.readResource(ENCOUNTER_FORMATION_RESOURCE_ID),
    db.getResourceDocument(MONSTER_RESOURCE_ID, null),
    db.getFields(ENCOUNTER_FORMATION_RESOURCE_ID),
  ]);
  const byHandle = new Map();
  const refresh = (target, formation) => updateReferencePickerItem(target,
    encounterFormationReferenceItem(enrichFormations([formation], monsterRows(monsters))[0]));
  for (const formation of formationRows(resolved.value.document)) {
    refresh(root, formation);
    for (let slot = 0; slot < 4; slot++)
      byHandle.set(`encounter-formation:${formationIdHex(formation)}:slot:${slot}`, formation);
  }
  for (const field of fields) {
    const formation = byHandle.get(field.entityHandle);
    if (formation) field.bind(root, (target, _value, _field, reason) => {
      if (reason !== "initial") refresh(target, formation);
    });
  }
}

registerReferenceFieldPresentation(ENCOUNTER_FORMATION_MODULE_ID, {
  item: encounterFormationReferenceItem,
  className: "encounter-formation-reference-field",
  filterLabel: "过滤遭遇编队",
  filterPlaceholder: "编队 ID／怪物名称／数量",
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(ENCOUNTER_FORMATION_MODULE_ID, kind, {
    prepare: prepareEncounterFormationComponent,
    render: encounterFormationPreviewMarkup,
  });
}

registerModuleComponent(ENCOUNTER_FORMATION_MODULE_ID, "reference", {
  prepare: prepareEncounterFormationComponent,
  render: encounterFormationReferencePickerMarkup,
  hydrate: hydrateEncounterFormationReference,
});
