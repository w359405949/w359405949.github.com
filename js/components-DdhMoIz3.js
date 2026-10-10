import { registerModuleComponent, renderModuleComponent, esc, loadChrBankBytes, decodeChrTile, paintChrTile, currentTextReference } from './interface-state-preview-Dlotqlmn.js';
import { hydrateItemPickers, itemPickerFieldMarkup } from './attack-chr-tile-selector-Bv5xCQyz.js';
import { db } from './prg-loaders-DnCSmXk9.js';
import { registerEncodedScalarReferenceCodec } from './reference-fields-DasyxcV4.js';
import { registerReferenceFieldPresentation, referenceFieldPickerMarkup, hydrateReferenceFieldPickers } from './timeline-player-YCH7Y-3h.js';

// @editor-module human-item / tank-item owner 的引用候选与预览
//
// 两类实体共享 item-entry 发布投影，但候选值域在源码里按 owner 固定分开；这里不扫
// 模块图、manifest 或运行时资源来猜。玩家可见名称仍由 text-record 当前正文水合，
// item-entry 的 name 只在文字正文尚未载入时充当提示。


const HUMAN_ITEM_MODULE_ID = "human-item";
const TANK_ITEM_MODULE_ID = "tank-item";
const ITEM_REFERENCE_RESOURCE_ID = "item-entry";

registerModuleComponent(ITEM_REFERENCE_RESOURCE_ID, 'reference', {
  async prepare(props) {
    const document = await db.getResourceDocument(ITEM_REFERENCE_RESOURCE_ID, null);
    return {...props, records: document.records};
  },
  render: props => `<span ${props.componentAttributes}>${itemPickerFieldMarkup({...props, lazy: false})}</span>`,
  hydrate: hydrateItemPickers,
});

const ITEM_MODULES = Object.freeze({
  [HUMAN_ITEM_MODULE_ID]: Object.freeze({
    owner: "human",
    label: "人类物品",
  }),
  [TANK_ITEM_MODULE_ID]: Object.freeze({
    owner: "tank",
    label: "战车物品",
  }),
});

const ITEM_CATEGORY_GLYPHS = Object.freeze({
  empty: "·",
  "human-head": "盔", "human-body": "衣", "human-feet": "靴",
  "human-protector": "甲", "human-hands": "手", "human-weapon": "刀",
  "tank-main-gun": "炮", "tank-special": "特", "tank-sub-gun": "副",
  "tank-c-unit": "C", "tank-engine": "机", "tank-chassis": "车",
  "human-item": "包", "tank-item": "箱",
});

function itemModule(moduleId) {
  const id = String(moduleId || "");
  const definition = ITEM_MODULES[id];
  if (!definition) throw new TypeError(`物品引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function itemId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function itemIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const fromEntry = itemId(entry);
  if (fromEntry !== null) return fromEntry;
  const reference = String(handle || value || "").trim();
  const match = /^(?:human-item|tank-item):([0-9a-f]{1,2})$/iu.exec(reference);
  if (match) return Number.parseInt(match[1], 16);
  return itemId({id: value});
}

function itemIdHex(entry) {
  const id = itemId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

// The field stores a typed owner handle; the existing item picker uses the
// published numeric id. Keep this conversion in the item owner.
registerEncodedScalarReferenceCodec("human-item/handle/v1", {
  decode(value) {
    if (typeof value !== "string" || !/^human-item:[0-9A-F]{2}$/u.test(value)) {
      throw new TypeError("人物物品引用必须使用规范句柄");
    }
    return itemIdFromReference({handle: value});
  },
  encode(_source, target) {
    const id = itemId({id: target});
    if (id === null) throw new TypeError("人物物品候选编号无效");
    return `${HUMAN_ITEM_MODULE_ID}:${itemIdHex({id})}`;
  },
  accepts(target, row) {
    return row?.category?.owner === "human" && itemId(row) === Number(target);
  },
});

function itemNameRecord(entry) {
  const id = itemId(entry);
  if (id === null) return "";
  const region = Number.parseInt(String(entry?.name_text_region ?? "00"), 16);
  const record = Number(entry?.name_text_record_id ?? id);
  if (!Number.isInteger(region) || region < 0 || region > 0xff
      || !Number.isInteger(record) || record < 0 || record > 999) return "";
  return `record:${region.toString(16).toUpperCase().padStart(2, "0")}:${
    String(record).padStart(3, "0")}`;
}

function entryBelongsToModule(entry, moduleId) {
  const definition = itemModule(moduleId);
  const owner = String(entry?.category?.owner || "");
  return owner === "empty" || owner === definition.owner;
}

function currentItemName(entry, fallback) {
  const record = itemNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function itemStat(entry) {
  const values = [
    ["攻", entry?.attack?.value],
    ["防", entry?.defense?.value],
    ["重", entry?.tank_weight?.value],
    ["载", entry?.engine_capacity?.value],
    ["价", entry?.price?.value],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return values.slice(0, 2).map(([label, value]) => `${label}${value}`).join(" · ");
}

function itemPreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const definition = itemModule(moduleId);
  const id = itemIdFromReference({entry, handle, value});
  const resolved = entry || {id};
  const idHex = itemIdHex(resolved);
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(definition.label)}引用未解析</small></span>`;
  }
  const fallback = String(entry?.name || `${definition.label} ${idHex}`);
  const name = currentItemName(resolved, fallback);
  const category = String(entry?.category?.name || definition.label);
  const glyph = ITEM_CATEGORY_GLYPHS[entry?.category?.id] || "物";
  const icon = entry?.equipment_icon;
  const iconMarkup = icon?.item_id === id && icon.category_id === entry?.category?.id
    && icon.tile_reference?.resource_id === "shared-chr-bank"
    ? `<canvas class="item-equipment-icon" width="8" height="8"
      data-item-equipment-icon data-chr-bank="${esc(icon.tile_reference.bank_id)}"
      data-chr-tile="${esc(icon.tile_reference.tile_id)}"
      data-sprite-palette="${esc(JSON.stringify(icon.sprite_palette))}"
      aria-hidden="true"></canvas>`
    : `<span class="item-category-glyph" aria-hidden="true">${esc(glyph)}</span>`;
  const stat = itemStat(entry);
  return `<span class="module-reference-data-preview item-entry-preview" ${componentAttributes}
    data-item-reference-module="${esc(moduleId)}" data-item-reference-id="${id}"
    aria-label="${esc(name)} · ${esc(category)}" title="${esc([name, category, stat].filter(Boolean).join(" · "))}">
    ${iconMarkup}
  </span>`;
}

