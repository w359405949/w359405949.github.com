// @editor-module 为 scene:XX 保留稳定的场景结构字段，并按已发布组件写回逻辑记录。
import {
  fieldByteLength,
  fieldFragmentId,
  fieldOffsetInFragment,
  fieldRomValue,
  ROM_WRITE_PENDING,
  validateFieldOverrides,
} from "./field-codec.js";
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";
import {
  encodeSceneMapStreamFields,
  validateSceneInvestigationSelector,
  SCENE_COMPILER_ID,
  SCENE_ID_MAXIMUM,
} from "./scene-compiler.js";

export const SCENE_CONFIG_RESOURCE_IDS = Object.freeze(Array.from(
  {length: 0xf0}, (_, id) => `scene:${id.toString(16).toUpperCase().padStart(2, "0")}`,
));

const BYTE = Object.freeze({min: 0, max: 0xff});
const SCENE_ID_RANGE = Object.freeze({min: 0, max: SCENE_ID_MAXIMUM});
const require = (condition, message) => {if (!condition) throw new TypeError(message);};

export function sceneDefaultMusicCommand(document) {
  const value = document?.scene?.music_command_id ?? document?.header_record?.[0x17]
    ?? document?.scene?.header_extension?.[7];
  return Number.isInteger(value) ? value : null;
}

export function sceneFieldChrAnimation(scene) {
  return Number(scene?.id) > 0 && (Number(scene?.header?.[0]) & 1)
    ? {initialStep: Number(scene.header_extension?.[8]) || 0} : null;
}

export function sceneTreasureContent(record, catalog) {
  const value = Number(record.content_id);
  const published = catalog.find(row => Number(row.id) === Number(record.id)
    && Number(row.scene_id) === Number(record.scene_id));
  if (published?.content_kind === 'buried-vehicle' && Number(published.content_id) === value)
    return {kind: 'buried-vehicle', vehicleSlot: published.vehicle_slot};
  if (value < 0xf0) return {kind: 'item', itemId: value};
  return {kind: 'money'};
}

export function worldCoarsePatternCells(raw, x, y, value) {
  const coarse = (y >> 2) * 64 + (x >> 2), reversed = (coarse & 7) ^ 7;
  const pair = (raw.selector_pairs[coarse >> 2] >> ((reversed & 3) * 2)) & 3;
  const bit = (raw.selector_bits[coarse >> 3] >> reversed) & 1;
  const bank = [0x15, 0x16, 6, 7][((pair & 2) >> 1) | (bit << 1)];
  const dictionary = raw.dictionaries[`0x${bank.toString(16).toUpperCase().padStart(2, '0')}`];
  require(Array.isArray(dictionary), '世界地图缺少当前粗格的字典');
  return Array.from({length: 16}, (_, index) => {
    const metatile_id = dictionary[(value | ((pair & 1) << 8)) * 16 + index];
    require(Number.isInteger(metatile_id), '世界地图粗格编号越界');
    return {x: (x & ~3) + index % 4, y: (y & ~3) + (index >> 2), metatile_id};
  });
}

function hex(value) {
  return Number(value).toString(16).toUpperCase().padStart(2, "0");
}

/**
 * 一份场景正文里的可编辑数据段：一段一个字段对象（约束第 13 条），段内一条记录一个
 * 句柄、记录内每个可编辑字节一列。段名、句柄前缀与句柄里的记录编号按编码器认的
 * 语义取（`core/scene-compiler.js` 的 `logicComponents`），记录身份是已发布的记录 id；
 * 增删记录会改动固定表，不属于编辑（已发布 `logic.writeback.fixed_record_counts`）。
 */
