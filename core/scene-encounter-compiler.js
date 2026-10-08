// @editor-module 把随机遇敌区的连续组件拆成字段对象；派生统计仍是页面投影。
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";
import {fieldRomValue, ROM_WRITE_PENDING, validateFieldOverrides, fieldFragmentId} from "./field-codec.js";

const SCENE_ENCOUNTER_OWNER = "scene-encounter-zone";
const SCENE_ENCOUNTER_COMPILER_ID = "scene-config/v1";
const ZONE_COUNT = 94;
const ENTRY_COUNT = 14;
const configFragment = "scene.encounter.config";
const entryFragment = id => `scene.encounter.entries.${id.toString(16).padStart(2, "0")}`;
const SCENE_ENCOUNTER_FRAGMENTS = Object.freeze([
  configFragment, ...Array.from({length: ZONE_COUNT - 1}, (_, index) => entryFragment(index + 1)),
]);
const hex2 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const handle = id => `${SCENE_ENCOUNTER_OWNER}:zone:${hex2(id)}`;
const require = (condition, message) => {if (!condition) throw new TypeError(message);};

function fieldsForZone(zone, position) {
  const fields = [{resourceId: SCENE_ENCOUNTER_OWNER, entityHandle: handle(zone.zone_id),
    recordId: zone.zone_id, fieldName: "config", defaultValue: zone.config,
    documentPath: ["zones", position, "config"], fragmentId: configFragment,
    offsetInFragment: zone.zone_id, byteLength: 1}];
  for (let slot = 0; slot < ENTRY_COUNT; slot += 1) fields.push({
    resourceId: SCENE_ENCOUNTER_OWNER, entityHandle: handle(zone.zone_id),
    recordId: zone.zone_id, fieldName: `entry.${slot}`,
    defaultValue: zone.entries[slot].monster_id,
    documentPath: ["zones", position, "entries", slot, "monster_id"],
    ...(zone.zone_id === 0 ? {} : {fragmentId: entryFragment(zone.zone_id), offsetInFragment: slot, byteLength: 1}),
    ...(zone.entries_editable ? {} : {writeback: ROM_WRITE_PENDING}),
  });
  return fields;
}

function sceneEncounterFieldDescriptions(document) {
  require(document?.zone_count === ZONE_COUNT && document.entry_slots_per_zone === ENTRY_COUNT
    && Array.isArray(document.zones) && document.zones.length === ZONE_COUNT,
    "遇敌区字段集合不完整");
  return document.zones.flatMap((zone, position) => {
    require(zone.zone_id === position && Array.isArray(zone.entries)
      && zone.entries.length === ENTRY_COUNT, "遇敌区稳定身份或槽位数量改变");
    return fieldsForZone(zone, position);
  }).concat(
    // 场景分配的稳定身份是这一行的场景号（已发布、112 行内唯一，值域 $80–$EF），
    // 不是数组下标（约束第 16 条）。
    (document.scene_zones?.assignments || []).map((row, index) => {
      const entityHandle = `${SCENE_ENCOUNTER_OWNER}:scene:${hex2(row.scene_id)}`;
      return [
        {resourceId: SCENE_ENCOUNTER_OWNER, entityHandle, recordId: row.scene_id,
          fieldName: "scene_id", defaultValue: row.scene_id, readOnly: true,
          edit_policy: "immutable", immutable_reason: "分配表场景号由记录身份决定",
          documentPath: ["scene_zones", "assignments", index, "scene_id"]},
        {resourceId: SCENE_ENCOUNTER_OWNER, entityHandle, recordId: row.scene_id,
          fieldName: "zone_id", defaultValue: row.zone_id,
          documentPath: ["scene_zones", "assignments", index, "zone_id"],
          writeback: ROM_WRITE_PENDING},
      ];
    }).flat(),
    (document.world_grid?.blocks || []).map((row, index) => ({
      resourceId: SCENE_ENCOUNTER_OWNER, entityHandle: `${SCENE_ENCOUNTER_OWNER}:world:${hex2(row.index ?? index)}`,
      recordId: row.index ?? index, fieldName: "zone_id", defaultValue: row.zone_id,
      documentPath: ["world_grid", "blocks", index, "zone_id"],
      writeback: ROM_WRITE_PENDING,
    })),
  );
}