async function paintEquipmentIcon(canvas) {
  const bank = await loadChrBankBytes(Number(canvas.dataset.chrBank));
  const tile = decodeChrTile(bank, Number(canvas.dataset.chrTile));
  const palette = JSON.parse(canvas.dataset.spritePalette);
  const data = new Uint8ClampedArray(8 * 8 * 4);
  paintChrTile(data, 8, 0, 0, tile, palette, {background: null});
  canvas.getContext("2d").putImageData(new ImageData(data, 8, 8), 0, 0);
}

async function hydrateEquipmentIcons(root) {
  await Promise.all([...root.querySelectorAll("canvas[data-item-equipment-icon]")]
    .map(async canvas => {
      try {
        await paintEquipmentIcon(canvas);
      } catch (error) {
        canvas.replaceWith(document.createTextNode(`图标不可用：${error.message}`));
      }
    }));
}

function itemReferenceItem(entry, reference) {
  const moduleId = String(reference?.module || "");
  const definition = itemModule(moduleId);
  if (!entryBelongsToModule(entry, moduleId)) return null;
  const id = itemId(entry);
  if (id === null) return null;
  const idHex = itemIdHex(entry);
  const fallback = String(entry?.name || `${definition.label} ${idHex}`);
  const name = currentItemName(entry, fallback);
  const category = String(entry?.category?.name || definition.label);
  const stat = itemStat(entry);
  const handle = `${moduleId}:${idHex}`;
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description: category,
    meta: stat,
    preview: renderModuleComponent(moduleId, "preview", {entry}),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      handle,
      name,
      category,
      stat,
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

function itemRows(documentValue, moduleId) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${ITEM_REFERENCE_RESOURCE_ID} 缺少 records 候选表`);
  }
  return records.filter(entry => entryBelongsToModule(entry, moduleId));
}

async function prepareItemComponent(props) {
  const moduleId = String(props.moduleId || "");
  itemModule(moduleId);
  try {
    const documentValue = await db.getResourceDocument(ITEM_REFERENCE_RESOURCE_ID, null);
    const entries = itemRows(documentValue, moduleId);
    const requestedId = itemIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => itemId(entry) === requestedId) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function itemReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = itemModule(moduleId);
  const rows = entries.filter(entry => entryBelongsToModule(entry, moduleId));
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows,
    value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

function componentRoots(root, moduleId, kind) {
  const selector = `[data-module-component-module="${moduleId}"]`
    + `[data-module-component-kind="${kind}"]`;
  return [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
}

function hydrateItemReferencePickers(root = document) {
  hydrateReferenceFieldPickers(root);
}

for (const moduleId of Object.keys(ITEM_MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: itemReferenceItem,
    paint: hydrateEquipmentIcons,
    className: "item-reference-field",
    filterLabel: `过滤${ITEM_MODULES[moduleId].label}`,
    filterPlaceholder: "ID／名称／类别／数值",
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareItemComponent,
      render: itemPreviewMarkup,
      hydrate: hydrateEquipmentIcons,
    });
  }

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareItemComponent,
    render: itemReferencePickerMarkup,
    hydrate(root) {
      componentRoots(root, moduleId, "reference").forEach(
        hydrateItemReferencePickers,
      );
    },
  });
}
