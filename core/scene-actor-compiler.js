// @editor-module 场景角色别名共用字段，交互绑定按发布许可序列化。
import {encodeSceneActorRecordFields, SCENE_COMPILER_ID, ACTOR_AUTONOMOUS_SCRIPT_COUNT} from "./scene-compiler.js";
import {fieldRomValue, validateFieldOverrides, fieldOffsetInFragment} from "./field-codec.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {SCENE_SERVICE_INSTANCE_COUNTS} from "./scene-service-families.js";

const SCENE_ACTOR_OWNER = "scene-actor";
const SCENE_ACTOR_FRAGMENTS = Object.freeze(["scene.actor.pointer-table", "scene.actor.record-region"]);
export const SCENE_ACTOR_FIELDS = Object.freeze([
  "actor_type", "direction", "x", "y", "direction_attributes", "text_region",
  "render_slot_marker", "interaction_or_record_id", "autonomous_script_id",
]);
const offsets = Object.freeze([0, 0, 1, 2, 1, 3, 3, 4, 5]);
const require = (ok, message) => {if (!ok) throw new TypeError(`scene-actor: ${message}`);};
const tableHandle = id => `scene-actor-table:${id.toString(16).toUpperCase().padStart(2, "0")}`;

export function sceneActorInteractionPermitted(values, permission) {
  if (!permission) return false;
  const selector = values.text_region, argument = values.interaction_or_record_id;
  if (!Number.isInteger(selector) || !Number.isInteger(argument)) return false;
  const domain = permission.interactions.find(row => row.selector === selector);
  return !!domain && (domain.arguments ? domain.arguments.includes(argument)
    : argument >= domain.argument_min && argument <= domain.argument_max);
}

export function sceneActorServiceInstance(selector, argument, permission) {
  return permission?.service_argument_instances?.[selector]?.[argument] ?? argument;
}

function groups(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const id = key(row);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row);
  }
  return [...grouped.values()];
}

