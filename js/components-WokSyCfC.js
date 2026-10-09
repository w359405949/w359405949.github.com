import { registerReferenceFieldPresentation, registerModuleComponent, loadChrBankBytes, decodeChrTiles, createRaster, paintChrTile, blitRaster, esc, hydrateReferenceFieldPickers, referenceFieldPickerMarkup, referencePickerMarkup } from './monster-figure-C07vG7yu.js';
import { db, VISUAL_CHR_BANK_IDS } from './scene-actors-Cftr7mCE.js';
import { paletteSwatches } from './entity-detail-D8pHuYrZ.js';

// @editor-module CHR、背景调色板与元图块 owner 的引用供给
//
// 候选只读取点名的 owner 正文。CHR bank 没有运行时 palette，元图块也没有唯一
// CHR/palette 上下文；两类缩略图都明确保留这个边界，不冒充实机画面。


const PALETTE_MODULE_ID = "palette";
const METATILE_PAGE_MODULE_ID = "metatile-page";
const METATILE_SET_MODULE_ID = "metatile-set";
const VISUAL_CHR_MODULE_ID = "shared-chr-bank";
const VISUAL_CHR_PATTERN_PAGE_REFERENCE_KIND = "pattern-page-reference";

const VISUAL_CHR_PREVIEW_PALETTE = Object.freeze([0x0f, 0x00, 0x10, 0x20]);

const OWNER_DEFINITIONS = Object.freeze({
  [PALETTE_MODULE_ID]: Object.freeze({
    resourceId: PALETTE_MODULE_ID,
    schema: "metalmaxcn.semantic-owner.palette.document",
    expectedRecords: 54,
    label: "背景调色板",
    filterLabel: "过滤调色板",
    filterPlaceholder: "句柄／ID／场景／颜色值",
  }),
  [METATILE_PAGE_MODULE_ID]: Object.freeze({
    resourceId: METATILE_PAGE_MODULE_ID,
    schema: "metalmaxcn.semantic-owner.metatile-page.document",
    expectedRecords: 55,
    label: "元图块页",
    filterLabel: "过滤元图块页",
    filterPlaceholder: "句柄／ID／组合／场景",
  }),
  [METATILE_SET_MODULE_ID]: Object.freeze({
    resourceId: METATILE_SET_MODULE_ID,
    schema: "metalmaxcn.semantic-owner.metatile-set.document",
    expectedRecords: 45,
    label: "元图块集",
    filterLabel: "过滤元图块集",
    filterPlaceholder: "句柄／ID／页面／场景",
  }),
});