/**
 * 一个 zone 一个字段对象：区域配置与外层槽位同属这一条记录，跨两个已发布组件
 * （配置字节在 `scene.encounter.config`，槽位在该 zone 自己的槽位组件；0 号区没有
 * 独立槽位组件）。场景分配与世界网格是两张只读侧表，各按自己那一段声明。
 */
function sceneEncounterObjects(document, {offset = 0, limit} = {}) {
  const fields = sceneEncounterFieldDescriptions(document);
  const byHandle = new Map();
  for (const field of fields) {
    const rows = byHandle.get(field.entityHandle) || [];
    rows.push(field);
    byHandle.set(field.entityHandle, rows);
  }
  const entryColumnLabel = field => field.fieldName === "config" ? "区域配置"
    : `${Number(field.fieldName.split(".")[1]) >= 10 ? "编队" : "怪物"}槽 ${Number(field.fieldName.split(".")[1]) + 1}`;
  const zoneObjects = document.zones.map(zone => {
    const zoneHandle = handle(zone.zone_id), rows = byHandle.get(zoneHandle) || [];
    return {id: zoneHandle, label: `遇敌区 $${zone.zone_id.toString(16).toUpperCase().padStart(2, "0")}`,
      fragmentIds: [...new Set(rows.map(fieldFragmentId).filter(fragmentId => fragmentId !== undefined))],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: [zoneHandle],
        rowLabels: [`遇敌区 $${zone.zone_id.toString(16).toUpperCase().padStart(2, "0")}`],
        columns: rows.map(field => {
          if (field.fieldName === "config") return {name: "config", label: "区域配置", min: 0, max: 255};
          const formation = Number(field.fieldName.split(".")[1]) >= 10;
          const targetModule = formation ? "encounter-formation" : "monster-profile";
          return {name: field.fieldName, label: entryColumnLabel(field), min: 0, max: 255,
            semantic: {kind: "reference", targetModule},
            candidates: {resourceId: targetModule, documentPath: ["records"], value: ["id"],
              label: formation ? ["id_hex", "label"] : ["id_hex", "name"]}};
        })}};
  });
  const sideTables = [
    {fragmentId: "scene.encounter.scene-table", prefix: `${SCENE_ENCOUNTER_OWNER}:scene:`,
      label: "场景分配", rowLabel: (row, index) => `场景 $${hex2(row[index]?.scene_id)}`,
      rows: document.scene_zones?.assignments || [], indexBy: "scene_id"},
    {fragmentId: "scene.encounter.world-grid", prefix: `${SCENE_ENCOUNTER_OWNER}:world:`,
      label: "世界网格", rowLabel: (row, index) => `区块 ${Number(row[index]?.cell_x)},${Number(row[index]?.cell_y)}`,
      rows: document.world_grid?.blocks || [], indexBy: "index"},
  ].map(table => {
    const rows = fields.filter(field => field.entityHandle.startsWith(table.prefix));
    const positions = new Map(table.rows.map((row, index) => [row?.[table.indexBy] ?? index, index]));
    return {id: table.fragmentId, label: `遇敌区 ${table.label}`, fragmentIds: [table.fragmentId],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "numeric-table", rows: [...new Set(rows.map(field => field.entityHandle))],
        rowLabels: [...new Set(rows.map(field => field.entityHandle))].map(handle_ =>
          table.rowLabel(table.rows, positions.get(rows.find(field =>
            field.entityHandle === handle_)?.recordId) ?? -1)),
        columns: [...new Set(rows.map(field => field.fieldName))].map(name => name === "scene_id"
          ? {name, label: "所属场景", min: 0, max: 0xef}
          : {name, label: "遇敌区", min: 0, max: ZONE_COUNT - 1})}};
  });
  const objects = [...zoneObjects, ...sideTables];
  // 承载页按对象分页取数（`core/project-db.js` 的 offset/limit）。
  return limit === undefined ? objects.slice(offset) : objects.slice(offset, offset + limit);
}