function sceneActorFieldDescriptions(document) {
  require(document?.record_bytes === 6 && Array.isArray(document.records)
    && document.records.length === 639 && Array.isArray(document.tables)
    && document.tables.length === 250, "记录或指针表集合不完整");
  const records = document.records.map((record, position) => ({record, position}));
  const byUid = new Map(records.map(row => [row.record.uid, row]));
  require(byUid.size === records.length, "UID 重复");
  for (const {record} of records) {
    require(Number.isInteger(record.entry_id) && record.entry_id >= 0 && record.entry_id < 250
      && Number.isInteger(record.id) && record.id >= 0 && record.id <= 255
      && record.uid === `scene-actor:${record.entry_id.toString(16).toUpperCase().padStart(2, "0")}:${record.id.toString(16).toUpperCase().padStart(2, "0")}`
      && record.source?.space === "prg" && Number.isInteger(record.source.offset)
      && record.source.length === 6 && record.source.end_exclusive === record.source.offset + 6, "UID 或记录来源无效");
    encodeSceneActorRecordFields(record, record.uid);
  }
  const tables = document.tables.map((record, position) => ({record, position}));
  require(new Set(tables.map(row => row.record.entry_id)).size === 250, "指针表身份重复");
  const ranges = tables.filter(row => row.record.record_source);
  const start = Math.min(...ranges.map(row => row.record.record_source.offset));
  const end = Math.max(...ranges.map(row => row.record.record_source.end_exclusive));
  require(end - start === 3955, "记录组件容量已改变");
  const occupied = new Set(), referenced = new Set(), descriptions = [];
  const describe = (row, name, value, fragment, offset, length, aliases = [], extra = {}) => {
    const all = [row, ...aliases];
    return {resourceId: SCENE_ACTOR_OWNER, entityHandle: row.record.uid ?? tableHandle(row.record.entry_id),
      entityAliases: aliases.map(item => item.record.uid ?? tableHandle(item.record.entry_id)), fieldName: name,
      defaultValue: value, documentPath: [row.record.uid ? "records" : "tables", row.position, name],
      documentPaths: all.map(item => [item.record.uid ? "records" : "tables", item.position, name]),
      fragmentId: fragment, offsetInFragment: offset, byteLength: length, ...extra};
  };
  for (const row of tables) {
    const table = row.record, id = table.entry_id;
    require(Number.isInteger(id) && id >= 0 && id < 250
      && table.pointer_source?.space === "prg" && table.pointer_source.offset === document.pointer_table.prg_offset + id * 2
      && table.pointer_source.length === 2 && Number.isInteger(table.pointer_cpu)
      && table.pointer_cpu >= 0 && table.pointer_cpu <= 65535, "指针表物理身份无效");
    descriptions.push(describe(row, "pointer_cpu", table.pointer_cpu, SCENE_ACTOR_FRAGMENTS[0], id * 2, 2,
      [], {immutable: true, readOnly: true, edit_policy: "immutable",
        immutable_reason: "表指针由固定记录区位置决定", recordKind: "pointer"}));
    if (!table.record_source) {
      require(table.pointer_cpu === 0 && table.count === 0 && !table.record_uids.length, "空表结构无效");
      continue;
    }
    const source = table.record_source;
    require(source.space === "prg" && Number.isInteger(source.offset) && table.count === table.record_uids.length
      && source.length === 1 + table.count * 6 && source.end_exclusive === source.offset + source.length, "记录表容量无效");
    occupied.add(source.offset - start);
    table.record_uids.forEach((uid, index) => {
      const record = byUid.get(uid)?.record;
      require(record && record.source.offset === source.offset + 1 + index * 6, "表内 UID 与物理记录不一致");
      referenced.add(uid);
    });
  }
  require(referenced.size === records.length, "存在未被表引用的记录");
  for (const rows of groups(ranges, row => row.record.record_source.offset)) {
    rows.sort((a, b) => a.record.entry_id - b.record.entry_id);
    require(rows.every(row => row.record.count === rows[0].record.count), "别名表长度不一致");
    descriptions.push(describe(rows[0], "count", rows[0].record.count, SCENE_ACTOR_FRAGMENTS[1],
      rows[0].record.record_source.offset - start, 1, rows.slice(1), {immutable: true,
        readOnly: true, edit_policy: "immutable",
        immutable_reason: "表计数由固定 record_uids 数量决定", recordKind: "count"}));
  }
  const aliases = groups(records, row => row.record.source.offset);
  require(aliases.length === 629, "物理记录集合已改变");
  for (const rows of aliases) {
    rows.sort((a, b) => a.record.uid.localeCompare(b.record.uid));
    const primary = rows[0], offset = primary.record.source.offset - start;
    for (let byte = 0; byte < 6; byte++) {
      require(!occupied.has(offset + byte), "记录与表头重叠");
      occupied.add(offset + byte);
    }
    for (const [index, name] of SCENE_ACTOR_FIELDS.entries()) {
      require(rows.every(row => row.record[name] === primary.record[name]), "别名字段值不一致");
      descriptions.push(describe(primary, name, primary.record[name], SCENE_ACTOR_FRAGMENTS[1], offset + offsets[index],
        name === "direction_attributes" ? 2 : 1, rows.slice(1),
        {recordKind: "actor", recordOffset: offset,
          interactionPermission: document.writeback?.interaction_permission ?? null}));
    }
  }
  require(occupied.size === 3955 && [...occupied].every(offset => offset >= 0 && offset < 3955), "记录组件有缺口或越界");
  return descriptions;
}

function validateSceneActorFieldOverrides(original, overrides) {
  require(original?.resource_id === SCENE_ACTOR_OWNER, "资产身份无效");
  const descriptions = sceneActorFieldDescriptions(original.document);
  const immutable = new Map(descriptions.filter(field => field.immutable)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field.defaultValue]));
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]);
    require(!immutable.has(key) || canonicalJsonEqual(row.value, immutable.get(key)), "固定表结构不能改变");
  }
  validateFieldOverrides(original, overrides, sceneActorFieldDescriptions,
    candidate => {
      sceneActorFieldDescriptions(candidate.document);
      for (const [index, actor] of candidate.document.records.entries()) {
        const before = original.document.records[index];
        const selector = Number(actor.text_region);
        const argument = Number(actor.interaction_or_record_id);
        const selectorChanged = selector !== before.text_region;
        const argumentChanged = argument !== before.interaction_or_record_id;
        const permission = original.document.writeback?.interaction_permission;
        if (permission) {
          if (selectorChanged || argumentChanged) require(sceneActorInteractionPermitted(actor, permission),
            `${actor.uid} 的交互组合不在写入许可内`);
          if (actor.autonomous_script_id !== before.autonomous_script_id) require(
            actor.autonomous_script_id >= permission.autonomous_script_min
              && actor.autonomous_script_id <= permission.autonomous_script_max,
            `${actor.uid} 的自动动作脚本不在写入许可内`);
          continue;
        }
        if (!SCENE_SERVICE_INSTANCE_COUNTS.has(selector)) {
          require(Number.isInteger(selector) && selector >= 0 && selector <= 0x3f
            && Number.isInteger(argument) && argument >= 0 && argument <= 0xff,
          `${actor.uid} 的未发布交互值越界`);
          continue;
        }
        if (selectorChanged) {
          require(SCENE_SERVICE_INSTANCE_COUNTS.has(selector),
            `${actor.uid} 的服务选择码未取得写入许可`);
          require(actor.render_slot_marker === before.render_slot_marker,
            `${actor.uid} 切换服务时不能改变渲染槽`);
        }
        if (!selectorChanged && !argumentChanged) continue;
        const count = SCENE_SERVICE_INSTANCE_COUNTS.get(selector);
        require(Number.isInteger(count) && Number.isInteger(argument)
          && argument >= 0 && argument < count,
        `${actor.uid} 的服务实例不在配置族内`);
      }
    });
}