function ownerDefinition(moduleId) {
  const id = String(moduleId || "");
  const definition = OWNER_DEFINITIONS[id];
  if (!definition) throw new TypeError(`视觉引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function byteId(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const number = /^\$[0-9a-f]{1,2}$/iu.test(text)
    ? Number.parseInt(text.slice(1), 16) : Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function hexByte(value) {
  const id = byteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeOwnerHandle(value, moduleId) {
  const definition = ownerDefinition(moduleId);
  const text = String(value ?? "").trim();
  const prefix = `${definition.id}:`;
  if (text.toLowerCase().startsWith(prefix)) {
    const suffix = text.slice(prefix.length);
    if (/^[0-9a-f]{1,2}$/iu.test(suffix)) {
      return `${definition.id}:${suffix.toUpperCase().padStart(2, "0")}`;
    }
    if (definition.id === PALETTE_MODULE_ID
        && suffix.toLowerCase() === "field-item-world-map") {
      return `${definition.id}:field-item-world-map`;
    }
    return "";
  }
  if (definition.id === PALETTE_MODULE_ID
      && text.toLowerCase() === "field-item-world-map") {
    return `${definition.id}:field-item-world-map`;
  }
  const id = byteId(value);
  return id === null ? "" : `${definition.id}:${hexByte(id)}`;
}

function recordHandle(entry, moduleId) {
  return normalizeOwnerHandle(entry?.handle, moduleId)
    || normalizeOwnerHandle(entry?.id, moduleId);
}

function requestedHandle({moduleId, entry = null, handle = "", value = ""} = {}) {
  return recordHandle(entry, moduleId)
    || normalizeOwnerHandle(handle, moduleId)
    || normalizeOwnerHandle(value, moduleId);
}

function byteArray(value, length, label) {
  if (!Array.isArray(value) || value.length !== length
      || value.some(item => byteId(item) === null)) {
    throw new TypeError(`${label} 必须是 ${length} 项 byte 数组`);
  }
  return value;
}

function chrBankId(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const handle = /^(?:shared-chr-bank|chr-bank):([0-9a-f]{1,2})$/iu.exec(text);
  let number;
  if (handle) number = Number.parseInt(handle[1], 16);
  else if (/^\$[0-9a-f]{1,2}$/iu.test(text)) number = Number.parseInt(text.slice(1), 16);
  else if (/^0x[0-9a-f]{1,2}$/iu.test(text)) number = Number.parseInt(text.slice(2), 16);
  else if (/^[0-9]+$/u.test(text)) number = Number(text);
  else if (/^[0-9a-f]{1,2}$/iu.test(text)) number = Number.parseInt(text, 16);
  else return null;
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function requestedChrBankId({entry = null, handle = "", value = ""} = {}) {
  return chrBankId(entry?.id) ?? chrBankId(handle) ?? chrBankId(value);
}

function chrBankTitle(value) {
  const id = chrBankId(value);
  return id === null ? "未知 CHR Bank" : `CHR Bank $${hexByte(id)}`;
}

function validateChrBanks(documentValue, {pixels = true} = {}) {
  const banks = documentValue?.banks;
  if (!Array.isArray(banks) || banks.length !== VISUAL_CHR_BANK_IDS.length) {
    throw new TypeError(`shared-chr-bank 必须发布 ${VISUAL_CHR_BANK_IDS.length} 个 1 KiB bank`);
  }
  const seenBanks = new Set();
  banks.forEach(bank => {
    const bankId = chrBankId(bank?.id);
    if (!VISUAL_CHR_BANK_IDS.includes(bankId) || seenBanks.has(bankId)) {
      throw new TypeError(`shared-chr-bank 的 bank ID 无效或重复：${bank?.id}`);
    }
    seenBanks.add(bankId);
    if (!pixels) return;
    if (!Array.isArray(bank.tiles) || bank.tiles.length !== 64) {
      throw new TypeError(`${chrBankTitle(bankId)} 必须有 64 个图块`);
    }
    const seenTiles = new Set();
    bank.tiles.forEach(tile => {
      const tileId = Number(tile?.id);
      if (!Number.isInteger(tileId) || tileId < 0 || tileId >= 64
          || seenTiles.has(tileId)) {
        throw new TypeError(`${chrBankTitle(bankId)} 的图块 ID 无效或重复`);
      }
      seenTiles.add(tileId);
      byteArray(tile.plane_0, 8, `${chrBankTitle(bankId)} tile ${tileId} plane 0`);
      byteArray(tile.plane_1, 8, `${chrBankTitle(bankId)} tile ${tileId} plane 1`);
    });
  });
  return [...banks].sort((left, right) => Number(left.id) - Number(right.id));
}

async function loadVisualChrEntries() {
  return validateChrBanks(await db.getResourceDocument(VISUAL_CHR_MODULE_ID, null), {pixels: false});
}

function validateOwnerRecords(documentValue, moduleId) {
  const definition = ownerDefinition(moduleId);
  if (!documentValue || typeof documentValue !== "object"
      || documentValue.schema !== definition.schema) {
    throw new TypeError(`${definition.resourceId} semantic owner 正文无效`);
  }
  const records = documentValue.records;
  if (!Array.isArray(records)
      || records.length !== definition.expectedRecords
      || Number(documentValue.record_count) !== records.length) {
    throw new TypeError(`${definition.resourceId} 必须发布 ${definition.expectedRecords} 条记录`);
  }
  const handles = records.map(entry => recordHandle(entry, moduleId));
  if (handles.some(handle => !handle) || new Set(handles).size !== handles.length) {
    throw new TypeError(`${definition.resourceId} 的候选句柄为空或重复`);
  }
  if (moduleId === PALETTE_MODULE_ID) {
    records.forEach(entry => {
      const colors = entry.kind === "background-palette-source"
        ? byteArray(entry.background_palette_source, 9, `${entry.handle} 背景色`)
        : entry.kind === "fullscreen-ui-palette-seed"
          ? byteArray(entry.palette_seed, 8, `${entry.handle} UI 色种子`)
          : null;
      if (!colors || colors.some(color => color > 0x3f)) {
        throw new TypeError(`${entry.handle} 含无效 NES 色号`);
      }
    });
  } else if (moduleId === METATILE_PAGE_MODULE_ID) {
    records.forEach(entry => {
      byteArray(entry.metatile_attribute_page, 64, `${entry.handle} 属性页`);
      if (!Array.isArray(entry.metatile_definition_page)
          || entry.metatile_definition_page.length !== 64) {
        throw new TypeError(`${entry.handle} 必须有 64 个元图块定义`);
      }
      entry.metatile_definition_page.forEach((tiles, index) =>
        byteArray(tiles, 4, `${entry.handle} 元图块 ${index}`));
    });
  }
  return records;
}

function sceneReferences(entry) {
  return Array.isArray(entry?.scene_references)
    ? entry.scene_references.map(String).filter(Boolean) : [];
}

function structureMetrics(definitions, attributes) {
  const rows = Array.isArray(definitions) ? definitions : [];
  const tiles = rows.flatMap(row => Array.isArray(row) ? row : []);
  return {
    metatileCount: rows.length,
    uniqueTileCount: new Set(tiles.map(Number)).size,
    uniqueAttributeCount: new Set((attributes || []).map(Number)).size,
  };
}

function enrichMetatilePages(pageRecords, setRecords) {
  const usage = new Map(pageRecords.map(entry => [recordHandle(
    entry,
    METATILE_PAGE_MODULE_ID,
  ), {sets: new Set(), scenes: new Set()}]));
  setRecords.forEach(set => {
    for (const property of ["lower_metatile_page", "upper_metatile_page"]) {
      const pageHandle = normalizeOwnerHandle(set?.[property], METATILE_PAGE_MODULE_ID);
      if (!pageHandle) continue;
      const pageUsage = usage.get(pageHandle);
      if (!pageUsage) throw new TypeError(`${set.handle} 引用了不存在的 ${pageHandle}`);
      pageUsage.sets.add(recordHandle(set, METATILE_SET_MODULE_ID));
      sceneReferences(set).forEach(scene => pageUsage.scenes.add(scene));
    }
  });
  return pageRecords.map(entry => {
    const handle = recordHandle(entry, METATILE_PAGE_MODULE_ID);
    const metrics = structureMetrics(
      entry.metatile_definition_page,
      entry.metatile_attribute_page,
    );
    return {
      ...entry,
      ...metrics,
      set_references: [...usage.get(handle).sets],
      scene_references: [...usage.get(handle).scenes],
      preview_definitions: entry.metatile_definition_page,
      preview_attributes: entry.metatile_attribute_page,
    };
  });
}

function enrichMetatileSets(setRecords, pageRecords) {
  const pages = new Map(pageRecords.map(entry => [recordHandle(
    entry,
    METATILE_PAGE_MODULE_ID,
  ), entry]));
  return setRecords.map(entry => {
    let definitions;
    let attributes;
    if (entry.kind === "world-map-owned-records") {
      definitions = entry.metatile_definitions;
      attributes = entry.metatile_attributes;
      if (!Array.isArray(definitions) || !definitions.length
          || !Array.isArray(attributes) || attributes.length !== definitions.length) {
        throw new TypeError(`${entry.handle} 世界地图元图块正文无效`);
      }
    } else if (entry.kind === "shared-page-pair") {
      const lowerHandle = normalizeOwnerHandle(
        entry.lower_metatile_page,
        METATILE_PAGE_MODULE_ID,
      );
      const upperHandle = normalizeOwnerHandle(
        entry.upper_metatile_page,
        METATILE_PAGE_MODULE_ID,
      );
      const lower = pages.get(lowerHandle);
      const upper = pages.get(upperHandle);
      if (!lower || !upper) {
        throw new TypeError(`${entry.handle} 的元图块页引用不可用`);
      }
      definitions = [
        ...lower.metatile_definition_page,
        ...upper.metatile_definition_page,
      ];
      attributes = [
        ...lower.metatile_attribute_page,
        ...upper.metatile_attribute_page,
      ];
    } else {
      throw new TypeError(`${entry.handle} 的元图块集种类无效`);
    }
    definitions.forEach((tiles, index) =>
      byteArray(tiles, 4, `${entry.handle} 元图块 ${index}`));
    byteArray(attributes, definitions.length, `${entry.handle} 属性`);
    return {
      ...entry,
      ...structureMetrics(definitions, attributes),
      preview_definitions: definitions,
      preview_attributes: attributes,
    };
  });
}

async function loadOwnerEntries(moduleId) {
  const definition = ownerDefinition(moduleId);
  if (moduleId === PALETTE_MODULE_ID) {
    return validateOwnerRecords(
      await db.getResourceDocument(definition.resourceId, null),
      moduleId,
    );
  }
  const [pageDocument, setDocument] = await Promise.all([
    db.getResourceDocument(METATILE_PAGE_MODULE_ID, null),
    db.getResourceDocument(METATILE_SET_MODULE_ID, null),
  ]);
  const pageRecords = validateOwnerRecords(pageDocument, METATILE_PAGE_MODULE_ID);
  const setRecords = validateOwnerRecords(setDocument, METATILE_SET_MODULE_ID);
  return moduleId === METATILE_PAGE_MODULE_ID
    ? enrichMetatilePages(pageRecords, setRecords)
    : enrichMetatileSets(setRecords, pageRecords);
}

function paletteColors(entry) {
  return entry?.kind === "background-palette-source"
    ? entry.background_palette_source
    : entry?.kind === "fullscreen-ui-palette-seed" ? entry.palette_seed : [];
}

function colorSwatches(colors) {
  return paletteSwatches(colors, {className: "palette-swatches is-tight"});
}

function paletteTitle(entry) {
  return entry?.kind === "fullscreen-ui-palette-seed"
    ? "场景道具世界地图调色板" : `背景调色板 ${hexByte(entry?.id)}`;
}

function palettePreviewMarkup({
  entry = null,
  moduleId = PALETTE_MODULE_ID,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const identity = requestedHandle({moduleId, entry, handle, value});
  const colors = paletteColors(entry);
  if (!identity || error || !colors.length) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || identity || "调色板引用未解析")}</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(paletteTitle(entry))}</b>${colorSwatches(colors)}
  </span>`;
}

function visualChrPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const bankId = requestedChrBankId({entry, handle, value});
  if (bankId === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "CHR bank 引用未解析")}</small></span>`;
  }
  const title = chrBankTitle(bankId);
  const idHex = hexByte(bankId);
  return `<span class="module-reference-data-preview"
    style="width:72px;height:44px;padding:2px;display:flex;align-items:center;position:relative"
    ${componentAttributes}><canvas width="128" height="32" data-shared-chr-bank-bank-preview
      data-shared-chr-bank-bank-id="${bankId}"
      style="width:100%;height:auto;image-rendering:pixelated"
      aria-label="${esc(`${title} 图块预览`)}"
      title="${esc(`${title}：64 个 8×8 NES 2bpp 图块；灰阶只表示像素值，不是运行时调色板`)}"></canvas>
      <small style="position:absolute;right:2px;bottom:1px;padding:0 2px;background:#090c0ecc">$${idHex}</small></span>`;
}

function visualChrReferenceItem(entry, reference = null) {
  const bankId = chrBankId(entry?.id);
  if (bankId === null) return null;
  const title = chrBankTitle(bankId);
  return {
    value: declaredText(entry, reference?.key) || String(bankId),
    label: title,
    description: declaredText(entry, reference?.description)
      || "1 KiB · 64 个 8×8 NES 2bpp 图块",
    meta: declaredText(entry, reference?.meta) || `$${hexByte(bankId)} · ${bankId}`,
    preview: visualChrPreviewMarkup({entry}),
    filter: [
      bankId,
      hexByte(bankId),
      `$${hexByte(bankId)}`,
      `0x${hexByte(bankId)}`,
      title,
      "1 KiB 64 tile NES 2bpp",
    ].join(" ").toLowerCase(),
  };
}

function paintVisualChrBank(canvas, bytes) {
  const tiles = decodeChrTiles(bytes);
  if (tiles.length !== 64) throw new TypeError("CHR bank 预览必须解出 64 个图块");
  const raster = createRaster(128, 32);
  tiles.forEach((tile, index) => paintChrTile(
    raster.data,
    raster.width,
    (index % 16) * 8,
    Math.floor(index / 16) * 8,
    tile,
    VISUAL_CHR_PREVIEW_PALETTE,
    {transparent: false},
  ));
  blitRaster(canvas, raster);
  canvas.dataset.visualChrBankPainted = "1";
  delete canvas.dataset.visualChrBankError;
}

function paintVisualChrError(canvas, error) {
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#170b0b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ff6b6b";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(6, 6);
    context.lineTo(canvas.width - 6, canvas.height - 6);
    context.moveTo(canvas.width - 6, 6);
    context.lineTo(6, canvas.height - 6);
    context.stroke();
  }
  canvas.dataset.visualChrBankError = String(error?.message || error);
}

async function paintVisualChrBankCanvases(root = document) {
  const selector = "canvas[data-shared-chr-bank-bank-preview]";
  const canvases = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ].filter(canvas => canvas.dataset.visualChrBankPainted !== "1");
  if (!canvases.length) return;
  const groups = new Map();
  canvases.forEach(canvas => {
    const bankId = chrBankId(canvas.dataset.sharedChrBankBankId);
    if (bankId === null) {
      paintVisualChrError(canvas, "CHR bank ID 无效");
      return;
    }
    if (!groups.has(bankId)) groups.set(bankId, []);
    groups.get(bankId).push(canvas);
  });
  await Promise.all([...groups].map(async ([bankId, targets]) => {
    try {
      const bytes = await loadChrBankBytes(bankId);
      targets.forEach(canvas => paintVisualChrBank(canvas, bytes));
    } catch (error) {
      targets.forEach(canvas => paintVisualChrError(canvas, error));
    }
  }));
}

async function prepareVisualChrComponent(props) {
  try {
    const entries = props.documentValue === undefined
      ? await loadVisualChrEntries() : validateChrBanks(props.documentValue);
    const requested = requestedChrBankId(props);
    return {
      ...props,
      entries,
      entry: props.entry
        || entries.find(entry => chrBankId(entry?.id) === requested) || null,
      error: entries.length ? "" : "shared-chr-bank 的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function patternPagePreviewMarkup(entry, ordinal) {
  const bankId = chrBankId(entry?.id);
  if (bankId === null) return "";
  return `<span class="module-reference-data-preview"
    style="padding:2px;display:flex;align-items:center">
    <canvas width="128" height="32" data-shared-chr-bank-bank-preview
      data-shared-chr-bank-bank-id="${bankId}"
      style="width:100%;height:auto;image-rendering:pixelated"
      aria-label="图案页 ${ordinal} 的像素预览"
      title="64 个 8×8 四阶图案；灰阶只表示像素值，不是运行时调色板"></canvas>
  </span>`;
}

function patternPageItem(entry, index) {
  const bankId = chrBankId(entry?.id);
  if (bankId === null) return null;
  const ordinal = index + 1;
  return {
    value: String(bankId),
    label: `图案页 ${ordinal}`,
    description: "64 个 8×8 四阶图案",
    meta: "shared-chr-bank owner",
    preview: patternPagePreviewMarkup(entry, ordinal),
    filter: `图案页 ${ordinal} shared-chr-bank owner`,
  };
}

async function prepareVisualChrPatternPageComponent(props) {
  const prepared = await prepareVisualChrComponent(props);
  if (prepared.error) return prepared;
  const requestedIds = props.candidateIds;
  if (!Array.isArray(requestedIds) || !requestedIds.length) {
    return {...prepared, entries: [], error: "图案页 owner 候选未声明"};
  }
  const ids = requestedIds.map(value => chrBankId(value));
  if (ids.some(id => id === null) || new Set(ids).size !== ids.length) {
    return {...prepared, entries: [], error: "图案页 owner 候选身份无效或重复"};
  }
  const byId = new Map(prepared.entries.map(entry => [chrBankId(entry?.id), entry]));
  const entries = ids.map(id => byId.get(id));
  if (entries.some(entry => !entry)) {
    return {...prepared, entries: [], error: "图案页 owner 候选不在 shared-chr-bank 中"};
  }
  const requested = requestedChrBankId(props);
  return {
    ...prepared,
    entries,
    entry: entries.find(entry => chrBankId(entry?.id) === requested) || null,
    error: "",
  };
}

function visualChrPatternPagePickerMarkup({
  entries = [],
  value = null,
  label = "图案页",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const items = entries.map(patternPageItem).filter(Boolean);
  const selectedValue = String(value ?? "");
  const current = items.find(item => item.value === selectedValue) || {
    value: selectedValue || "—",
    label: selectedValue ? "未解析的图案页" : "未选择图案页",
    description: "",
    meta: "shared-chr-bank owner",
    preview: "",
  };
  return referencePickerMarkup({
    moduleId: VISUAL_CHR_MODULE_ID,
    value: selectedValue,
    label,
    items,
    current,
    controlMarkup,
    componentAttributes,
    className: "shared-chr-bank-pattern-page-reference-field",
    filterLabel: "过滤图案页",
    filterPlaceholder: "按图案页序号过滤",
    unavailableReason: error,
    unavailableKind: error ? "load-failed" : "",
  });
}

function visualChrReferencePickerMarkup({
  entries = [],
  value = null,
  label = "CHR Bank",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  picker = {},
} = {}) {
  const bankId = chrBankId(value);
  return referenceFieldPickerMarkup({
    reference: {module: VISUAL_CHR_MODULE_ID},
    rows: entries,
    value: bankId === null ? value : String(bankId),
    label,
    controlMarkup,
    componentAttributes,
    error,
    picker,
  });
}

function metatileTitle(entry, moduleId) {
  const handle = recordHandle(entry, moduleId);
  if (moduleId === METATILE_PAGE_MODULE_ID) {
    return `元图块页 ${handle.split(":").at(-1)}`;
  }
  if (entry?.kind === "world-map-owned-records") return "世界地图元图块集";
  return `元图块集 ${handle.split(":").at(-1)}`;
}

function metatilePreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = ownerDefinition(moduleId);
  const identity = requestedHandle({moduleId, entry, handle, value});
  if (!identity || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || `${definition.label}引用未解析`)}</small></span>`;
  }
  const title = entry ? metatileTitle(entry, moduleId) : identity;
  return `<span class="module-reference-data-preview" style="padding:0"
    ${componentAttributes}><canvas width="144" height="88"
      style="width:100%;height:100%;object-fit:contain"
      data-semantic-metatile-preview data-semantic-metatile-module="${esc(moduleId)}"
      data-semantic-metatile-handle="${esc(identity)}"
      aria-label="${esc(`${title} tile ID 结构预览`)}"
      title="${esc(`${title}：色块只编码 tile ID 与属性原值，不是实机像素`)}"></canvas></span>`;
}

