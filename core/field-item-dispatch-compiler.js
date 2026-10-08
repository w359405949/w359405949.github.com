// @editor-module 场景道具分发两段代码块（八槽准备、登记表分发与目标选择）；写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const FIELD_ITEM_DISPATCH_OWNER = "field-item-dispatch";
const FIELD_ITEM_DISPATCH_SCHEMA = "metalmaxcn.field-ui-module.asset.field-item-dispatch";

const TABLES = [
  {name: "prepare_selected_field_item_use", label: "从所选八槽容器准备场景道具（代码）", length: 36,
    fragmentId: "field-item-dispatch.prepare-selected-item",
    path: ["prepare_selected_field_item_use", "values"]},
  {name: "dispatch_and_select_target", label: "登记表分发与人物目标选择（代码）", length: 97,
    fragmentId: "field-item-dispatch.dispatch-and-target-selection",
    path: ["dispatch_and_select_target", "values"]},
];

const codec = createNamedByteTablesOwner({owner: FIELD_ITEM_DISPATCH_OWNER,
  schema: FIELD_ITEM_DISPATCH_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const fieldItemDispatchObjects = codec.objects;
export const serializeFieldItemDispatchField = codec.serializeField;
export const fieldItemDispatchFieldOwner = codec.fieldOwner;