export function encodeSceneActorFields(fields, options = {}) {
  const pointers = new Uint8Array(500), packed = new Uint8Array(3955), coverage = new Set(), seen = new Set();
  const pointerOffsets = new Set();
  const records = new Map();
  let pointerCount = 0, countCount = 0;
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === SCENE_ACTOR_OWNER && !seen.has(key), "字段身份重复或来自其他 owner");
    seen.add(key);
    const offset = field.physical?.offsetInFragment ?? fieldOffsetInFragment(field);
    const value = fieldRomValue(field, options);
    if (field.immutable) {
      require(canonicalJsonEqual(field.value, field.defaultValue), "固定表字段已被修改");
      if (field.recordKind === "pointer") {
        require(field.fieldName === "pointer_cpu" && Number.isInteger(offset) && offset % 2 === 0 && offset >= 0 && offset < 500,
          "指针字段坐标无效");
        require(!pointerOffsets.has(offset) && Number.isInteger(value) && value >= 0 && value <= 65535, "指针字段值无效或重叠");
        pointerOffsets.add(offset);
        pointers[offset] = value & 255; pointers[offset + 1] = value >> 8; pointerCount++;
      } else {
        require(field.recordKind === "count" && field.fieldName === "count" && !coverage.has(offset), "计数字段无效或重叠");
        require(Number.isInteger(offset) && offset >= 0 && offset < packed.length
          && Number.isInteger(value) && value >= 0 && value <= 255, "计数字段坐标或值越界");
        packed[offset] = value; coverage.add(offset); countCount++;
      }
    } else {
      require(field.recordKind === "actor" && SCENE_ACTOR_FIELDS.includes(field.fieldName), "角色字段未登记");
      if (!records.has(field.entityHandle)) records.set(field.entityHandle,
        {draft: {}, rom: {}, origin: {}, offset: field.recordOffset,
          permission: field.physical ? field.physical.binding?.input?.actor_interaction_permission
            : field.interactionPermission});
      const record = records.get(field.entityHandle);
      require(record.offset === field.recordOffset, "同一记录的字段坐标不同");
      record.draft[field.fieldName] = field.value;
      record.rom[field.fieldName] = value;
      record.origin[field.fieldName] = field.defaultValue;
    }
  }
  require(pointerCount === 250 && countCount === 181 && records.size === 629 && fields.length === 6092, "字段集合不完整");
  for (const [uid, record] of records) {
    encodeSceneActorRecordFields(record.draft, uid);
    const interactionChanged = record.draft.text_region !== record.origin.text_region
      || record.draft.interaction_or_record_id !== record.origin.interaction_or_record_id;
    if (record.permission) {
      require(!interactionChanged || sceneActorInteractionPermitted(record.draft, record.permission),
        `${uid} 的交互组合不在写入许可内`);
      require(record.draft.autonomous_script_id >= record.permission.autonomous_script_min
        && record.draft.autonomous_script_id <= record.permission.autonomous_script_max,
        `${uid} 的自动动作脚本不在写入许可内`);
    } else if (!SCENE_SERVICE_INSTANCE_COUNTS.has(Number(record.draft.text_region))
        || record.draft.interaction_or_record_id >= SCENE_SERVICE_INSTANCE_COUNTS.get(record.draft.text_region)) {
      record.rom.text_region = record.origin.text_region;
      record.rom.interaction_or_record_id = record.origin.interaction_or_record_id;
    }
    const bytes = encodeSceneActorRecordFields(record.rom, uid);
    for (const [index, value] of bytes.entries()) {
      const offset = record.offset + index;
      require(!coverage.has(offset) && offset >= 0 && offset < packed.length, "角色字段字节重叠或越界");
      coverage.add(offset); packed[offset] = value;
    }
  }
  require(coverage.size === packed.length, "记录字段未覆盖组件");
  return [pointers, packed].map((payload, index) => ({fragment_id: SCENE_ACTOR_FRAGMENTS[index], payload, relocations: []}));
}

