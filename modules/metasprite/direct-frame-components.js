// @editor-module direct-frame owner 的精确引用供给
//
// 候选身份固定来自 direct-frame 正文；结构由 metasprite-record 正文交给既有 owner
// 解码器。这里刻意不选择 CHR bank 或调色板，只展示能由 owner 独立确认的网格结构。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {handleMarkup} from "../../ui/handle.js";
import {byteRecords} from "../../render/chr-raster.js";
import {decodeDirectFrames} from "../../render/metasprite.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const DIRECT_FRAME_MODULE_ID = "direct-frame";
const DIRECT_FRAME_STRUCTURE_RESOURCE_ID = "metasprite-record";
const EXPECTED_RECORDS = 69;
const POINTER_COUNT = 70;
const EXPECTED_SCHEMA = "metalmaxcn.semantic-owner.direct-frame.document";

function frameId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 1 && number <= EXPECTED_RECORDS
    ? number : null;
}

function idHex(value) {
  const id = frameId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle(value) {
  const match = /^direct-frame:([0-9a-f]{1,2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = frameId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${DIRECT_FRAME_MODULE_ID}:${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = frameId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : frameId(value);
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

function decodeStructure(documentValue) {
  const records = documentValue?.direct_frame_pointers;
  if (!Array.isArray(records) || records.length !== POINTER_COUNT) {
    throw new TypeError(`${DIRECT_FRAME_STRUCTURE_RESOURCE_ID} 缺少 ${POINTER_COUNT} 条直接帧指针记录`);
  }
  const pointers = new Uint16Array(POINTER_COUNT);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (!Number.isInteger(id) || id < 0 || id >= POINTER_COUNT || seen.has(id)
        || !Number.isInteger(pointer) || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${DIRECT_FRAME_STRUCTURE_RESOURCE_ID} 的直接帧指针记录无效`);
    }
    pointers[id] = pointer;
    seen.add(id);
  }
  const decoded = decodeDirectFrames(
    pointers,
    byteRecords(documentValue?.direct_frame_record_region, "direct_frame_record_region"),
  );
  return new Map(decoded.map(frame => [frame.id, {
    runtimeGenerated: Boolean(frame.runtimeGenerated),
    columns: Number(frame.columns),
    rows: Number(frame.rows),
    spriteCount: Array.isArray(frame.sprites) ? frame.sprites.length : 0,
    visibleSpriteCount: Array.isArray(frame.sprites)
      ? frame.sprites.filter(sprite => !sprite.transparentTile).length : 0,
  }]));
}

function validateEntries(ownerDocument, structureDocument) {
  const records = ownerDocument?.records;
  if (ownerDocument?.schema !== EXPECTED_SCHEMA
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS
      || Number(ownerDocument?.record_count) !== records.length) {
    throw new TypeError(`${DIRECT_FRAME_MODULE_ID} 必须发布 ${EXPECTED_RECORDS} 条 owner 记录`);
  }
  const structures = decodeStructure(structureDocument);
  const entries = records.map(record => {
    const id = frameId(record);
    const handle = normalizeHandle(record?.handle);
    const structure = structures.get(id);
    if (id === null || handle !== `${DIRECT_FRAME_MODULE_ID}:${idHex(id)}`
        || !structure || structure.runtimeGenerated
        || !Number.isInteger(structure.columns) || !Number.isInteger(structure.rows)) {
      throw new TypeError(`${record?.handle || DIRECT_FRAME_MODULE_ID} 缺少可用结构`);
    }
    return {id, id_hex: record.id_hex, handle, structure};
  });
  if (new Set(entries.map(entry => entry.handle)).size !== entries.length) {
    throw new TypeError(`${DIRECT_FRAME_MODULE_ID} 的候选身份重复`);
  }
  return entries;
}

function frameSummary(entry) {
  const structure = entry?.structure;
  if (!structure) return "网格结构由直接帧 owner 提供";
  return `${structure.columns}×${structure.rows} 网格 · ${
    structure.visibleSpriteCount} 个可见 sprite · ${structure.spriteCount} 个网格槽`;
}

function directFramePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>直接帧 ?</b><small>${esc(error || "直接帧引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-direct-frame-structure="${idHex(id)}">
    <b>${handleMarkup(`${DIRECT_FRAME_MODULE_ID}:${idHex(id)}`)}</b>
    <small>${esc(entry ? frameSummary(entry) : "结构预览等待 owner 正文")}</small>
  </span>`;
}

function directFrameReferenceItem(entry, reference = null) {
  const id = frameId(entry);
  const handle = normalizeHandle(entry?.handle);
  if (id === null || !handle) return null;
  const summary = frameSummary(entry);
  return {
    value: declaredText(entry, reference?.key) || handle,
    group: 'frame', groupLabel: '单帧形象', compactLabel: handle,
    label: '直接帧',
    description: summary,
    meta: handle,
    preview: directFramePreviewMarkup({entry}),
    filter: [id, idHex(id), handle, summary].join(" ").toLowerCase(),
  };
}

async function prepareDirectFrameComponent(props) {
  try {
    const [ownerDocument, structureDocument] = await Promise.all([
      db.getResourceDocument(DIRECT_FRAME_MODULE_ID, null),
      db.getResourceDocument(DIRECT_FRAME_STRUCTURE_RESOURCE_ID, null),
    ]);
    const entries = validateEntries(ownerDocument, structureDocument);
    const requested = requestedId(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => entry.id === requested) || null,
      error: "",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function directFrameReferencePickerMarkup({
  entries = [], value = null, label = "直接帧", controlMarkup = "",
  componentAttributes = "", error = "", reference = null, picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: DIRECT_FRAME_MODULE_ID, key: ["handle"]},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(DIRECT_FRAME_MODULE_ID, {
  item: directFrameReferenceItem,
  className: "direct-frame-reference-field",
  filterLabel: "过滤直接帧",
  filterPlaceholder: "ID／句柄／网格／sprite 数",
});

registerModuleComponent(DIRECT_FRAME_MODULE_ID, "reference", {
  prepare: prepareDirectFrameComponent,
  render: directFrameReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(DIRECT_FRAME_MODULE_ID, kind, {
    prepare: prepareDirectFrameComponent,
    render: directFramePreviewMarkup,
  });
}