const SEGMENTS = Object.freeze([
  Object.freeze({
    id: "treasures", label: "调查物／宝箱", collection: Object.freeze(["logic", "layers", "treasures"]),
    prefix: "treasure",
    fields: Object.freeze([
      Object.freeze({name: "scene_id", label: "所属场景", ...SCENE_ID_RANGE,
        readOnly: true, immutableReason: "记录所属场景由 scene:XX 资源身份决定"}),
      Object.freeze({name: "x", label: "X", ...BYTE}),
      Object.freeze({name: "y", label: "Y", ...BYTE}),
      Object.freeze({name: "content_id", label: "内容（金钱 $F0–$FB）", min: 0, max: 0xfb}),
    ]),
  }),
  Object.freeze({
    id: "investigation-points", label: "设施调查点",
    collection: Object.freeze(["logic", "layers", "investigation_points"]), prefix: "investigation",
    fields: Object.freeze([
      Object.freeze({name: "x", label: "激活点 X", ...BYTE}),
      Object.freeze({name: "y", label: "激活点 Y", ...BYTE}),
      Object.freeze({name: "handler_selector", label: "分派选择值（≤ $0A）", min: 0, max: 0x0a}),
      Object.freeze({name: "instance_id", label: "实例（≤ $0F）", min: 0, max: 0x0f}),
    ]),
  }),
  Object.freeze({
    id: "boundary-exits", label: "边界出口",
    collection: Object.freeze(["logic", "layers", "transitions", "boundary_exits"]), prefix: "boundary",
    fields: Object.freeze([
      Object.freeze({name: "destination_scene_id", label: "目标场景", ...SCENE_ID_RANGE}),
      Object.freeze({name: "destination_x", label: "目标 X", ...BYTE}),
      Object.freeze({name: "destination_y", label: "目标 Y", ...BYTE}),
    ]),
  }),
  Object.freeze({
    id: "point-transitions", label: "门／传送入口",
    collection: Object.freeze(["logic", "layers", "transitions", "point_transitions"]), prefix: "transition",
    fields: Object.freeze([
      Object.freeze({name: "x", label: "入口 X", ...BYTE}),
      Object.freeze({name: "y", label: "入口 Y", ...BYTE}),
      Object.freeze({name: "destination_scene_id", label: "目标场景", ...SCENE_ID_RANGE}),
      Object.freeze({name: "destination_x", label: "目标 X", ...BYTE}),
      Object.freeze({name: "destination_y", label: "目标 Y", ...BYTE}),
    ]),
  }),
  // 专用调查点本模块持有这些字节，但没有发布写入口：保留编辑、关闭写入（约束第 10 条）。
  Object.freeze({
    id: "special-investigations", label: "专用调查点",
    collection: Object.freeze(["logic", "layers", "investigation_special_points"]),
    prefix: "investigation-special",
    writeback: ROM_WRITE_PENDING,
    fields: Object.freeze([
      Object.freeze({name: "x", label: "激活点 X", ...BYTE}),
      Object.freeze({name: "y", label: "激活点 Y", ...BYTE}),
    ]),
  }),
  // 图块调查与坐标事件是零字节视图；编辑留在 Working，不声明 ROM 写入。
  Object.freeze({
    id: "investigation-tiles", label: "调查图块",
    collection: Object.freeze(["logic", "layers", "metatile_investigation_points"]),
    prefix: "investigation-tile", idWidth: 4,
    writeback: ROM_WRITE_PENDING,
    fields: Object.freeze([
      Object.freeze({name: "x", label: "X", ...BYTE}),
      Object.freeze({name: "y", label: "Y", ...BYTE}),
      Object.freeze({name: "metatile_id", label: "元图块", ...BYTE,
        semantic: {kind: "image"}, metatile: true}),
      Object.freeze({name: "behavior_code", label: "行为码", ...BYTE}),
    ]),
  }),
  Object.freeze({
    id: "events", label: "坐标事件",
    collection: Object.freeze(["logic", "layers", "event_triggers"]),
    prefix: "event",
    writeback: ROM_WRITE_PENDING,
    fields: Object.freeze([
      Object.freeze({name: "scene_id", label: "所属场景", ...SCENE_ID_RANGE,
        readOnly: true, immutableReason: "记录所属场景由 scene:XX 资源身份决定"}),
      Object.freeze({name: "trigger_x", label: "触发 X", ...BYTE}),
      Object.freeze({name: "trigger_y", label: "触发 Y", ...BYTE}),
      Object.freeze({name: "event_flag", label: "事件位", ...BYTE, eventFlag: true}),
      Object.freeze({name: "story_state", label: "剧情状态", ...BYTE}),
    ]),
  }),
]);

function requireResourceId(resourceId) {
  if (!resourceId || !SCENE_CONFIG_RESOURCE_IDS.includes(resourceId)) {
    throw new TypeError(`场景字段 owner 身份无效：${resourceId || "（空）"}`);
  }
}

function mapHandle(resourceId, y) {
  return `${resourceId}:map:${hex(y)}`;
}

function recordHandle(resourceId, prefix, id, width = 2) {
  return `${resourceId}:${prefix}:${Number(id).toString(16).toUpperCase().padStart(width, "0")}`;
}

function logicPrefix(sceneId) {
  return `scene.logic.${sceneId.toString(16).padStart(2, "0")}`;
}