function semanticReferenceItem(entry, reference = null) {
  const moduleId = String(reference?.module || "");
  ownerDefinition(moduleId);
  const handle = recordHandle(entry, moduleId);
  if (!handle) return null;
  const declaredValue = declaredText(entry, reference?.key);
  const declaredDescription = declaredText(entry, reference?.description);
  let label;
  let description;
  if (moduleId === PALETTE_MODULE_ID) {
    label = paletteTitle(entry);
    description = `${paletteColors(entry).length} 个 NES 色号`;
  } else if (moduleId === METATILE_PAGE_MODULE_ID) {
    label = metatileTitle(entry, moduleId);
    description = `${entry.metatileCount ?? 64} 项`;
  } else {
    label = metatileTitle(entry, moduleId);
    description = entry.kind === "world-map-owned-records"
      ? `${entry.metatileCount ?? entry.metatile_definitions?.length ?? 0} 项`
      : '双页组合';
  }
  const preview = moduleId === PALETTE_MODULE_ID
    ? palettePreviewMarkup({moduleId, entry})
    : metatilePreviewMarkup({moduleId, entry});
  return {
    value: declaredValue || handle,
    label,
    description: declaredDescription || description,
    meta: declaredText(entry, reference?.meta) || handle,
    preview,
    filter: [
      handle,
      entry?.id,
      entry?.id_hex,
      entry?.kind,
      label,
      description,
      ...(sceneReferences(entry)),
      ...(entry?.set_references || []),
      entry?.lower_metatile_page,
      entry?.upper_metatile_page,
      ...paletteColors(entry).map(color => `$${hexByte(color)}`),
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function tileIdentityColor(value) {
  const tile = Number(value) & 0xff;
  const hue = (tile * 137.508) % 360;
  const lightness = 24 + ((tile >> 4) & 3) * 10;
  return `hsl(${hue.toFixed(2)} 42% ${lightness}%)`;
}

function attributeIdentityColor(value) {
  const attribute = Number(value) & 0xff;
  return `hsl(${(attribute * 47) % 360} 70% 67%)`;
}

function paintMetatileStructure(canvas, entry) {
  const context = canvas.getContext("2d");
  if (!context) throw new TypeError("浏览器不支持元图块结构画布");
  const definitions = entry.preview_definitions;
  const attributes = entry.preview_attributes;
  if (!Array.isArray(definitions) || !definitions.length
      || !Array.isArray(attributes) || attributes.length !== definitions.length) {
    throw new TypeError(`${entry.handle} 缺少结构预览正文`);
  }
  const columns = definitions.length <= 64 ? 8 : 16;
  const rows = Math.ceil(definitions.length / columns);
  const margin = 3;
  const cell = Math.max(2, Math.floor(Math.min(
    (canvas.width - margin * 2) / columns,
    (canvas.height - margin * 2) / rows,
  )));
  const originX = Math.floor((canvas.width - columns * cell) / 2);
  const originY = Math.floor((canvas.height - rows * cell) / 2);
  const half = Math.max(1, Math.floor(cell / 2));
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#090c0e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  definitions.forEach((tiles, index) => {
    const x = originX + (index % columns) * cell;
    const y = originY + Math.floor(index / columns) * cell;
    tiles.forEach((tile, quadrant) => {
      context.fillStyle = tileIdentityColor(tile);
      context.fillRect(
        x + (quadrant & 1) * half,
        y + (quadrant >> 1) * half,
        quadrant & 1 ? cell - half : half,
        quadrant >> 1 ? cell - half : half,
      );
    });
    context.fillStyle = attributeIdentityColor(attributes[index]);
    context.fillRect(x, y + cell - 1, cell, 1);
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
  });
  canvas.dataset.semanticMetatilePainted = "1";
  delete canvas.dataset.semanticMetatileError;
}

function paintMetatileError(canvas, error) {
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#170b0b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ff6b6b";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(12, 12);
    context.lineTo(canvas.width - 12, canvas.height - 12);
    context.moveTo(canvas.width - 12, 12);
    context.lineTo(12, canvas.height - 12);
    context.stroke();
  }
  canvas.dataset.semanticMetatileError = String(error?.message || error);
}

