// @editor-module 怪物 owner 的可嵌入封面
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {currentTextReference} from "../../core/resource-index.js";
import {
  monsterFigureCanvas,
  paintMonsterFigureCanvases,
} from "../../render/monster-figure.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const MONSTER_MODULE_ID = "monster-profile";
const MONSTER_RESOURCE_ID = "monster-profile";

function referenceId(handle, value) {
  const named = String(handle || "").trim();
  const namedMatch = /^[a-z0-9._-]+:([0-9a-f]{1,4})$/iu.exec(named);
  if (namedMatch) return Number.parseInt(namedMatch[1], 16);
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const raw = String(value ?? "").trim();
  if (/^[0-9]+$/u.test(raw)) return Number(raw);
  const hex = /^(?:0x|\$)?([0-9a-f]*[a-f][0-9a-f]*)$/iu.exec(raw);
  return hex ? Number.parseInt(hex[1], 16) : null;
}

function monsterId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function monsterIdHex(entry) {
  const id = monsterId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function monsterNameRecord(entry) {
  const direct = String(entry?.name_reference?.node_id || "");
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(direct)) return direct;
  const record = Number(entry?.name_text_record_id);
  const region = Number.parseInt(String(entry?.name_text_region ?? "01"), 16);
  if (!Number.isInteger(record) || record < 0 || record > 999
      || !Number.isInteger(region) || region < 0 || region > 0xff) return "";
  const regionHex = region.toString(16).toUpperCase().padStart(2, "0");
  return `record:${regionHex}:${String(record).padStart(3, "0")}`;
}

function currentMonsterName(entry, fallback) {
  const record = monsterNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function monsterStat(entry) {
  const values = [
    ["HP", entry?.hp?.value],
    ["攻", entry?.attack?.value],
    ["防", entry?.defense?.value],
    ["速", entry?.speed],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return values.slice(0, 3).map(([label, value]) => `${label}${value}`).join(" · ");
}

function monsterPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  enemyId = null,
  graphicId = null,
  box = 64,
  componentAttributes = "",
  mode = "enemy",
} = {}) {
  const id = monsterId(entry) ?? referenceId(handle, value);
  const resolvedEnemy = enemyId ?? (mode === "enemy" ? id : null);
  const resolvedGraphic = graphicId ?? (mode === "graphic" ? id : null);
  const identity = String(handle || value || (id === null ? "—" : id));
  const fallback = String(entry?.name
    || (id === null ? "怪物" : `怪物 ${monsterIdHex({id})}`));
  const label = entry ? currentMonsterName(entry, fallback) : identity;
  return `<span class="monster-module-preview" ${componentAttributes}>
    ${id === null ? `<span class="resource-empty">怪物引用未解析</span>` : monsterFigureCanvas({
      enemyId: resolvedEnemy,
      graphicId: resolvedGraphic,
      box,
      className: "monster-module-preview-canvas",
      label,
    })}
    <small class="mono">${esc(entry ? `${label} · ${monsterStat(entry)}` : identity)}</small>
  </span>`;
}

function monsterReferenceItem(entry) {
  const id = monsterId(entry);
  if (id === null) return null;
  const idHex = monsterIdHex(entry);
  const fallback = String(entry?.name || `怪物 ${idHex}`);
  const name = currentMonsterName(entry, fallback);
  const stat = monsterStat(entry);
  const graphicId = Number(entry?.graphic_id);
  const description = Number.isInteger(graphicId)
    ? `图形 $${graphicId.toString(16).toUpperCase().padStart(2, "0")}` : "";
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description,
    meta: stat,
    preview: monsterPreviewMarkup({entry, value: id, box: 52}),
    filter: [id, idHex, `0x${idHex}`, `$${idHex}`, `monster:${idHex}`,
      `monster-profile:${idHex}`, name, description, stat]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function monsterRows(documentValue) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${MONSTER_RESOURCE_ID} 缺少 records 候选表`);
  }
  return records;
}

async function prepareMonsterComponent(props) {
  try {
    const documentValue = props.documentValue
      ?? await db.getResourceDocument(MONSTER_RESOURCE_ID, null);
    const entries = monsterRows(documentValue);
    const requestedId = monsterId(props.entry) ?? referenceId(props.handle, props.value);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => monsterId(entry) === requestedId) || null,
      error: entries.length ? "" : "monster-profile 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function monsterReferencePickerMarkup({
  entries = [],
  value = null,
  label = "怪物",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  emptyValue,
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {
      module: MONSTER_MODULE_ID,
      ...(emptyValue === undefined ? {} : {
        key: ["id"],
        sentinels: [{value: emptyValue, label: "空", description: "数量 0", meta: ""}],
      }),
    },
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

async function hydrateMonsterPreview(root = document) {
  await paintMonsterFigureCanvases(root);
}

/** 属性码的附加值与数值倍率由当前发布投影提供。 */
export async function bindMonsterAttributeDetails(root, object) {
  const nodes = [...root.querySelectorAll('[data-monster-attribute-detail]')]
    .filter(node => !node.dataset.fieldMounted);
  if (!nodes.length) return;
  nodes.forEach(node => {node.dataset.fieldMounted = 'true';});
  let revision = 0;
  const refresh = async () => {
    const current = ++revision;
    const document = (await object.database.readResource(object.resourceId)).value.document;
    if (current !== revision || !root.isConnected) return;
    const record = document.records.find(row => Number(row.id) === object.fields[0].recordId);
    for (const node of nodes) {
      const name = node.dataset.monsterAttributeDetail;
      if (name === 'attack_code' || name === 'defense_code') {
        const stat = name === 'attack_code' ? 'attack' : 'defense';
        node.textContent = `附加值 ${record[`${stat}_aux`]} · ×${record[stat].multiplier}`;
      } else {
        node.textContent = `CODE 0x${Number(record[name].raw).toString(16).toUpperCase().padStart(2, '0')} × ${record[name].multiplier}`;
      }
    }
  };
  const errorNode = nodes[0];
  object.fields.forEach(field => field.bind(errorNode, (_target, _value, _field, reason) => {
    if (reason !== 'initial') void refresh().catch(error => {errorNode.textContent = error.message;});
  }));
  await refresh();
}

registerReferenceFieldPresentation(MONSTER_MODULE_ID, {
  item: monsterReferenceItem,
  paint: paintMonsterFigureCanvases,
  className: "monster-reference-field",
  filterLabel: "过滤怪物",
  filterPlaceholder: "ID／当前名称／图形／数值",
});

registerModuleComponent(MONSTER_MODULE_ID, "reference", {
  prepare: prepareMonsterComponent,
  render: monsterReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(MONSTER_MODULE_ID, kind, {
    prepare: prepareMonsterComponent,
    render: props => monsterPreviewMarkup({...props, mode: "enemy"}),
    hydrate: hydrateMonsterPreview,
  });
}

for (const moduleId of ["monster-figure", "monster-graphic"]) {
  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      render: props => monsterPreviewMarkup({...props, mode: "graphic"}),
      hydrate: hydrateMonsterPreview,
    });
  }
}