function segmentPhysical(segment, record, column, sceneId) {
  const prefix = logicPrefix(sceneId);
  const id = Number(record.id).toString(16).padStart(2, "0");
  if (segment.id === "treasures") {
    const compiled = Array.isArray(record.compiled_fields)
      ? record.compiled_fields : ["x", "y", "content_id"];
    return compiled.includes(column.name)
      ? {fragmentId: `${prefix}.treasure.${id}.${column.name}`,
        offsetInFragment: 0, byteLength: 1, componentLength: 1}
      : {};
  }
  if (segment.id === "investigation-points") {
    if (column.name === "x" || column.name === "y") return {
      fragmentId: `${prefix}.investigation.${id}.${column.name}`,
      offsetInFragment: 0, byteLength: 1, componentLength: 1,
    };
    return {
      fragmentId: `${prefix}.investigation.${id}.packed-handler-instance`,
      offsetInFragment: 0, byteLength: 1, componentLength: 1,
      bitMask: column.name === "handler_selector" ? 0x0f : 0xf0,
      bitShift: column.name === "handler_selector" ? 0 : 4,
    };
  }
  if (segment.id === "boundary-exits") return {
    fragmentId: `${prefix}.boundary.${id}.target`,
    offsetInFragment: ["destination_scene_id", "destination_x", "destination_y"].indexOf(column.name),
    byteLength: 1, componentLength: 3,
  };
  if (segment.id === "point-transitions") {
    if (column.name === "x" || column.name === "y") return {
      fragmentId: `${prefix}.transition.${id}.${column.name}`,
      offsetInFragment: 0, byteLength: 1, componentLength: 1,
    };
    return {
      fragmentId: `${prefix}.transition.${id}.target`,
      offsetInFragment: ["destination_scene_id", "destination_x", "destination_y"].indexOf(column.name),
      byteLength: 1, componentLength: 3,
    };
  }
  return {};
}

function rawComponentField(resourceId, {
  entityHandle,
  fieldName,
  documentPath,
  defaultValue,
  fragmentId,
  encoding = "bytes",
  immutableReason,
}) {
  const byteLength = encoding === "u16le" ? 2 : defaultValue.length;
  require(encoding === "u16le"
    ? Number.isInteger(defaultValue) && defaultValue >= 0 && defaultValue <= 0xffff
    : Array.isArray(defaultValue) && defaultValue.every(byte =>
      Number.isInteger(byte) && byte >= 0 && byte <= 0xff),
  `${resourceId} 原始组件值无效：${entityHandle}`);
  return {
    resourceId,
    entityHandle,
    fieldName,
    documentPath,
    defaultValue,
    ...(fragmentId === null ? {} : {fragmentId}),
    offsetInFragment: 0,
    byteLength,
    componentLength: byteLength,
    encoding,
    ...(immutableReason ? {readOnly: true, edit_policy: "immutable",
      immutable_reason: immutableReason} : {writeback: ROM_WRITE_PENDING}),
  };
}

function rawComponentFields(document, resourceId, sceneId) {
  const fields = [];
  if (document.header_pointer !== null && document.header_pointer !== undefined) {
    fields.push(rawComponentField(resourceId, {
      entityHandle: `${resourceId}:header-pointer`,
      fieldName: "value",
      documentPath: ["header_pointer", "value"],
      defaultValue: document.header_pointer.value,
      fragmentId: `scene.header-pointer.${sceneId.toString(16).padStart(2, "0")}`,
      encoding: "u16le",
      immutableReason: "header 指针由场景 header 的 ROM 位置决定",
    }));
  }
  if (document.scene.schema !== "metalmaxcn.world-map-package") {
    fields.push(rawComponentField(resourceId, {
      entityHandle: `${resourceId}:header`,
      fieldName: "bytes",
      documentPath: ["header_record"],
      defaultValue: document.header_record,
      fragmentId: `scene.header.${sceneId.toString(16).padStart(2, "0")}`,
      immutableReason: "header 原始记录由 header 与 header_extension 拼接决定",
    }));
    return fields;
  }
  const raw = document.world_raw;
  require(raw && typeof raw === "object", `${resourceId} 缺少 world_raw`);
  for (const key of [
    "coarse_map", "selector_pairs", "selector_bits",
    "metatile_definitions", "metatile_attributes", "palette_source",
  ]) fields.push(rawComponentField(resourceId, {
    entityHandle: `${resourceId}:world:${key}`,
    fieldName: "bytes",
    documentPath: ["world_raw", key],
    defaultValue: raw[key],
    fragmentId: key === "metatile_definitions" || key === "metatile_attributes"
      ? null : `scene.world.${key.replaceAll("_", "-")}`,
    ...(key === "metatile_definitions" || key === "metatile_attributes"
      ? {immutableReason: "世界元图块原始页由 metatile-set 自持记录决定"} : {}),
  }));
  for (const [key, value] of Object.entries(raw.dictionaries || {}).sort()) {
    fields.push({...rawComponentField(resourceId, {
      entityHandle: `${resourceId}:world:dictionary:${key}`,
      fieldName: "bytes",
      documentPath: ["world_raw", "dictionaries", key],
      defaultValue: value,
      fragmentId: `scene.world.dictionary.${key.toLowerCase().replace(/^0x/, "")}`,
    }), writeback: {target: "rom", state: "permitted"}});
  }
  for (const [key, value] of Object.entries(raw.background_chr_banks || {}).sort()) {
    fields.push(rawComponentField(resourceId, {
      entityHandle: `${resourceId}:world:background-bank:${key}`,
      fieldName: "bytes",
      documentPath: ["world_raw", "background_chr_banks", key],
      defaultValue: value,
      fragmentId: `scene.world.background-bank.${key.toLowerCase().replace(/^0x/, "")}`,
    }));
  }
  return fields;
}