function validateSceneEncounterFieldOverrides(original, overrides) {
  const descriptions = sceneEncounterFieldDescriptions(original.document);
  const immutable = new Set(descriptions.filter(field => field.readOnly)
    .map(field => JSON.stringify([field.entityHandle, field.fieldName])));
  for (const row of overrides) require(!immutable.has(JSON.stringify([
    row.entity_handle, row.field_name])), "场景分配记录身份不能修改");
  validateFieldOverrides(original, overrides, sceneEncounterFieldDescriptions, candidate => {
    const expected = cloneJson(original);
    for (const field of descriptions) {
      const path = field.documentPath;
      const value = path.reduce((node, key) => node[key], candidate.document);
      path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] = value;
    }
    // config_hex, packed selectors, empty flags and counts are derived page data;
    // the published raw leaves above are the only mutable identity-bearing data.
    for (const [index, zone] of expected.document.zones.entries()) {
      zone.config_hex = original.document.zones[index].config_hex;
      zone.class_id = original.document.zones[index].class_id;
      zone.ambush_threshold_index = original.document.zones[index].ambush_threshold_index;
      zone.meter_initial_index = original.document.zones[index].meter_initial_index;
      zone.entries = zone.entries.map((entry, slot) => ({...original.document.zones[index].entries[slot],
        monster_id: entry.monster_id}));
    }
    for (const collection of ["assignments", "blocks"]) {
      const path = collection === "assignments"
        ? ["scene_zones", collection] : ["world_grid", collection];
      const candidateRows = path.reduce((node, key) => node?.[key], candidate.document) || [];
      const expectedRows = path.reduce((node, key) => node?.[key], expected.document) || [];
      candidateRows.forEach((row, index) => {
        if (expectedRows[index]) expectedRows[index].zone_id_hex = row.zone_id_hex;
      });
    }
    require(canonicalJsonEqual(candidate, expected), "遇敌区只允许修改已登记原始字段");
  });
}

function encodeSceneEncounterFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === SCENE_ENCOUNTER_OWNER && !values.has(key),
      "遇敌区字段身份重复或来自其他 owner");
    if (!fieldFragmentId(field)) continue;
    values.set(key, fieldRomValue(field, {defaults}));
  }
  const config = new Uint8Array(ZONE_COUNT);
  const entries = Array.from({length: ZONE_COUNT}, () => new Uint8Array(ENTRY_COUNT));
  for (let zone = 0; zone < ZONE_COUNT; zone += 1) {
    const entity = handle(zone);
    const configKey = JSON.stringify([entity, "config"]);
    require(values.has(configKey), `遇敌区配置字段缺失 ${zone}`);
    config[zone] = values.get(configKey); values.delete(configKey);
    // 0 号区没有独立槽位片段（`SCENE_ENCOUNTER_FRAGMENTS` 只列 1..93 号区），
    // 它的槽位值不在已发布写入面内，按 Original 留在文档里。
    if (zone === 0) continue;
    for (let slot = 0; slot < ENTRY_COUNT; slot += 1) {
      const key = JSON.stringify([entity, `entry.${slot}`]);
      require(values.has(key), `遇敌区槽位字段缺失 ${zone}/${slot}`);
      entries[zone][slot] = values.get(key); values.delete(key);
    }
  }
  require(values.size === 0, "遇敌区含未登记字段");
  // 场景分配表与世界网格是该 owner 名下的两个只读组件：字段逐字节铺开、写入许可未发布，
  // 构建按 Original 原样产出（`fieldRomValue` 对未发布字段取默认值）。
  const sideTables = [["scene.encounter.scene-table", `${SCENE_ENCOUNTER_OWNER}:scene:`],
    ["scene.encounter.world-grid", `${SCENE_ENCOUNTER_OWNER}:world:`]].map(([fragmentId, prefix]) => {
    const owned = fields.filter(field => String(field.entityHandle).startsWith(prefix))
      .filter(field => field.fieldName === "zone_id")
      .sort((left, right) => left.recordId - right.recordId);
    const payload = new Uint8Array(owned.length);
    owned.forEach((field, index) => {payload[index] = fieldRomValue(field, {defaults});});
    return {fragment_id: fragmentId, payload, relocations: []};
  });
  // 槽位片段只发布 1..93 号区（0 号区没有独立槽位片段）：产出与已发布组件一致。
  return [{fragment_id: configFragment, payload: config, relocations: []},
    ...entries.slice(1).map((payload, index) => ({fragment_id: entryFragment(index + 1),
      payload, relocations: []})),
    ...sideTables];
}

export const sceneEncounterFieldOwner = Object.freeze({
  compilerId: SCENE_ENCOUNTER_COMPILER_ID, bindingResourceId: "scene.config",
  fragmentIds: SCENE_ENCOUNTER_FRAGMENTS, describe: sceneEncounterFieldDescriptions,
  validate: validateSceneEncounterFieldOverrides, encode: encodeSceneEncounterFields,
  objects: sceneEncounterObjects,
  documentView: true, legacyClosed: true,
});