async function paintSemanticMetatileCanvases(root = document) {
  const selector = "canvas[data-semantic-metatile-preview]";
  const canvases = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ].filter(canvas => canvas.dataset.semanticMetatilePainted !== "1");
  if (!canvases.length) return;
  const groups = new Map();
  canvases.forEach(canvas => {
    const moduleId = String(canvas.dataset.semanticMetatileModule || "");
    if (!groups.has(moduleId)) groups.set(moduleId, []);
    groups.get(moduleId).push(canvas);
  });
  await Promise.all([...groups].map(async ([moduleId, targets]) => {
    try {
      const entries = await loadOwnerEntries(moduleId);
      const byHandle = new Map(entries.map(entry => [recordHandle(entry, moduleId), entry]));
      targets.forEach(canvas => {
        const handle = normalizeOwnerHandle(
          canvas.dataset.semanticMetatileHandle,
          moduleId,
        );
        const entry = byHandle.get(handle);
        if (!entry) throw new TypeError(`${handle || moduleId} 不在静态候选表中`);
        paintMetatileStructure(canvas, entry);
      });
    } catch (error) {
      targets.forEach(canvas => paintMetatileError(canvas, error));
    }
  }));
}

async function prepareSemanticOwnerComponent(props) {
  const moduleId = String(props.moduleId || "");
  ownerDefinition(moduleId);
  try {
    const entries = await loadOwnerEntries(moduleId);
    const requested = requestedHandle({...props, moduleId});
    return {
      ...props,
      entries,
      entry: props.entry
        || entries.find(entry => recordHandle(entry, moduleId) === requested) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function semanticReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = ownerDefinition(moduleId);
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value: normalizeOwnerHandle(value, moduleId) || value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(VISUAL_CHR_MODULE_ID, {
  item: visualChrReferenceItem,
  paint: paintVisualChrBankCanvases,
  className: "shared-chr-bank-reference-field",
  filterLabel: "过滤 CHR Bank",
  filterPlaceholder: "十进制／十六进制 Bank ID",
});

registerModuleComponent(VISUAL_CHR_MODULE_ID, "reference", {
  prepare: prepareVisualChrComponent,
  render: visualChrReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

// 怪物图形等消费页只拿不透明图案页候选：编号只用于 owner 内部写回，
// 候选名称、过滤词与预览均不把 CHR bank 编码泄漏给消费页。
registerModuleComponent(VISUAL_CHR_MODULE_ID, VISUAL_CHR_PATTERN_PAGE_REFERENCE_KIND, {
  prepare: prepareVisualChrPatternPageComponent,
  render: visualChrPatternPagePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(VISUAL_CHR_MODULE_ID, kind, {
    prepare: prepareVisualChrComponent,
    render: visualChrPreviewMarkup,
    hydrate: paintVisualChrBankCanvases,
  });
}

for (const [moduleId, definition] of Object.entries(OWNER_DEFINITIONS)) {
  const metatile = moduleId !== PALETTE_MODULE_ID;
  registerReferenceFieldPresentation(moduleId, {
    item: semanticReferenceItem,
    paint: metatile ? paintSemanticMetatileCanvases : undefined,
    className: "visual-semantic-reference-field",
    filterLabel: definition.filterLabel,
    filterPlaceholder: definition.filterPlaceholder,
  });

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareSemanticOwnerComponent,
    render: semanticReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareSemanticOwnerComponent,
      render: metatile ? metatilePreviewMarkup : palettePreviewMarkup,
      hydrate: metatile ? paintSemanticMetatileCanvases : undefined,
    });
  }
}