function readPath(source, path) {
  return path.reduce((node, key) => (node === null || node === undefined ? undefined : node[key]), source);
}

function sceneIdOf(document) {
  const sceneId = document?.logic?.scene_id;
  require(Number.isInteger(sceneId) && sceneId >= 0 && sceneId <= SCENE_ID_MAXIMUM,
    `场景正文缺少 logic.scene_id：${sceneId ?? "（空）"}`);
  return sceneId;
}

/** 地图行是控制读法，文档形状不因此改变：一行一个字段，值是该行的图块编号。 */
function readMap(document, resourceId) {
  const scene = document?.scene;
  const map = scene?.map;
  require(Array.isArray(map) && map.length > 0, `${resourceId} 缺少 scene.map`);
  require(Number.isInteger(scene.width) && Number.isInteger(scene.height)
    && (scene.runtime_map?.source_height ?? scene.height) === map.length
    && map.every(row => Array.isArray(row) && row.length === (scene.runtime_map?.source_width ?? scene.width)),
  `${resourceId} 的场景地图与已发布宽高不一致`);
  for (const row of map) for (const cell of row) {
    require(Number.isInteger(cell) && cell >= 0 && cell <= 0xff,
      `${resourceId} 的地图图块必须是 0–255 整数`);
  }
  return map;
}

function readSegment(document, segment, resourceId, sceneId) {
  const rows = readPath(document, segment.collection);
  require(Array.isArray(rows), `${resourceId} 缺少 ${segment.collection.join(".")}`);
  const width = segment.idWidth ?? 2;
  const seen = new Set();
  for (const row of rows) {
    require(row && Number.isInteger(row.id) && row.id >= 0 && row.id < 16 ** width && !seen.has(row.id),
      `${resourceId} 的 ${segment.id} 记录身份无效`);
    seen.add(row.id);
    for (const column of segment.fields) {
      if (column.readOnly) continue;
      const value = row[column.name];
      require(Number.isInteger(value) && value >= column.min && value <= column.max,
        `${resourceId} 的 ${segment.id} $${hex(row.id)} 的 ${column.name} 必须是 `
        + `0x${hex(column.min)}–0x${hex(column.max)} 的整数`);
    }
    if (segment.id === "treasures") {
      require(row.scene_id === sceneId,
        `${resourceId} 的 ${segment.id} $${hex(row.id)} 不属于本场景`);
    }
  }
  return rows;
}

function eventMapFields(document, resourceId) {
  const scene = document.scene;
  return (scene.event_metatile_replacements || []).flatMap((group, index) => {
    const handle = `${resourceId}:event-map:${hex(index)}`;
    const coarse = group.coordinate_space === 'world-coarse-map';
    require(Number.isInteger(group.event_flag) && group.event_flag > 0 && group.event_flag <= 255
      && Array.isArray(group.replacements) && group.replacements.length > 0,
    `${handle} 事件位或替换列表无效`);
    const field = (entityHandle, fieldName, path, value) => ({resourceId, entityHandle, fieldName,
      documentPath: ['scene', 'event_metatile_replacements', index, ...path], defaultValue: value,
      writeback: ROM_WRITE_PENDING});
    return [field(handle, 'event_flag', ['event_flag'], group.event_flag),
      ...group.replacements.flatMap((cell, cellIndex) => {
        require(Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0
          && cell.x < (coarse ? 64 : scene.width) && cell.y < (coarse ? 64 : scene.height)
          && Number.isInteger(cell.metatile_id) && cell.metatile_id >= 0
          && cell.metatile_id < (coarse ? 256 : scene.metatile_definitions.length),
        `${handle} 替换坐标或图块无效`);
        if (coarse) worldCoarsePatternCells(document.world_raw, cell.x * 4, cell.y * 4, cell.metatile_id);
        return ['x', 'y', 'metatile_id'].map(name => field(`${handle}:${hex(cellIndex)}`, name,
          ['replacements', cellIndex, name], cell[name]));
      })];
  });
}

