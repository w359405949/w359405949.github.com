// @editor-module 遇敌选择器到全局事件标志的映射（选择器 0 的字节与 row43 编队共用，只读）；写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const ENCOUNTER_EVENT_FLAG_MAP_OWNER = "encounter-event-flag-map";
const ENCOUNTER_EVENT_FLAG_MAP_SCHEMA = "metalmaxcn.module-asset.encounter-event-flag-map";
const RECORDS = "encounter_selector_to_global_event_flag";
const FIELD = "global_event_flag_id";
const FIRST_SELECTOR = 1;
const LAST_SELECTOR = 15;

// 选择器 0 的字节被 row43 编队共用（physical_components.shared_consumers），不独立可编辑。
const TABLES = [
  {name: "event-flag-map", label: "选择器 0x0 事件标志（与 row43 编队共用字节，只读）", length: 1,
    fragmentId: "encounter-event-flag-map.event-flag-map", pathAt: () => [RECORDS, 0, FIELD],
    readOnly: true, immutableReason: "选择器 0 字节由 row43 编队共用，不能从本字段单独修改",
    labelAt: () => "选择器 0x0（共用字节）"},
  {name: "event-flags-01-0f", label: "选择器 0x1–0xF 事件标志", length: LAST_SELECTOR - FIRST_SELECTOR + 1,
    fragmentId: "encounter-event-flag-map.event-flags-01-0f",
    pathAt: index => [RECORDS, FIRST_SELECTOR + index, FIELD],
    labelAt: index => `选择器 0x${(FIRST_SELECTOR + index).toString(16).toUpperCase()}`},
];

const codec = createNamedByteTablesOwner({owner: ENCOUNTER_EVENT_FLAG_MAP_OWNER,
  schema: ENCOUNTER_EVENT_FLAG_MAP_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const encounterEventFlagMapObjects = codec.objects;
export const serializeEncounterEventFlagMapField = codec.serializeField;
export const encounterEventFlagMapFieldOwner = codec.fieldOwner;