const SCENE_ACTOR_COLUMN_LABELS = new Map([
  ["actor_type", "类型 / 图形 ID"], ["direction", "朝向"], ["x", "X 坐标"], ["y", "Y 坐标"],
  ["direction_attributes", "移动与朝向属性"], ["text_region", "文本区"],
  ["render_slot_marker", "渲染槽标记"], ["interaction_or_record_id", "交互 / 记录 ID"],
  ["autonomous_script_id", "自主动作脚本 ID"],
]);
const SCENE_ACTOR_COLUMN_RANGES = new Map([
  ["actor_type", [0, 0x3f]], ["direction", [0, 3]], ["x", [0, 0x3f]], ["y", [0, 0x3f]],
  ["direction_attributes", [0, 0xf0]], ["render_slot_marker", [0, 3]],
  ["text_region", [0, 0x3f]], ["interaction_or_record_id", [0, 0xff]],
  ["autonomous_script_id", [0, ACTOR_AUTONOMOUS_SCRIPT_COUNT - 1]],
]);

/**
 * 记录区一个字段对象：629 条角色记录各一行，列是记录内共用字节的九个字段。
 * 定点表与计数表是固定表（`immutable`），不进控件。
 */
export function sceneActorObjects(document) {
  const rows = sceneActorFieldDescriptions(document).filter(field => !field.immutable);
  const handles = [...new Set(rows.map(field => field.entityHandle))];
  const previewScenesByEntry = Object.fromEntries(document.tables
    .filter(table => table.owner?.kind === "dynamic-variant")
    .map(table => [table.entry_id, table.owner.scene_id]));
  require(JSON.stringify(previewScenesByEntry) === JSON.stringify({247: 115, 248: 36, 249: 36}),
    "动态变体的已知出现场景已改变");
  return [{
    id: SCENE_ACTOR_FRAGMENTS[1],
    label: "场景角色记录",
    fragmentIds: [SCENE_ACTOR_FRAGMENTS[1]],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: handles, rowLabels: handles,
      columns: SCENE_ACTOR_FIELDS.map(name => {
        const range = SCENE_ACTOR_COLUMN_RANGES.get(name);
        return {name, label: SCENE_ACTOR_COLUMN_LABELS.get(name) ?? name,
          ...(range ? {min: range[0], max: range[1]} : {}),
          ...(name === "direction_attributes" ? {semantic: {kind: "bit-labels"}, bits: [
            {value: 0x10, label: "忽略碰撞"}, {value: 0x20, label: "可推动"},
            {value: 0x40, label: "停止步态"}, {value: 0x80, label: "固定朝向"},
          ]} : {}),
          ...(name === "text_region" ? {semantic: {kind: "value-dispatch-reference",
            targetModule: "text-record", relatedField: "interaction_or_record_id",
            references: ["record_references"]},
            candidates: {resourceId: "scene-actor",
              documentPath: ["interaction_semantics", "interaction_modes", 2, "regions"],
              value: ["selector"], label: ["selector_hex", "record_count"]}} : {}),
          ...(["x", "y"].includes(name)
            ? {semantic: {kind: "scene-actor-coordinate", sceneFromHandle: "scene-actor-entry",
              previewScenesByEntry, fields: {x: "x", y: "y"}},
              ...(name === "x" ? {candidates: {
                document: "project.scenes", documentPath: ["editable_scenes"],
                value: ["id"], label: ["name"],
              }} : {})} : {})};
      })},
  }];
}

export const sceneActorFieldOwner = Object.freeze({
  get compilerId() {return SCENE_COMPILER_ID;}, bindingResourceId: "scene.config", fragmentIds: SCENE_ACTOR_FRAGMENTS,
  describe: sceneActorFieldDescriptions, validate: validateSceneActorFieldOverrides, encode: encodeSceneActorFields,
  documentView: true, legacyClosed: true,
});