function sceneConfigFieldDescriptions(document, {resourceId} = {}) {
  requireResourceId(resourceId);
  const map = readMap(document, resourceId);
  const sceneId = sceneIdOf(document);
  const world = document.scene.schema === "metalmaxcn.world-map-package";
  const codec = document.scene.codec;
  const mapPhysical = world ? {writeback: ROM_WRITE_PENDING} : {
    fragmentId: `scene.map.${sceneId.toString(16).padStart(2, "0")}`,
    offsetInFragment: 0,
    byteLength: codec.allocation_bytes,
    componentLength: codec.allocation_bytes,
    mapCodec: {
      allocationBytes: codec.allocation_bytes,
      trailingValue: codec.trailing_padding_value ?? 0,
    },
  };
  const fields = map.map((row, y) => ({resourceId, entityHandle: mapHandle(resourceId, y),
    fieldName: "cells", rowIndex: y, rowLength: row.length, defaultValue: row,
    documentPath: ["scene", "map", y], ...mapPhysical}));
  for (const segment of SEGMENTS) {
    readSegment(document, segment, resourceId, sceneId).forEach((record, index) => {
      for (const column of segment.fields) fields.push({
        resourceId,
        entityHandle: recordHandle(resourceId, segment.prefix, record.id, segment.idWidth ?? 2),
        entityAliases: [`${segment.prefix}:${hex(sceneId)}:${hex(record.id)}`],
        recordId: record.id, fieldName: column.name, defaultValue: record[column.name],
        documentPath: [...segment.collection, index, column.name],
        ...segmentPhysical(segment, record, column, sceneId),
        ...(column.readOnly ? {readOnly: true, edit_policy: "immutable",
          immutable_reason: column.immutableReason} : {}),
        ...(segment.writeback ? {writeback: segment.writeback} : {}),
      });
    });
  }
  fields.push(...rawComponentFields(document, resourceId, sceneId));
  fields.push(...eventMapFields(document, resourceId));
  if (!world && Number.isInteger(document.scene.header_extension?.[6])) fields.push({
    resourceId, entityHandle: `${resourceId}:background`, fieldName: 'fill_metatile',
    documentPath: ['scene', 'header_extension', 6], defaultValue: document.scene.header_extension[6],
    writeback: ROM_WRITE_PENDING,
    sourceAddress: {space: 'prg', offset: document.scene.rom_ranges.header_record.offset + 22, length: 1},
  });
  if (!world && sceneDefaultMusicCommand(document) !== null) fields.push({
    resourceId, entityHandle: `${resourceId}:music`, fieldName: "command_id",
    documentPath: ["scene", "music_command_id"], defaultValue: sceneDefaultMusicCommand(document),
    writeback: ROM_WRITE_PENDING,
    evidence: "project/evidence/story-audio/scene-entry.json",
  });
  return fields;
}

/**
 * 数据段一个字段对象：地图一段一行一个图块行，记录数组一行一条记录、一列一个字节。
 * 记录的身份是已发布 id（约束第 16 条），物理位置未发布所以不声明片段。
 */
