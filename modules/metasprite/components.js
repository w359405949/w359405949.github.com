// @editor-module metasprite owner 的 55 项候选与上下文预览
//
// 像素上下文只认资源索引发布的 uses-sprite-context；组件内部再沿该不透明 UID
// 解出图案表。消费页不传 bank，也不会在 DOM 里看到 bank。候选仍从当前
// metasprite-record 正文经 owner 解码器现解，编辑记录区后结构与像素都会同步。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {blitRaster, byteRecords} from "../../render/chr-raster.js";
import {
  decodeGenericObjects,
  metaspriteContextSources,
  metaspriteObjectImage,
} from "../../render/metasprite.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const METASPRITE_MODULE_ID = "metasprite";
const METASPRITE_DOCUMENT_ID = "metasprite-record";
const VISUAL_RESOURCE_INDEX_ID = "resource-index.visual";
const SPRITE_CONTEXT_RELATION = "uses-sprite-context";
const CHR_BANK_RELATION = "uses-chr-bank";
const BATTLE_CONTEXT_STATUS = "battle-ui";
const POINTER_COUNT = 55;

function byteId(value) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result < POINTER_COUNT ? result : null;
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = byteId(entry?.id);
  if (direct !== null) return direct;
  const match = /^metasprite:([0-9a-f]{1,2})$/iu.exec(String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : byteId(value);
}

function idHex(value) {
  const id = byteId(value?.id ?? value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function objectBounds(entry) {
  const sprites = Array.isArray(entry?.sprites) ? entry.sprites : [];
  if (!sprites.length) return null;
  const xs = sprites.map(sprite => Number(sprite.x));
  const ys = sprites.map(sprite => Number(sprite.y));
  return {
    width: Math.max(...xs) + 8 - Math.min(...xs),
    height: Math.max(...ys) + 8 - Math.min(...ys),
  };
}

function objectSummary(entry) {
  if (!Array.isArray(entry?.sprites) && entry?.runtimeGenerated === undefined) {
    return "组合精灵记录 · 结构由 owner 从当前正文现解";
  }
  if (entry?.runtimeGenerated) return "运行时生成 · 无静态 sprite 记录";
  const sprites = Array.isArray(entry?.sprites) ? entry.sprites : [];
  const bounds = objectBounds(entry);
  return `${sprites.length} 枚 OAM sprite${
    bounds ? ` · ${bounds.width}×${bounds.height} px` : ""}${
    entry?.previewContext?.label ? ` · ${entry.previewContext.label}` : ""}`;
}

function objectLabel(entry) {
  return `Metasprite ${idHex(entry)}`;
}

function indexedRow(rows, uid) {
  return rows.find(row => row?.uid === uid) || null;
}

function spriteContextBankIds(context) {
  const references = Array.isArray(context?.references) ? context.references : [];
  const bankEdges = references.filter(edge => edge?.relation === CHR_BANK_RELATION);
  if (bankEdges.length !== 4) {
    throw new TypeError(`${context?.uid || "sprite context"} 缺少四条 ${CHR_BANK_RELATION} 关系`);
  }
  const banks = bankEdges.map(edge => {
    const match = /^chr-bank:([0-9a-f]{2})$/iu.exec(String(edge?.target || ""));
    if (!match) {
      throw new TypeError(`${context.uid} 的 ${CHR_BANK_RELATION} 目标无效`);
    }
    return Number.parseInt(match[1], 16);
  });
  if (new Set(banks).size !== banks.length) {
    throw new TypeError(`${context.uid} 的 ${CHR_BANK_RELATION} 目标重复`);
  }
  return banks;
}

/**
 * 把 metasprite 的资源身份收敛成一个不透明 sprite-context UID。
 * CHR bank 只在本 owner 的绘制 hook 内部解开，不作为返回值泄漏给消费页。
 */
function metaspritePreviewContext(rows, value) {
  if (!Array.isArray(rows)) {
    throw new TypeError(`${VISUAL_RESOURCE_INDEX_ID} 正文不可用`);
  }
  const id = byteId(value?.id ?? value);
  if (id === null || id === 0) return null;
  const uid = `${METASPRITE_MODULE_ID}:${idHex(id)}`;
  const resource = indexedRow(rows, uid);
  const contextEdges = (resource?.references || []).filter(
    edge => edge?.relation === SPRITE_CONTEXT_RELATION,
  );
  if (contextEdges.length !== 1) {
    throw new TypeError(`${uid} 缺少唯一 ${SPRITE_CONTEXT_RELATION} 关系`);
  }
  const contextUid = String(contextEdges[0].target || "");
  const context = indexedRow(rows, contextUid);
  if (!context || context.kind !== "sprite-context") {
    throw new TypeError(`${uid} 指向的 ${contextUid || "sprite context"} 未发布`);
  }
  if (context.status !== BATTLE_CONTEXT_STATUS) {
    throw new TypeError(`${contextUid} 没有已发布的 metasprite 调色板上下文`);
  }
  // 在准备阶段就验证整条已发布关系；返回给渲染层的仍只有不透明 UID。
  spriteContextBankIds(context);
  return Object.freeze({
    uid: contextUid,
    label: String(context.label || contextUid),
  });
}

function pixelPreviewMarkup(entry, componentAttributes) {
  const id = byteId(entry?.id);
  const context = entry?.previewContext;
  if (id === null || id === 0 || entry?.runtimeGenerated) return "";
  const label = [objectLabel(entry), context?.label].filter(Boolean).join(" · ");
  return `<span class="module-reference-data-preview" ${componentAttributes}
    style="position:relative;padding:0" title="${esc(label)}">
    <canvas width="64" height="64" data-metasprite-owner-preview
      data-metasprite-resource="${METASPRITE_MODULE_ID}:${esc(idHex(id))}"
      style="display:block;width:100%;height:100%;image-rendering:pixelated"
      aria-label="${esc(label)}"></canvas>
    <small style="position:absolute;right:2px;bottom:1px;padding:0 2px;background:#090c0ecc">${
      esc(idHex(id))}</small>
  </span>`;
}

function metaspritePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "Metasprite 引用未解析")}</small></span>`;
  }
  const resolved = entry || {id, runtimeGenerated: id === 0, sprites: []};
  const pixelPreview = pixelPreviewMarkup(resolved, componentAttributes);
  if (pixelPreview) return pixelPreview;
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(objectLabel(resolved))}</b><small>${esc(objectSummary(resolved))}</small>
  </span>`;
}

