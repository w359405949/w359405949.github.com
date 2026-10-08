// @editor-module 场景方向变换的两段字节表；写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const SCENE_DIRECTION_TRANSFORM_OWNER = "scene-direction-transform";
const SCENE_DIRECTION_TRANSFORM_SCHEMA = "metalmaxcn.field-ui-module.asset.scene-direction-transform";

const TABLES = [
  {name: "reverse_cardinal_direction", label: "反向方向表（0–3）", length: 4,
    fragmentId: "scene-direction-transform.bank1a-transform"},
  {name: "field_input_to_actor_facing", label: "输入到朝向表（0–4）", length: 5,
    fragmentId: "scene-direction-transform.fixed-transform"},
];

const codec = createNamedByteTablesOwner({owner: SCENE_DIRECTION_TRANSFORM_OWNER,
  schema: SCENE_DIRECTION_TRANSFORM_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const sceneDirectionTransformObjects = codec.objects;
export const serializeSceneDirectionTransformField = codec.serializeField;
export const sceneDirectionTransformFieldOwner = codec.fieldOwner;