function sceneConfigObjects(document, {resourceId, offset = 0, limit} = {}) {
  requireResourceId(resourceId);
  const sceneId = sceneIdOf(document);
  const fields = sceneConfigFieldDescriptions(document, {resourceId});
  const objects = [];
  for (const [index, group] of (document.scene.event_metatile_replacements || []).entries()) {
    const handle = `${resourceId}:event-map:${hex(index)}`;
    const coarse = group.coordinate_space === 'world-coarse-map';
    const rows = group.replacements.map((_, cellIndex) => `${handle}:${hex(cellIndex)}`);
    objects.push({id: `${resourceId}.event-map.${hex(index)}`, label: '地图改写事件', fragmentIds: [],
      fields: [[handle, 'event_flag']], editor: {kind: 'numeric-table', rows: [handle],
        columns: [{name: 'event_flag', label: '事件位', min: 1, max: 255, eventFlag: true}]}},
    {id: `${resourceId}.event-map.${hex(index)}.cells`, label: '地图替换记录', fragmentIds: [],
      fields: rows.flatMap(row => ['x', 'y', 'metatile_id'].map(name => [row, name])),
      editor: {kind: 'numeric-table', rows, columns: [
        {name: 'x', label: coarse ? '粗格 X' : 'X', min: 0, max: coarse ? 63 : document.scene.width - 1},
        {name: 'y', label: coarse ? '粗格 Y' : 'Y', min: 0, max: coarse ? 63 : document.scene.height - 1},
        {name: 'metatile_id', label: coarse ? '粗格图案' : '元图块', min: 0,
          max: coarse ? 255 : document.scene.metatile_definitions.length - 1,
          ...(coarse ? {} : {semantic: {kind: 'image'}, metatile: {resourceId}})},
      ]}});
  }
  if (fields.some(field => field.entityHandle === `${resourceId}:background`)) objects.push({
    id: `${resourceId}.background`, label: '外围图块', fragmentIds: [],
    fields: [[`${resourceId}:background`, 'fill_metatile']],
    editor: {kind: 'numeric-table', rows: [`${resourceId}:background`], columns: [
      {name: 'fill_metatile', label: '外围图块', min: 0, max: 127,
        semantic: {kind: 'image'}, metatile: {resourceId}},
    ]},
  });
  if (fields.some(field => field.entityHandle === `${resourceId}:music`)) objects.push({
    id: `${resourceId}.music`, label: "入口音乐", fragmentIds: [],
    fields: [[`${resourceId}:music`, "command_id"]],
    editor: {kind: "numeric-table", rows: [`${resourceId}:music`], rowLabels: ["入口音乐"],
      columns: [{name: "command_id", label: "曲目", min: 0, max: 0xef}]},
  });
  if (document.scene.schema === "metalmaxcn.world-map-package") {
    const rawFields = fields.filter(field => field.entityHandle.startsWith(`${resourceId}:world:`))
      .sort((left, right) => Number(right.entityHandle.endsWith(":palette_source"))
        - Number(left.entityHandle.endsWith(":palette_source")));
    for (const field of rawFields) objects.push({
      id: `${resourceId}.world-raw.${field.entityHandle.slice(`${resourceId}:world:`.length)}`,
      label: `${resourceId} ${field.entityHandle.slice(`${resourceId}:world:`.length)}`,
      fragmentIds: [], fields: [[field.entityHandle, field.fieldName]],
      editor: {kind: "numeric-table", rows: [field.entityHandle],
        rowLabels: [field.entityHandle.slice(`${resourceId}:world:`.length)],
        columns: [{name: "bytes", label: "原始字节（0–255）", array: true,
          length: field.defaultValue.length, ...BYTE, semantic: {kind: "raw-bytes"}}]},
    });
  }
  const mapRows = fields.filter(field => field.fieldName === "cells");
  if (mapRows.length) objects.push({
    id: `${resourceId}.map`, label: `${resourceId} 地图图块`, fragmentIds: [],
    fields: mapRows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: mapRows.map(field => field.entityHandle),
      rowLabels: mapRows.map(field => `第 ${field.rowIndex + 1} 行`),
      columns: [{name: "cells", label: `图块（每行 ${mapRows[0].rowLength} 个 0–255）`,
        array: true, length: mapRows[0].rowLength, ...BYTE,
        semantic: {kind: "raw-bytes"}}]},
  });
  for (const segment of SEGMENTS) {
    const prefix = `${resourceId}:${segment.prefix}:`;
    const rows = fields.filter(field => field.entityHandle.startsWith(prefix));
    if (!rows.length) continue;
    const handles = [...new Set(rows.map(field => field.entityHandle))];
    objects.push({id: `${resourceId}.${segment.id}`, label: `${resourceId} ${segment.label}`, fragmentIds: [],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: handles,
        rowLabels: handles.map(handle => `${segment.label} $${handle.split(":").at(-1)}`),
        columns: segment.fields.map(column => ({name: column.name, label: column.label,
          min: column.min, max: column.max,
          ...(column.metatile ? {semantic: column.semantic, metatile: {resourceId}} : {}),
          ...(["x", "y", "trigger_x", "trigger_y"].includes(column.name)
            ? {semantic: {kind: "fixed-scene-coordinate", sceneId,
              fields: {x: segment.fields.some(field => field.name === "trigger_x") ? "trigger_x" : "x",
                y: segment.fields.some(field => field.name === "trigger_y") ? "trigger_y" : "y"}},
              ...(column.name === "x" || column.name === "trigger_x" ? {candidates: {
                document: "project.scenes", documentPath: ["editable_scenes"],
                value: ["id"], label: ["name"],
              }} : {})} : {}),
          ...(segment.id === "boundary-exits" || segment.id === "point-transitions"
            ? ["destination_scene_id", "destination_x", "destination_y"].includes(column.name)
              ? {semantic: {kind: "coordinate", fields: {scene: "destination_scene_id",
                x: "destination_x", y: "destination_y"}},
                ...(column.name === "destination_scene_id" ? {candidates: {
                  document: "project.scenes", documentPath: ["editable_scenes"],
                  value: ["id"], label: ["name"],
                }} : {})}
              : {}
            : {})}))}});
  }
  // 承载页按对象分页取数（`core/project-db.js` 的 offset/limit）。
  return limit === undefined ? objects.slice(offset) : objects.slice(offset, offset + limit);
}