function metaspriteReferenceItem(entry) {
  const id = byteId(entry?.id);
  if (id === null) return null;
  const hex = idHex(id);
  const summary = objectSummary(entry);
  return {
    value: String(id),
    label: `${hex} · ${objectLabel(entry)}`,
    description: summary,
    meta: `metasprite:${hex}`,
    preview: metaspritePreviewMarkup({entry}),
    filter: [id, hex, `0x${hex}`, `$${hex}`, `metasprite:${hex}`, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function decodeMetaspriteRows(documentValue) {
  const records = documentValue?.generic_pointers;
  if (!Array.isArray(records) || records.length !== POINTER_COUNT) {
    throw new TypeError(`${METASPRITE_DOCUMENT_ID} 缺少 55 条 generic_pointers`);
  }
  const pointers = new Uint16Array(POINTER_COUNT);
  const seen = new Set();
  for (const record of records) {
    const id = byteId(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (id === null || seen.has(id) || !Number.isInteger(pointer)
        || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${METASPRITE_DOCUMENT_ID} 的 generic pointer 无效`);
    }
    pointers[id] = pointer;
    seen.add(id);
  }
  return decodeGenericObjects(
    pointers,
    byteRecords(documentValue?.generic_record_region, "generic_record_region"),
  );
}

function metaspriteRowsWithContexts(documentValue, resourceIndex) {
  return decodeMetaspriteRows(documentValue).map(entry => entry.runtimeGenerated
    ? entry
    : {...entry, previewContext: metaspritePreviewContext(resourceIndex, entry)});
}

async function prepareMetaspriteComponent(props) {
  try {
    const [documentValue, resourceIndex] = await Promise.all([
      db.getDocument(METASPRITE_DOCUMENT_ID, null),
      db.getDocument(VISUAL_RESOURCE_INDEX_ID, null),
    ]);
    const entries = metaspriteRowsWithContexts(documentValue, resourceIndex);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: entries.find(entry => entry.id === requestedId) || props.entry || null,
      error: entries.length ? "" : "metasprite 的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function metaspriteReferencePickerMarkup({
  entries = [], value = null, label = "Metasprite", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: METASPRITE_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

function paintMetaspritePreviewError(canvas, error) {
  const message = String(error?.message || error);
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#170b0b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ff6b6b";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(8, 8);
    context.lineTo(canvas.width - 8, canvas.height - 8);
    context.moveTo(canvas.width - 8, 8);
    context.lineTo(8, canvas.height - 8);
    context.stroke();
  }
  canvas.dataset.metaspriteOwnerError = message;
  canvas.title = message;
}

/** 绘制 hook 只消费不透明 context UID；bank 解析不会进入调用方标记。 */
async function paintMetaspriteOwnerPreviews(root = document) {
  const selector = "canvas[data-metasprite-owner-preview]";
  const canvases = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ].filter(canvas => canvas.dataset.metaspriteOwnerPainted !== "1");
  if (!canvases.length) return;
  const resourceIndex = await db.getDocument(VISUAL_RESOURCE_INDEX_ID, null);
  for (const canvas of canvases) {
    try {
      const id = idFromReference({handle: canvas.dataset.metaspriteResource});
      const previewContext = metaspritePreviewContext(resourceIndex, id);
      const context = indexedRow(resourceIndex || [], previewContext?.uid);
      const sources = await metaspriteContextSources(spriteContextBankIds(context));
      const entry = sources.recipe.genericObjects.find(item => item.id === id);
      if (!entry || entry.runtimeGenerated) {
        throw new TypeError(`metasprite ${idHex(id)} 没有静态像素记录`);
      }
      blitRaster(canvas, metaspriteObjectImage(sources, entry, {size: 64, scale: 3}));
      canvas.dataset.metaspriteOwnerPainted = "1";
      delete canvas.dataset.metaspriteOwnerError;
    } catch (error) {
      paintMetaspritePreviewError(canvas, error);
    }
  }
}

registerReferenceFieldPresentation(METASPRITE_MODULE_ID, {
  item: metaspriteReferenceItem,
  paint: paintMetaspriteOwnerPreviews,
  className: "metasprite-reference-field",
  filterLabel: "过滤 Metasprite",
  filterPlaceholder: "ID／sprite 数／尺寸／运行时记录",
});

registerModuleComponent(METASPRITE_MODULE_ID, "reference", {
  prepare: prepareMetaspriteComponent,
  render: metaspriteReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(METASPRITE_MODULE_ID, kind, {
    prepare: prepareMetaspriteComponent,
    render: metaspritePreviewMarkup,
    hydrate: paintMetaspriteOwnerPreviews,
  });
}