export function sceneConfigFieldOwner(resourceId) {
  requireResourceId(resourceId);
  return Object.freeze({
    compilerId: SCENE_COMPILER_ID,
    bindingResourceId: "scene.config",
    ...(resourceId === "scene:00" ? {objectPageSize: 1} : {}),
    describe: (document, context = {}) => sceneConfigFieldDescriptions(document, {
      ...context, resourceId,
    }),
    validate: (original, overrides) => validateSceneConfigFieldOverrides(original, overrides, {resourceId}),
    objects: (document, context = {}) => sceneConfigObjects(document, {...context, resourceId}),
    encode: encodeSceneConfigFields,
    documentView: true,
    legacyClosed: true,
  });
}

function encodeSceneConfigFields(fields, {defaults = false, fragmentIds = null} = {}) {
  const components = new Map();
  const mapFields = new Map();
  for (const field of fields) {
    const fragmentId = fieldFragmentId(field);
    if (!fragmentId || (fragmentIds && !fragmentIds.has(fragmentId))) continue;
    const offset = fieldOffsetInFragment(field), length = fieldByteLength(field);
    require(Number.isInteger(offset) && offset >= 0,
      `${field.resourceId} 的场景字段物理范围无效`);
    const componentLength = Number(field.componentLength);
    require(Number.isInteger(componentLength) && componentLength >= offset + length,
      `${field.resourceId} 的场景组件长度无效：${fragmentId}`);
    if (field.mapCodec) {
      const rows = mapFields.get(fragmentId) || [];
      rows.push(field);
      mapFields.set(fragmentId, rows);
      continue;
    }
    let payload = components.get(fragmentId);
    if (!payload) {
      payload = new Uint8Array(componentLength);
      components.set(fragmentId, payload);
    }
    require(payload.length === componentLength, `场景组件长度冲突：${fragmentId}`);
    const value = fieldRomValue(field, {defaults});
    if (field.encoding === "bytes") {
      require(Array.isArray(value) && value.length === length
          && value.every(item => Number.isInteger(item) && item >= 0 && item <= 0xff),
      `${field.entityHandle}.${field.fieldName} 不是字节数组`);
      payload.set(value, offset);
      continue;
    }
    if (field.encoding === "u16le") {
      require(length === 2 && Number.isInteger(value) && value >= 0 && value <= 0xffff,
        `${field.entityHandle}.${field.fieldName} 不是 16 位整数`);
      payload[offset] = value & 0xff;
      payload[offset + 1] = value >> 8;
      continue;
    }
    require(length === 1, `${field.entityHandle}.${field.fieldName} 不是单字节字段`);
    require(Number.isInteger(value) && value >= 0 && value <= 0xff,
      `${field.entityHandle}.${field.fieldName} 不是字节`);
    if (field.bitMask !== undefined) {
      require(Number.isInteger(field.bitMask) && Number.isInteger(field.bitShift),
        `${field.entityHandle}.${field.fieldName} 位域无效`);
      payload[offset] = (payload[offset] & ~field.bitMask) | ((value << field.bitShift) & field.bitMask);
    } else {
      payload[offset] = value;
    }
  }
  for (const [fragmentId, rows] of mapFields) {
    rows.sort((left, right) => left.rowIndex - right.rowIndex);
    require(rows.every((field, index) => field.rowIndex === index),
      `${rows[0].resourceId} 的地图行不连续`);
    const data = rows.flatMap(field => {
      const row = fieldRomValue(field, {defaults});
      require(Array.isArray(row) && row.length === field.rowLength
          && row.every(value => Number.isInteger(value) && value >= 0 && value <= 0x7f),
      `${field.entityHandle}.${field.fieldName} 不是地图图块行`);
      return row;
    });
    const codec = rows[0].mapCodec;
    require(rows.every(field => JSON.stringify(field.mapCodec) === JSON.stringify(codec)),
      `${rows[0].resourceId} 的地图编码参数不一致`);
    components.set(fragmentId, encodeSceneMapStreamFields({
      data,
      allocationBytes: codec.allocationBytes,
      trailingValue: codec.trailingValue,
      allowExpansion: !defaults && rows.some(field => field.hasOverride),
    }).bytes);
  }
  return [...components.entries()].sort((left, right) => left[0].localeCompare(right[0]))
    .map(([fragment_id, payload]) => ({fragment_id, payload, relocations: []}));
}

/**
 * 覆盖只改段内的值：身份、条数与矩阵形状按原样复核；固定字段（记录所属场景）不接受覆盖。
 */
function validateSceneConfigFieldOverrides(original, overrides, {resourceId} = {}) {
  requireResourceId(resourceId);
  const descriptions = sceneConfigFieldDescriptions(original?.document, {resourceId});
  const fixed = new Set(descriptions
    .filter(field => field.readOnly)
    .map(field => JSON.stringify([field.entityHandle, field.fieldName])));
  for (const row of overrides) {
    if (fixed.has(JSON.stringify([row.entity_handle, row.field_name]))) {
      throw new TypeError(`${resourceId} 固定字段不能修改：${row.field_name}`);
    }
  }
  validateFieldOverrides(
    original, overrides,
    document => sceneConfigFieldDescriptions(document, {resourceId}),
    candidate => {
      if (candidate?.resource_id !== resourceId) {
        throw new TypeError(`${resourceId} 字段覆盖改变资源身份`);
      }
      readMap(candidate.document, resourceId);
      const sceneId = sceneIdOf(candidate.document);
      for (const segment of SEGMENTS) readSegment(candidate.document, segment, resourceId, sceneId);
      for (const field of descriptions.filter(row => row.entityHandle.includes(":world:")
        && !row.readOnly)) {
        const value = readPath(candidate.document, field.documentPath);
        require(Array.isArray(value) && value.length === field.defaultValue.length
          && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 0xff),
        `${resourceId} 世界原始字节形状无效：${field.entityHandle}`);
      }
      const scene = candidate.document.scene;
      eventMapFields(candidate.document, resourceId);
      if (descriptions.some(field => field.fieldName === 'fill_metatile')) {
        require(Number.isInteger(scene.header_extension[6]) && scene.header_extension[6] >= 0
          && scene.header_extension[6] < scene.metatile_definitions.length,
        `${resourceId} 外围图块必须属于当前元图块集`);
      }
      if (descriptions.some(field => field.entityHandle === `${resourceId}:music`)) {
        const music = sceneDefaultMusicCommand(candidate.document);
        require(Number.isInteger(music) && music >= 0 && music < 0xF0,
          `${resourceId} 曲目必须为 0–239 的整数`);
      }
      if (scene.schema !== "metalmaxcn.world-map-package") {
        encodeSceneMapStreamFields({
          data: scene.map.flat(),
          allocationBytes: scene.codec.allocation_bytes,
          trailingValue: scene.codec.trailing_padding_value ?? 0,
          allowExpansion: true,
        });
      }
      for (const row of candidate.document.logic.layers.investigation_points) {
        validateSceneInvestigationSelector(row.handler_selector, row.instance_id);
      }
    },
  );
}

export function sceneConfigFieldChanges(fields, document, {resetOriginal = false, previousDocument} = {}) {
  return fields.flatMap(field_ => {
    let value = document;
    for (const key of field_.documentPath) {
      if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return [];
      value = value[key];
    }
    if (previousDocument) {
      let previous = previousDocument;
      for (const key of field_.documentPath) previous = previous?.[key];
      if (previous !== undefined && canonicalJsonEqual(value, previous)) return [];
    } else if (canonicalJsonEqual(value, field_.value)) return [];
    return [resetOriginal && canonicalJsonEqual(value, field_.defaultValue)
      ? {field: field_, reset: true} : {field: field_, value: cloneJson(value)}];
  });
}
