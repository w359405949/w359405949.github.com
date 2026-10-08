// @editor-module 固定字段列的静态引用声明与候选表读取
//
// 正式声明可写在单值列的 column.reference；一列绑定多个值时，写在对应的
// column.paths[N].reference。引用数组与带引用子字段的对象仍在同一处声明 container，
// 每个叶子绑定自己的精确数值路径，不把容器序列化成单个 picker 的值。一个候选表
// 同时发布多个实体 owner 时，用 targets.owner/domains 按发布字段分域；禁止把 ID 范围
// 复制进声明。候选来源必须在引用叶子里点名，禁止扫模块图、清单或运行时资源来猜。
// 本文件的 SAMPLE 只用于本机制分支，避免改 static-tables.js 与清单子线撞文件。

import "../core/code-provider.js";
import {esc} from "../core/dom.js";
import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {hydrateReferenceFieldPickers, prepareReferenceFieldPresentation, referenceFieldPickerMarkup} from "./reference-field.js";
import {configureChrContextTileSelector} from "./attack-chr-tile-selector.js";
import {bindReferenceControlProjection, setReferencePickerValue} from "./reference-picker.js";

const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const MISSING = Symbol("missing-reference-table");
const MULTI_TARGET_FIELDS = new Set(["owner", "domains"]);
const MULTI_TARGET_DOMAIN_FIELDS = new Set(["module", "ownerValues"]);
const DERIVED_HANDLE_FIELDS = new Set(["kind", "handle", "domains"]);
const DERIVED_HANDLE_DOMAIN_FIELDS = new Set(["prefixes", "reference"]);
const COMPOUND_MATCH_FIELDS = new Set(["kind", "bindings"]);
const COMPOUND_MATCH_BINDING_FIELDS = new Set(["source", "target"]);
const OPCODE_OPERAND_FIELDS = new Set(["kind", "codec", "references"]);
const OPCODE_REFERENCE_FIELDS = new Set(["token", "label", "reference"]);
const CONSUMER_DISPATCH_FIELDS = new Set(["kind", "source", "domains"]);
const CONSUMER_DISPATCH_DOMAIN_FIELDS = new Set(["values", "reference", "passthrough"]);
const CONSUMER_DISPATCH_PASSTHROUGH_FIELDS = new Set(["label", "description"]);
const CANDIDATE_UNION_FIELDS = new Set(["kind", "domains"]);
const CANDIDATE_UNION_DOMAIN_FIELDS = new Set(["reference"]);
const ENCODED_SCALAR_FIELDS = new Set(["kind", "codec"]);
const BIT_SLICE_FIELDS = new Set(["kind", "codec"]);
const LINKED_FIELDS = new Set([
  "kind", "codec", "paths", "primary", "length", "reorder",
]);
const PROVIDER_CODE_FIELDS = new Set(["kind", "role", "roles", "source"]);
const PROVIDER_REFERENCE_FIELDS = new Set(["module", "container"]);
const CONTEXT_AWARE_FIELDS = new Set(["codec", "consumer", "sources"]);
const CONTEXT_AWARE_SOURCE_FIELDS = new Set(["document", "resource", "path"]);
const CONTEXT_AWARE_SOURCES_FIELDS = new Set(["contexts", "candidates"]);
const NULLABLE_FIELDS = new Set(["label", "description", "meta"]);
const SENTINEL_FIELDS = new Set(["value", "label", "description", "meta"]);
const SCOPE_FIELDS = new Set(["path", "values", "source"]);
const CODEC_ID = /^[a-z0-9][a-z0-9._/-]*$/u;
const OPCODE_TOKEN = /^[a-z0-9][a-z0-9._:/-]*$/u;
const HANDLE_PREFIX = /^[a-z0-9][a-z0-9._-]*(?::[a-z0-9][a-z0-9._-]*)*$/u;
const opcodeOperandCodecs = new Map();
const encodedScalarCodecs = new Map();
const bitSliceCodecs = new Map();
const linkedFieldCodecs = new Map();
const contextAwareReferenceCodecs = new Map();
const CANDIDATE_FAILURE_KINDS = new Set([
  "unpublished-resource",
  "path-mismatch",
  "empty-domain",
  "load-failed",
]);

class ReferenceCandidateError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "ReferenceCandidateError";
    this.referenceCandidateKind = kind;
  }
}

function candidateError(kind, message) {
  if (!CANDIDATE_FAILURE_KINDS.has(kind)) {
    throw new TypeError(`引用候选失败类型无效：${kind}`);
  }
  return new ReferenceCandidateError(kind, message);
}

function candidateFailure(error, fallbackKind = "load-failed") {
  const declaredKind = String(error?.referenceCandidateKind || "");
  return {
    kind: CANDIDATE_FAILURE_KINDS.has(declaredKind) ? declaredKind : fallbackKind,
    reason: error?.message || String(error),
  };
}

export const SCENE_HANDLE_REFERENCE_CODEC_ID = "scene/opaque-handle/v1";

const SCENE_REFERENCE = Object.freeze({
  module: "scene-header-map",
  table: Object.freeze({
    document: "project.scenes",
    path: Object.freeze(["editable_scenes"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["name"]),
  description: Object.freeze(["slug"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
});

const SCENE_HANDLE_REFERENCE = Object.freeze({
  module: "scene-header-map",
  table: Object.freeze({
    document: "resource-index.scene",
    path: Object.freeze([]),
  }),
  key: Object.freeze(["uid"]),
  name: Object.freeze(["uid"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["game_id"]),
  preview: Object.freeze({component: "preview"}),
  scope: Object.freeze({
    path: Object.freeze(["kind"]),
    values: Object.freeze(["map-scene"]),
  }),
  container: Object.freeze({
    kind: "encoded-scalar",
    codec: SCENE_HANDLE_REFERENCE_CODEC_ID,
  }),
});

const FIXED_SCENE_REFERENCE_ARRAY = Object.freeze({
  ...SCENE_REFERENCE,
  container: Object.freeze({
    kind: "array",
    length: "fixed",
    size: 5,
    reorder: false,
  }),
});

const SCENE_ACTOR_TYPE_REFERENCE = Object.freeze({
  module: "actor-type",
  table: Object.freeze({
    resource: "actor-visual",
    path: Object.freeze(["actor_types"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["resource_id"]),
  description: Object.freeze(["motion_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({component: "preview"}),
  sentinels: Object.freeze([
    Object.freeze({
      value: 0x3f,
      label: "无形象",
      description: "场景角色明确不选择角色形象",
      meta: "保留值 63",
    }),
  ]),
});


const MONSTER_REFERENCE = Object.freeze({
  module: "monster-profile",
  table: Object.freeze({
    resource: "monster-profile",
    path: Object.freeze(["records"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["name"]),
  description: Object.freeze(["name_reference", "node_id"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["name"])}),
});

const ENCOUNTER_FORMATION_REFERENCE = Object.freeze({
  module: "encounter-formation",
  table: Object.freeze({
    resource: "battle-test-point",
    path: Object.freeze(["formations"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["writeback"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["label"])}),
});

function consumerScopedTextReference(targetPath, sourcePath) {
  return Object.freeze({
    module: "text-record",
    table: Object.freeze({
      document: "project.text-catalog",
      path: Object.freeze(["records"]),
    }),
    key: Object.freeze(["record"]),
    name: Object.freeze(["display_text"]),
    description: Object.freeze(["region_name"]),
    meta: Object.freeze(["node_id"]),
    preview: Object.freeze({path: Object.freeze(["unicode_preview"])}),
    scope: Object.freeze({
      path: Object.freeze([...targetPath]),
      source: Object.freeze([...sourcePath]),
    }),
  });
}

const SCENE_ACTOR_TEXT_REFERENCE = consumerScopedTextReference(
  ["region"],
  ["text_region"],
);

const STORY_INTERACTION_REFERENCE = Object.freeze({
  module: "story-interaction-script",
  table: Object.freeze({
    resource: "story-interaction-script",
    path: Object.freeze(["scripts"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["resource_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({path: Object.freeze(["label"])}),
});

const SCENE_ACTOR_INTERACTION_REFERENCE = Object.freeze({
  container: Object.freeze({
    kind: "consumer-dispatch",
    source: Object.freeze(["interaction_parameter_kind"]),
    domains: Object.freeze([
      Object.freeze({
        values: Object.freeze(["interaction-script-id"]),
        reference: STORY_INTERACTION_REFERENCE,
      }),
      Object.freeze({
        values: Object.freeze(["text-record-id"]),
        reference: SCENE_ACTOR_TEXT_REFERENCE,
      }),
      Object.freeze({
        values: Object.freeze(["service-argument"]),
        passthrough: Object.freeze({
          label: "服务参数",
          description: "当前语义分支是普通服务参数，不指向目标候选表",
        }),
      }),
      Object.freeze({
        values: Object.freeze(["none"]),
        passthrough: Object.freeze({
          label: "无主动交互",
          description: "当前语义分支明确不持有引用",
        }),
      }),
    ]),
  }),
});








export const SHELL_VISUAL_REFERENCE_CODEC_ID = "shell-record/visual-selector/v1";
export const AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID =
  "audio-voice/envelope-pointer/v1";
export const AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID =
  "audio-command/track-sequence-pointer/v1";
export const APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID =
  "application-config-family/configuration-pointer/v1";
export const INVESTIGATION_HANDLER_SELECTOR_CODEC_ID =
  "investigation/packed-handler-instance/v1";

const SHELL_VISUAL_REFERENCE = Object.freeze({
  module: "attack-visual",
  table: Object.freeze({
    resource: "attack-visual",
    path: Object.freeze(["records"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["handle"]),
  description: Object.freeze(["decode_status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "bit-slice",
    codec: SHELL_VISUAL_REFERENCE_CODEC_ID,
  }),
});

const AUDIO_VOICE_ENVELOPE_REFERENCE = Object.freeze({
  module: "audio-sequence",
  table: Object.freeze({
    resource: "audio-sequence",
    path: Object.freeze(["voice_table"]),
  }),
  key: Object.freeze(["pointer"]),
  name: Object.freeze(["pointer_hex"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["id_hex"])}),
  sentinels: Object.freeze([
    Object.freeze({
      value: 0xb705,
      label: "保留音色",
      description: "音色表明确保留、没有包络程序入口",
      meta: "0xB705",
    }),
  ]),
  container: Object.freeze({
    kind: "linked-fields",
    codec: AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["envelope_pointer_high"]),
      Object.freeze(["envelope_pointer_low"]),
    ]),
    primary: Object.freeze(["envelope_pointer_high"]),
  }),
});

const AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE = Object.freeze({
  module: "audio-sequence",
  table: Object.freeze({
    document: "audio-sequence",
    path: Object.freeze(["streams"]),
  }),
  key: Object.freeze(["entry_pointer"]),
  name: Object.freeze(["source_command_ids"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["channel_label"]),
  preview: Object.freeze({path: Object.freeze(["channel_label"])}),
  container: Object.freeze({
    kind: "linked-fields",
    codec: AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["track_sequence_pointer_high"]),
      Object.freeze(["track_sequence_pointer_low"]),
    ]),
    primary: Object.freeze(["track_sequence_pointer_high"]),
    length: "current",
    reorder: false,
  }),
});

const APPLICATION_CONFIG_FAMILY_REFERENCE = Object.freeze({
  module: "facility-config",
  table: Object.freeze({
    document: "project.facilities",
    path: Object.freeze(["configuration_loader", "pointer_entries"]),
  }),
  key: Object.freeze(["target_cpu"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["record_payload"]),
  meta: Object.freeze(["target_cpu_hex"]),
  preview: Object.freeze({path: Object.freeze(["family_id_hex"])}),
  container: Object.freeze({
    kind: "linked-fields",
    codec: APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["configuration_pointer_high"]),
      Object.freeze(["configuration_pointer_low"]),
    ]),
    primary: Object.freeze(["configuration_pointer_high"]),
  }),
});

const INVESTIGATION_HANDLER_REFERENCE = Object.freeze({
  module: "investigation-command",
  table: Object.freeze({
    document: "project.facilities",
    path: Object.freeze(["investigation", "commands"]),
  }),
  key: Object.freeze(["investigation_selector"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["kind"]),
  meta: Object.freeze(["command_id_hex"]),
  preview: Object.freeze({path: Object.freeze(["command_id_hex"])}),
  container: Object.freeze({
    kind: "bit-slice",
    codec: INVESTIGATION_HANDLER_SELECTOR_CODEC_ID,
  }),
});

const DEAD_ACTOR_TYPE_REFERENCE_ARRAY = Object.freeze({
  module: "actor-type",
  table: Object.freeze({
    resource: "actor-visual",
    path: Object.freeze(["actor_types"]),
  }),
  key: Object.freeze(["resource_id"]),
  name: Object.freeze(["resource_id"]),
  description: Object.freeze(["motion_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "array",
    length: "current",
    reorder: false,
  }),
});

const DEFAULT_FIELD_ITEM_HANDLER_PROVIDER = Object.freeze({
  module: "field-item-use",
  container: Object.freeze({
    kind: "provider-code",
    role: "code:default-field-item-handler",
  }),
});

// battle-test-point 已结构化发布实际 handler 入口；provider 只把该标量交给 owner
// 做身份匹配，不在字段层从 stored pointer 复刻「入口减一」编码。
const BATTLE_TEST_HANDLER_PROVIDER = Object.freeze({
  module: "nearby-object-investigation-service",
  container: Object.freeze({
    kind: "provider-code",
    source: Object.freeze(["handler_cpu"]),
    roles: Object.freeze([
      "code:battle-test-handler",
      "code:original-wardrobe-handler",
    ]),
  }),
});




const OPCODE_OPERAND_CODEC_SAMPLE_ID = "contract.attack-visual/v1";

export const ATTACK_VISUAL_COMMANDS_CODEC_ID = "attack-visual/commands/v1";
export const ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID =
  "attack-visual-aux-script/commands/v1";

function publishedOperandReference(module, resource, {
  name,
  description,
  preview,
}) {
  return Object.freeze({
    module,
    table: Object.freeze({resource, path: Object.freeze(["records"])}),
    key: Object.freeze(["id"]),
    name: Object.freeze([name]),
    description: Object.freeze([description]),
    meta: Object.freeze(["id_hex"]),
    preview: Object.freeze(preview),
  });
}

const PUBLISHED_ATTACK_VISUAL_OPERAND_REFERENCE = publishedOperandReference(
  "attack-visual",
  "attack-visual",
  {name: "handle", description: "decode_status", preview: {component: "preview"}},
);
const PUBLISHED_AUX_SCRIPT_OPERAND_REFERENCE = publishedOperandReference(
  "attack-visual-aux-script",
  "attack-visual-aux-script",
  {name: "handle", description: "decode_status", preview: {path: Object.freeze(["handle"])}},
);
const PUBLISHED_AUDIO_COMMAND_OPERAND_REFERENCE = publishedOperandReference(
  "audio-command",
  "audio-command",
  {name: "label", description: "status", preview: {component: "preview"}},
);
const PUBLISHED_BATTLE_ACTION_OPERAND_REFERENCE = publishedOperandReference(
  "battle-action",
  "battle-action",
  {name: "handle", description: "layout_reference", preview: {path: Object.freeze(["handle"])}},
);
const PUBLISHED_SPRITE_PALETTE_OPERAND_REFERENCE = publishedOperandReference(
  "sprite-palette",
  "sprite-palette",
  {name: "handle", description: "consumer_status", preview: {path: Object.freeze(["id_hex"])}},
);

function attackVisualCommandReference(codec) {
  return Object.freeze({
    container: Object.freeze({
      kind: "opcode-operands",
      codec,
      references: Object.freeze([
        Object.freeze({
          token: "visual_code",
          label: "嵌套攻击视觉",
          reference: PUBLISHED_ATTACK_VISUAL_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "script_id",
          label: "辅助脚本",
          reference: PUBLISHED_AUX_SCRIPT_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "sound_id",
          label: "音频命令",
          reference: PUBLISHED_AUDIO_COMMAND_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "action",
          label: "战斗动作",
          reference: PUBLISHED_BATTLE_ACTION_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "sprite_palette",
          label: "战斗精灵调色板",
          reference: PUBLISHED_SPRITE_PALETTE_OPERAND_REFERENCE,
        }),
      ]),
    }),
  });
}

const ATTACK_VISUAL_COMMAND_REFERENCE = attackVisualCommandReference(
  ATTACK_VISUAL_COMMANDS_CODEC_ID,
);
const ATTACK_VISUAL_AUX_COMMAND_REFERENCE = attackVisualCommandReference(
  ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID,
);


function structuredField(path, label, definition = {}) {
  return Object.freeze({
    path: Object.freeze([...path]),
    label,
    ...definition,
  });
}

function fixedObjectArray(size, fields) {
  return Object.freeze({
    kind: "array",
    length: "fixed",
    size,
    reorder: false,
    fields: Object.freeze(fields),
  });
}

const WANTED_DEFAULT_PAIR_REFERENCE = Object.freeze({
  container: Object.freeze({
    kind: "object",
    fields: Object.freeze([
      structuredField(["high_target_id"], "高半字节编队", {
        reference: ENCOUNTER_FORMATION_REFERENCE,
      }),
      structuredField(["low_target_id"], "低半字节编队", {
        reference: ENCOUNTER_FORMATION_REFERENCE,
      }),
    ]),
  }),
});

const ENCOUNTER_ENTRY_REFERENCE = Object.freeze({
  container: fixedObjectArray(14, [
    structuredField(["slot"], "候选槽", {readOnly: true}),
    structuredField(["monster_id"], "怪物", {reference: MONSTER_REFERENCE}),
  ]),
});

const INVESTIGATION_SPECIAL_COMPOUND_REFERENCE = Object.freeze({
  module: "investigation-special",
  table: Object.freeze({
    document: "project.scenes.logic",
    path: Object.freeze(["investigation_special_points"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["description"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "compound-match",
    bindings: Object.freeze([
      Object.freeze({
        source: Object.freeze(["scene_id"]),
        target: Object.freeze(["scene_id"]),
      }),
      Object.freeze({source: Object.freeze(["x"]), target: Object.freeze(["x"])}),
      Object.freeze({source: Object.freeze(["y"]), target: Object.freeze(["y"])}),
    ]),
  }),
});

export const ACTOR_MOTION_CHR_TILE_CODEC_ID = "shared-chr-bank/actor-motion-tile";

function sample(moduleId, tableId, columnId, path, reference) {
  return Object.freeze({
    moduleId,
    tableId,
    columnId,
    path: Object.freeze([...path]),
    reference,
  });
}

/**
 * 已发布的 battle-test component 用 scene/x/y 三个数值共同指向一个专用调查实体。
 * owner 关系只读反查；承载这些引用键的原始数值仍沿字段表自己的写回链编辑。
 */
const COMPOUND_MATCH_REFERENCE_SAMPLE = sample(
  "battle-test-point",
  "component:component",
  "component:scene-id",
  ["scene_id"],
  INVESTIGATION_SPECIAL_COMPOUND_REFERENCE,
);

/** 机制样例；正式逐列清单由 editor-reference-inventory 写回列声明。 */
const REFERENCE_FIELD_SAMPLES = Object.freeze([
  sample("battle-test-point", "field:fields", "field:scene-id", ["scene_id"],
    SCENE_REFERENCE),
  sample("field-scene-lifecycle-service", "records", "scene_reference",
    ["scene_reference"], SCENE_HANDLE_REFERENCE),
  sample("cutscene", "segment:segment", "segment:story-mode-scene-table",
    ["bytes"], FIXED_SCENE_REFERENCE_ARRAY),
  sample("wanted-record", "component:component", "component:default-pair",
    ["default_pair"], WANTED_DEFAULT_PAIR_REFERENCE),
  sample("encounter-zone", "definition:scene.encounter", "scene.encounter.entries",
    ["entries"], ENCOUNTER_ENTRY_REFERENCE),
  COMPOUND_MATCH_REFERENCE_SAMPLE,
  sample("scene-actor", "field:actor-record", "field:actor-record.actor-type-direction",
    ["actor_type"], SCENE_ACTOR_TYPE_REFERENCE),
  sample(
    "scene-actor",
    "field:actor-record",
    "field:actor-record.interaction-record-service-parameter",
    ["interaction_or_record_id"],
    SCENE_ACTOR_INTERACTION_REFERENCE,
  ),
  sample("shell-record", "field:fields", "field:shell-visual",
    ["visual_packed"], SHELL_VISUAL_REFERENCE),
  sample("audio-voice", "field:fields", "field:envelope-pointer-high",
    ["envelope_pointer_high"], AUDIO_VOICE_ENVELOPE_REFERENCE),
  sample("audio-voice", "field:fields", "field:envelope-pointer-low",
    ["envelope_pointer_low"], AUDIO_VOICE_ENVELOPE_REFERENCE),
  sample("application-config-family", "field:fields", "field:configuration-pointer-high",
    ["configuration_pointer_high"], APPLICATION_CONFIG_FAMILY_REFERENCE),
  sample("application-config-family", "field:fields", "field:configuration-pointer-low",
    ["configuration_pointer_low"], APPLICATION_CONFIG_FAMILY_REFERENCE),
  sample("audio-command", "field:header", "field:header:track-sequence-pointer-high",
    ["track_sequence_pointer_high"], AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE),
  sample("audio-command", "field:header", "field:header:track-sequence-pointer-low",
    ["track_sequence_pointer_low"], AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE),
  sample(
    "investigation",
    "definition:scene.logic.investigation",
    "scene.logic.investigation.packed-handler-instance",
    ["packed_handler_instance"],
    INVESTIGATION_HANDLER_REFERENCE,
  ),
  sample("party-field-actor-type-map", "declared-fields", "dead_actor_type",
    ["dead_actor_types"], DEAD_ACTOR_TYPE_REFERENCE_ARRAY),
  sample("field-item-dispatch", "declared-fields", "pointer:default-field-item-handler",
    ["default_field_item_handler"], DEFAULT_FIELD_ITEM_HANDLER_PROVIDER),
  sample("attack-visual", "declared-fields", "commands",
    ["commands"], ATTACK_VISUAL_COMMAND_REFERENCE),
  sample("attack-visual-aux-script", "declared-fields", "commands",
    ["commands"], ATTACK_VISUAL_AUX_COMMAND_REFERENCE),
  sample("battle-test-point", "field:fields", "field:handler-pointer",
    ["sources", "handler-pointer"], BATTLE_TEST_HANDLER_PROVIDER),
]);

/**
 * 多目标机制的隔离样例。table/column 是合同专用身份，不会套到正式 item-entry 列；
 * 清单线闭合真实 consumer 路径后，可把同一 reference 形状写进对应列声明。
 */

/** 两张独立 owner 表的键域并入同一个标量 picker；不复制 selector 编码规则。 */

/** 派生句柄与 opcode operand 的隔离样例；均不匹配正式列身份。 */


/** null 是静态声明的合法哨兵；非 null 值仍指向同一张精确候选表。 */

/** 同一机制也覆盖 battle-action 当前发布的字符串句柄/null 联合值。 */

/**
 * 目标键只在一个 owner 子域内唯一时，由同一 consumer 行的显式路径约束候选域。
 * 两个样例分别覆盖数值 region 与字符串 region；机制不得在两者之间做隐式换算。
 */

/**
 * 同一 consumer 标量由同行的语义判别字段决定目标 owner，或明确落在非引用分支。
 * domain 只列发布端给出的语义枚举，不复制 selector 区间、位掩码或解码规则。
 */

function identity(moduleId, tableId, columnId, path) {
  return JSON.stringify([String(moduleId || ""), String(tableId || ""),
    String(columnId || ""), path]);
}


function requirePath(path, label, {allowEmpty = true} = {}) {
  if (!Array.isArray(path) || (!allowEmpty && !path.length)
      || path.some(segment => !(typeof segment === "string" || Number.isInteger(segment)))) {
    throw new TypeError(`${label} 必须是${allowEmpty ? "" : "非空"}静态路径数组`);
  }
  return path;
}

function hasReferenceTarget(reference) {
  return Object.hasOwn(reference, "module") || Object.hasOwn(reference, "targets");
}

function validateNullable(nullable, context) {
  if (!nullable || typeof nullable !== "object" || Array.isArray(nullable)) {
    throw new TypeError(`${context}.nullable 必须是对象`);
  }
  const unexpectedFields = Object.keys(nullable).filter(field =>
    !NULLABLE_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}.nullable 只允许 label/description/meta`);
  }
  if (typeof nullable.label !== "string" || !nullable.label.trim()) {
    throw new TypeError(`${context}.nullable.label 必须是非空字符串`);
  }
  for (const field of ["description", "meta"]) {
    if (nullable[field] !== undefined && typeof nullable[field] !== "string") {
      throw new TypeError(`${context}.nullable.${field} 必须是字符串`);
    }
  }
}

function validateSentinels(sentinels, context) {
  if (!Array.isArray(sentinels) || !sentinels.length) {
    throw new TypeError(`${context}.sentinels 必须是非空静态数组`);
  }
  const exactValues = new Set();
  const pickerValues = new Set();
  sentinels.forEach((sentinel, index) => {
    const sentinelContext = `${context}.sentinels[${index}]`;
    if (!sentinel || typeof sentinel !== "object" || Array.isArray(sentinel)) {
      throw new TypeError(`${sentinelContext} 必须是对象`);
    }
    const unexpectedFields = Object.keys(sentinel).filter(field =>
      !SENTINEL_FIELDS.has(field));
    if (unexpectedFields.length) {
      throw new TypeError(
        `${sentinelContext} 只允许 value/label/description/meta；不接受范围、掩码或 resolver`,
      );
    }
    const type = typeof sentinel.value;
    if (!new Set(["number", "string"]).has(type)
        || (type === "number" && !Number.isFinite(sentinel.value))
        || (type === "string" && !sentinel.value.trim())) {
      throw new TypeError(`${sentinelContext}.value 必须是非空字符串或有限数字`);
    }
    if (typeof sentinel.label !== "string" || !sentinel.label.trim()) {
      throw new TypeError(`${sentinelContext}.label 必须是非空字符串`);
    }
    for (const field of ["description", "meta"]) {
      if (sentinel[field] !== undefined && typeof sentinel[field] !== "string") {
        throw new TypeError(`${sentinelContext}.${field} 必须是字符串`);
      }
    }
    const exactIdentity = JSON.stringify([type, sentinel.value]);
    const pickerIdentity = String(sentinel.value);
    if (exactValues.has(exactIdentity) || pickerValues.has(pickerIdentity)) {
      throw new TypeError(`${context}.sentinels 不能重复 picker 值 ${pickerIdentity}`);
    }
    exactValues.add(exactIdentity);
    pickerValues.add(pickerIdentity);
  });
}

function validateMultiTargets(targets, context) {
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) {
    throw new TypeError(`${context}.targets 必须是对象`);
  }
  const unexpectedFields = Object.keys(targets).filter(field =>
    !MULTI_TARGET_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(
      `${context}.targets 只允许 owner/domains；不接受范围规则或其他字段 ${
        unexpectedFields.join(", ")}`,
    );
  }
  requirePath(targets.owner, `${context}.targets.owner`, {allowEmpty: false});
  if (!Array.isArray(targets.domains) || targets.domains.length < 2) {
    throw new TypeError(`${context}.targets.domains 必须声明至少两个目标领域`);
  }
  const modules = new Set();
  const ownerValues = new Set();
  targets.domains.forEach((domain, index) => {
    const domainContext = `${context}.targets.domains[${index}]`;
    if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
      throw new TypeError(`${domainContext} 必须是对象`);
    }
    const unexpectedDomainFields = Object.keys(domain).filter(field =>
      !MULTI_TARGET_DOMAIN_FIELDS.has(field));
    if (unexpectedDomainFields.length) {
      throw new TypeError(`${domainContext} 只允许 module/ownerValues`);
    }
    const moduleId = String(domain.module || "");
    if (!MODULE_ID.test(moduleId)) {
      throw new TypeError(`${domainContext}.module 无效`);
    }
    if (modules.has(moduleId)) {
      throw new TypeError(`${context}.targets.domains 不能重复目标模块 ${moduleId}`);
    }
    modules.add(moduleId);
    if (!Array.isArray(domain.ownerValues) || !domain.ownerValues.length) {
      throw new TypeError(`${domainContext}.ownerValues 必须是非空 owner 值数组`);
    }
    domain.ownerValues.forEach(value => {
      const valueType = typeof value;
      if (value !== null && !new Set(["string", "number", "boolean"]).has(valueType)) {
        throw new TypeError(`${domainContext}.ownerValues 只能包含 JSON 标量`);
      }
      if (valueType === "number" && !Number.isFinite(value)) {
        throw new TypeError(`${domainContext}.ownerValues 不能包含非有限数值`);
      }
      const valueIdentity = JSON.stringify([valueType, value]);
      if (ownerValues.has(valueIdentity)) {
        throw new TypeError(`${context}.targets.domains 不能重复 owner 值 ${String(value)}`);
      }
      ownerValues.add(valueIdentity);
    });
  });
}

function validateContextAwareSource(source, context) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError(`${context} 必须是对象`);
  }
  const unexpected = Object.keys(source).filter(field =>
    !CONTEXT_AWARE_SOURCE_FIELDS.has(field));
  if (unexpected.length) {
    throw new TypeError(`${context} 只允许 document/resource/path`);
  }
  const origins = ["document", "resource"].filter(field =>
    typeof source[field] === "string" && source[field]);
  if (origins.length !== 1) {
    throw new TypeError(`${context} 必须且只能声明 document/resource 之一`);
  }
  requirePath(source.path, `${context}.path`);
}

function validateContextAwareReference(reference, context) {
  const unexpectedReferenceFields = Object.keys(reference).filter(field =>
    !new Set(["module", "contextAware"]).has(field));
  if (unexpectedReferenceFields.length) {
    throw new TypeError(
      `${context}: context-aware 引用只允许 module/contextAware；CHR 物理细节归 owner codec`,
    );
  }
  if (!Object.hasOwn(reference, "module") || reference.targets) {
    throw new TypeError(`${context}: context-aware 必须直接点名一个 owner 模块`);
  }
  const declaration = reference.contextAware;
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration)) {
    throw new TypeError(`${context}: reference.contextAware 必须是对象`);
  }
  const unexpected = Object.keys(declaration).filter(field =>
    !CONTEXT_AWARE_FIELDS.has(field));
  if (unexpected.length) {
    throw new TypeError(
      `${context}: contextAware 只允许 codec/consumer/sources；CHR 物理细节归 owner codec`,
    );
  }
  requireCodecId(declaration.codec, "context-aware");
  requirePath(declaration.consumer, `${context}: contextAware.consumer`, {allowEmpty: false});
  const sources = declaration.sources;
  if (!sources || typeof sources !== "object" || Array.isArray(sources)
      || Object.keys(sources).some(field => !CONTEXT_AWARE_SOURCES_FIELDS.has(field))
      || Object.keys(sources).length !== CONTEXT_AWARE_SOURCES_FIELDS.size) {
    throw new TypeError(`${context}: contextAware.sources 必须精确声明 contexts/candidates`);
  }
  validateContextAwareSource(sources.contexts, `${context}: contextAware.sources.contexts`);
  validateContextAwareSource(sources.candidates, `${context}: contextAware.sources.candidates`);
}

function validateReferenceTarget(reference, context) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new TypeError(`${context}: reference 必须是对象`);
  }
  const hasModule = Object.hasOwn(reference, "module");
  const hasTargets = Object.hasOwn(reference, "targets");
  if (hasModule === hasTargets) {
    throw new TypeError(`${context}: reference 必须且只能声明 module/targets 之一`);
  }
  if (hasModule) {
    const moduleId = String(reference.module || "");
    if (!MODULE_ID.test(moduleId)) throw new TypeError(`${context}: reference.module 无效`);
  } else {
    validateMultiTargets(reference.targets, context);
  }
  if (reference.contextAware !== undefined) {
    validateContextAwareReference(reference, context);
    return;
  }
  const table = reference.table;
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new TypeError(`${context}: reference.table 必须是对象`);
  }
  const sources = ["document", "resource"].filter(key =>
    typeof table[key] === "string" && table[key]);
  if (sources.length !== 1) {
    throw new TypeError(`${context}: reference.table 必须且只能声明 document/resource 之一`);
  }
  requirePath(table.path, `${context}: reference.table.path`);
  requirePath(reference.key, `${context}: reference.key`, {allowEmpty: false});
  requirePath(reference.name, `${context}: reference.name`, {allowEmpty: false});
  for (const field of ["description", "meta"]) {
    if (reference[field] !== undefined) {
      requirePath(reference[field], `${context}: reference.${field}`, {allowEmpty: false});
    }
  }
  const preview = reference.preview;
  const componentPreview = typeof preview?.component === "string" && preview.component;
  const pathPreview = preview?.path !== undefined;
  if (!preview || typeof preview !== "object" || Boolean(componentPreview) === pathPreview) {
    throw new TypeError(
      `${context}: reference.preview 必须且只能声明 component/path 之一`,
    );
  }
  if (pathPreview) {
    requirePath(preview.path, `${context}: reference.preview.path`, {allowEmpty: false});
  }
  if (reference.scope !== undefined) {
    if (!reference.scope || typeof reference.scope !== "object"
        || Array.isArray(reference.scope)) {
      throw new TypeError(`${context}: reference.scope 必须是对象`);
    }
    const unexpectedScopeFields = Object.keys(reference.scope).filter(field =>
      !SCOPE_FIELDS.has(field));
    if (unexpectedScopeFields.length) {
      throw new TypeError(`${context}: reference.scope 只允许 path/values/source`);
    }
    const hasValues = Object.hasOwn(reference.scope, "values");
    const hasSource = Object.hasOwn(reference.scope, "source");
    if (hasValues === hasSource) {
      throw new TypeError(`${context}: reference.scope 必须且只能声明 values/source 之一`);
    }
    requirePath(reference.scope.path, `${context}: reference.scope.path`, {
      allowEmpty: false,
    });
    if (hasValues && (!Array.isArray(reference.scope.values)
        || !reference.scope.values.length)) {
      throw new TypeError(`${context}: reference.scope.values 必须是非空数组`);
    }
    if (hasSource) {
      requirePath(reference.scope.source, `${context}: reference.scope.source`, {
        allowEmpty: false,
      });
    }
  }
}

function validateStructuredFields(fields, context, stack) {
  if (!Array.isArray(fields) || !fields.length) {
    throw new TypeError(`${context}.fields 必须是非空静态字段数组`);
  }
  const identities = new Set();
  let referenceLeaves = 0;
  fields.forEach((field, index) => {
    const fieldContext = `${context}.fields[${index}]`;
    if (!field || typeof field !== "object" || Array.isArray(field)) {
      throw new TypeError(`${fieldContext} 必须是对象`);
    }
    requirePath(field.path, `${fieldContext}.path`, {allowEmpty: false});
    const pathIdentity = JSON.stringify(field.path);
    if (identities.has(pathIdentity)) {
      throw new TypeError(`${context}.fields 不能重复声明路径 ${field.path.join("/")}`);
    }
    identities.add(pathIdentity);
    if (typeof field.label !== "string" || !field.label.trim()) {
      throw new TypeError(`${fieldContext}.label 必须是非空字符串`);
    }
    if (field.readOnly !== undefined && typeof field.readOnly !== "boolean") {
      throw new TypeError(`${fieldContext}.readOnly 必须是 boolean`);
    }
    if (field.when !== undefined) {
      if (!field.when || typeof field.when !== "object" || Array.isArray(field.when)
          || !Object.hasOwn(field.when, "equals")) {
        throw new TypeError(`${fieldContext}.when 必须声明 path/equals`);
      }
      requirePath(field.when.path, `${fieldContext}.when.path`, {allowEmpty: false});
    }
    if (field.reference !== undefined && field.container !== undefined) {
      throw new TypeError(`${fieldContext} 不能同时声明 reference 与 container`);
    }
    if (field.reference !== undefined) {
      validateReference(field.reference, `${fieldContext}.reference`, stack);
      referenceLeaves += 1;
    } else if (field.container !== undefined) {
      referenceLeaves += validateContainer(field.container, `${fieldContext}.container`, {
        targetDeclared: false,
        stack,
      });
    }
  });
  return referenceLeaves;
}

function validateCompoundMatch(container, context) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !COMPOUND_MATCH_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: compound-match 只允许 kind/bindings`);
  }
  if (!Array.isArray(container.bindings) || container.bindings.length < 2) {
    throw new TypeError(`${context}.bindings 至少要声明两个静态字段映射`);
  }
  const sources = new Set();
  const targets = new Set();
  container.bindings.forEach((binding, index) => {
    const bindingContext = `${context}.bindings[${index}]`;
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      throw new TypeError(`${bindingContext} 必须是对象`);
    }
    const unexpectedBindingFields = Object.keys(binding).filter(field =>
      !COMPOUND_MATCH_BINDING_FIELDS.has(field));
    if (unexpectedBindingFields.length) {
      throw new TypeError(`${bindingContext} 只允许 source/target`);
    }
    requirePath(binding.source, `${bindingContext}.source`, {allowEmpty: false});
    requirePath(binding.target, `${bindingContext}.target`, {allowEmpty: false});
    const source = JSON.stringify(binding.source);
    const target = JSON.stringify(binding.target);
    if (sources.has(source) || targets.has(target)) {
      throw new TypeError(`${context}.bindings 不能重复 source 或 target 路径`);
    }
    sources.add(source);
    targets.add(target);
  });
  return 1;
}

function validateDerivedHandles(container, context, stack) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !DERIVED_HANDLE_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: derived-handles 只允许 kind/handle/domains`);
  }
  requirePath(container.handle, `${context}.handle`);
  if (!Array.isArray(container.domains) || !container.domains.length) {
    throw new TypeError(`${context}.domains 必须是非空静态句柄领域数组`);
  }
  const prefixes = new Set();
  container.domains.forEach((domain, index) => {
    const domainContext = `${context}.domains[${index}]`;
    if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
      throw new TypeError(`${domainContext} 必须是对象`);
    }
    const unexpectedDomainFields = Object.keys(domain).filter(field =>
      !DERIVED_HANDLE_DOMAIN_FIELDS.has(field));
    if (unexpectedDomainFields.length) {
      throw new TypeError(`${domainContext} 只允许 prefixes/reference`);
    }
    if (!Array.isArray(domain.prefixes) || !domain.prefixes.length) {
      throw new TypeError(`${domainContext}.prefixes 必须是非空静态前缀数组`);
    }
    domain.prefixes.forEach(rawPrefix => {
      const prefix = String(rawPrefix || "");
      if (!HANDLE_PREFIX.test(prefix)) {
        throw new TypeError(`${domainContext}.prefixes 含无效句柄前缀 ${prefix || "（空）"}`);
      }
      if (prefixes.has(prefix)) {
        throw new TypeError(`${context}.domains 不能重复句柄前缀 ${prefix}`);
      }
      prefixes.add(prefix);
    });
    validateReference(domain.reference, `${domainContext}.reference`, stack);
    if (!Object.hasOwn(domain.reference, "module") || domain.reference.targets
        || domain.reference.container) {
      throw new TypeError(`${domainContext}.reference 必须直接点名一个 owner 候选表`);
    }
  });
  return container.domains.length;
}

function validateOpcodeOperands(container, context, stack) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !OPCODE_OPERAND_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(
      `${context}: opcode-operands 只允许 kind/codec/references；opcode 规则归 owner codec`,
    );
  }
  const codec = String(container.codec || "");
  if (!CODEC_ID.test(codec)) throw new TypeError(`${context}.codec 无效`);
  if (!Array.isArray(container.references) || !container.references.length) {
    throw new TypeError(`${context}.references 必须是非空 token 引用表`);
  }
  const tokens = new Set();
  container.references.forEach((entry, index) => {
    const entryContext = `${context}.references[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError(`${entryContext} 必须是对象`);
    }
    const unexpectedReferenceFields = Object.keys(entry).filter(field =>
      !OPCODE_REFERENCE_FIELDS.has(field));
    if (unexpectedReferenceFields.length) {
      throw new TypeError(`${entryContext} 只允许 token/label/reference`);
    }
    const token = String(entry.token || "");
    if (!OPCODE_TOKEN.test(token) || tokens.has(token)) {
      throw new TypeError(`${context}.references 的 token 无效或重复：${token || "（空）"}`);
    }
    tokens.add(token);
    if (typeof entry.label !== "string" || !entry.label.trim()) {
      throw new TypeError(`${entryContext}.label 必须是非空字符串`);
    }
    validateReference(entry.reference, `${entryContext}.reference`, stack);
    if (!Object.hasOwn(entry.reference, "module") || entry.reference.targets
        || entry.reference.container) {
      throw new TypeError(`${entryContext}.reference 必须直接点名一个 owner 候选表`);
    }
  });
  return container.references.length;
}

function validateConsumerDispatch(container, context, stack) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !CONSUMER_DISPATCH_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: consumer-dispatch 只允许 kind/source/domains`);
  }
  requirePath(container.source, `${context}.source`, {allowEmpty: false});
  if (!Array.isArray(container.domains) || container.domains.length < 2) {
    throw new TypeError(`${context}.domains 至少要声明两个静态语义分支`);
  }
  const values = new Set();
  let referenceLeaves = 0;
  container.domains.forEach((domain, index) => {
    const domainContext = `${context}.domains[${index}]`;
    if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
      throw new TypeError(`${domainContext} 必须是对象`);
    }
    const unexpectedDomainFields = Object.keys(domain).filter(field =>
      !CONSUMER_DISPATCH_DOMAIN_FIELDS.has(field));
    if (unexpectedDomainFields.length) {
      throw new TypeError(`${domainContext} 只允许 values/reference/passthrough`);
    }
    if (!Array.isArray(domain.values) || !domain.values.length) {
      throw new TypeError(`${domainContext}.values 必须是非空语义枚举数组`);
    }
    domain.values.forEach(value => {
      const valueType = typeof value;
      if (value !== null && !new Set(["string", "number", "boolean"]).has(valueType)) {
        throw new TypeError(`${domainContext}.values 只能包含 JSON 标量`);
      }
      if (valueType === "number" && !Number.isFinite(value)) {
        throw new TypeError(`${domainContext}.values 不能包含非有限数值`);
      }
      const valueIdentity = JSON.stringify([valueType, value]);
      if (values.has(valueIdentity)) {
        throw new TypeError(`${context}.domains 不能重复语义值 ${String(value)}`);
      }
      values.add(valueIdentity);
    });
    const hasTarget = domain.reference !== undefined;
    const hasPassthrough = domain.passthrough !== undefined;
    if (hasTarget === hasPassthrough) {
      throw new TypeError(
        `${domainContext} 必须且只能声明 reference/passthrough 之一`,
      );
    }
    if (hasTarget) {
      validateReference(domain.reference, `${domainContext}.reference`, stack);
      if (!hasReferenceTarget(domain.reference) || domain.reference.container
          || domain.reference.nullable !== undefined) {
        throw new TypeError(`${domainContext}.reference 必须是不可空的直接标量引用叶子`);
      }
      referenceLeaves += 1;
      return;
    }
    const passthrough = domain.passthrough;
    if (!passthrough || typeof passthrough !== "object" || Array.isArray(passthrough)) {
      throw new TypeError(`${domainContext}.passthrough 必须是对象`);
    }
    const unexpectedPassthroughFields = Object.keys(passthrough).filter(field =>
      !CONSUMER_DISPATCH_PASSTHROUGH_FIELDS.has(field));
    if (unexpectedPassthroughFields.length) {
      throw new TypeError(`${domainContext}.passthrough 只允许 label/description`);
    }
    if (typeof passthrough.label !== "string" || !passthrough.label.trim()) {
      throw new TypeError(`${domainContext}.passthrough.label 必须是非空字符串`);
    }
    if (passthrough.description !== undefined
        && typeof passthrough.description !== "string") {
      throw new TypeError(`${domainContext}.passthrough.description 必须是字符串`);
    }
  });
  if (!referenceLeaves) {
    throw new TypeError(`${context}.domains 至少要有一个引用目标分支`);
  }
  return referenceLeaves;
}

function validateCandidateUnion(container, context, stack) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !CANDIDATE_UNION_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: candidate-union 只允许 kind/domains`);
  }
  if (!Array.isArray(container.domains) || container.domains.length < 2) {
    throw new TypeError(`${context}.domains 至少要声明两张静态候选表`);
  }
  const identities = new Set();
  container.domains.forEach((domain, index) => {
    const domainContext = `${context}.domains[${index}]`;
    if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
      throw new TypeError(`${domainContext} 必须是对象`);
    }
    const unexpectedDomainFields = Object.keys(domain).filter(field =>
      !CANDIDATE_UNION_DOMAIN_FIELDS.has(field));
    if (unexpectedDomainFields.length) {
      throw new TypeError(`${domainContext} 只允许 reference`);
    }
    validateReference(domain.reference, `${domainContext}.reference`, stack);
    const reference = domain.reference;
    if (!Object.hasOwn(reference, "module") || reference.targets
        || reference.container || reference.nullable !== undefined
        || reference.sentinels !== undefined
        || reference.scope?.source !== undefined) {
      throw new TypeError(
        `${domainContext}.reference 必须直接点名一张不依赖 consumer source 的标量 owner 表`,
      );
    }
    const identity = JSON.stringify(reference);
    if (identities.has(identity)) {
      throw new TypeError(`${context}.domains 不能重复声明同一张候选表`);
    }
    identities.add(identity);
  });
  return container.domains.length;
}

function validateEncodedScalar(container, context) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !ENCODED_SCALAR_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: encoded-scalar 只允许 kind/codec`);
  }
  requireCodecId(container.codec, "encoded scalar");
  return 1;
}

function validateBitSlice(container, context) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !BIT_SLICE_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(`${context}: bit-slice 只允许 kind/codec；位布局归 owner codec`);
  }
  requireCodecId(container.codec, "bit slice");
  return 1;
}

function validateLinkedFields(container, context) {
  const unexpectedFields = Object.keys(container).filter(field =>
    !LINKED_FIELDS.has(field));
  if (unexpectedFields.length) {
    throw new TypeError(
      `${context}: linked-fields 只允许 kind/codec/paths/primary/length/reorder；`
        + "组合规则归 owner codec；逐项上下文亦归 owner codec",
    );
  }
  requireCodecId(container.codec, "linked fields");
  if (!Array.isArray(container.paths) || container.paths.length < 2) {
    throw new TypeError(`${context}.paths 至少要声明两个组成字段路径`);
  }
  const paths = new Set();
  container.paths.forEach((path, index) => {
    requirePath(path, `${context}.paths[${index}]`, {allowEmpty: false});
    const pathIdentity = JSON.stringify(path);
    if (paths.has(pathIdentity)) {
      throw new TypeError(`${context}.paths 不能重复组成字段路径 ${path.join("/")}`);
    }
    paths.add(pathIdentity);
  });
  requirePath(container.primary, `${context}.primary`, {allowEmpty: false});
  if (!paths.has(JSON.stringify(container.primary))) {
    throw new TypeError(`${context}.primary 必须是 paths 中唯一的交互主字段`);
  }
  if (container.length === undefined) {
    if (container.reorder !== undefined) {
      throw new TypeError(`${context}: 标量 linked-fields 不声明 reorder`);
    }
  } else {
    if (container.length !== "current") {
      throw new TypeError(`${context}: linked-fields 数组 length 只能按当前值展开为 current`);
    }
    if (container.reorder !== false) {
      throw new TypeError(`${context}: linked-fields 数组必须明确禁止排序`);
    }
  }
  return 1;
}

function validateProviderCode(reference, context) {
  const unexpectedReferenceFields = Object.keys(reference).filter(field =>
    !PROVIDER_REFERENCE_FIELDS.has(field));
  if (unexpectedReferenceFields.length) {
    throw new TypeError(
      `${context}: provider-code 只能声明 module/container，不能伪装成候选配置表`,
    );
  }
  const moduleId = String(reference.module || "");
  if (!MODULE_ID.test(moduleId)) {
    throw new TypeError(`${context}: provider-code reference.module 无效`);
  }
  const container = reference.container;
  const unexpectedContainerFields = Object.keys(container).filter(field =>
    !PROVIDER_CODE_FIELDS.has(field));
  if (unexpectedContainerFields.length) {
    throw new TypeError(`${context}: provider-code 只允许 kind/role 或 kind/source/roles`);
  }
  const fixed = Object.hasOwn(container, "role");
  const dynamic = Object.hasOwn(container, "roles") || Object.hasOwn(container, "source");
  if (fixed === dynamic) {
    throw new TypeError(
      `${context}: provider-code 必须且只能声明固定 role 或动态 source/roles`,
    );
  }
  if (fixed) {
    const role = String(container.role || "");
    if (!HANDLE_PREFIX.test(role)) {
      throw new TypeError(`${context}: provider-code role 必须是稳定语义角色`);
    }
    return 1;
  }
  requirePath(container.source, `${context}: provider-code source`, {allowEmpty: false});
  if (!Array.isArray(container.roles) || container.roles.length < 2) {
    throw new TypeError(`${context}: provider-code roles 至少要静态声明两个语义角色`);
  }
  const roles = new Set();
  container.roles.forEach((value, index) => {
    const role = String(value || "");
    if (!HANDLE_PREFIX.test(role)) {
      throw new TypeError(`${context}: provider-code roles[${index}] 不是稳定语义角色`);
    }
    if (roles.has(role)) {
      throw new TypeError(`${context}: provider-code roles 不能重复 ${role}`);
    }
    roles.add(role);
  });
  return 1;
}

function validateContainer(container, context, {targetDeclared, stack}) {
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    throw new TypeError(`${context} 必须是对象`);
  }
  if (!new Set([
    "array", "object", "compound-match", "derived-handles", "opcode-operands",
    "consumer-dispatch", "candidate-union", "encoded-scalar", "bit-slice",
    "linked-fields", "provider-code",
  ])
    .has(container.kind)) {
    throw new TypeError(
      `${context}.kind 必须是 array/object/compound-match/derived-handles/`
        + `opcode-operands/consumer-dispatch/candidate-union/encoded-scalar/`
        + `bit-slice/linked-fields/provider-code`,
    );
  }
  if (container.kind === "compound-match") {
    if (!targetDeclared) {
      throw new TypeError(`${context}: compound-match 必须在外层直接点名 owner 候选表`);
    }
    return validateCompoundMatch(container, context);
  }
  if (container.kind === "derived-handles") {
    if (targetDeclared) {
      throw new TypeError(`${context}: derived-handles 的目标必须写在 domains[].reference`);
    }
    return validateDerivedHandles(container, context, stack);
  }
  if (container.kind === "opcode-operands") {
    if (targetDeclared) {
      throw new TypeError(`${context}: opcode-operands 的目标必须写在 references[].reference`);
    }
    return validateOpcodeOperands(container, context, stack);
  }
  if (container.kind === "consumer-dispatch") {
    if (targetDeclared) {
      throw new TypeError(`${context}: consumer-dispatch 的目标必须写在 domains[].reference`);
    }
    return validateConsumerDispatch(container, context, stack);
  }
  if (container.kind === "candidate-union") {
    if (targetDeclared) {
      throw new TypeError(`${context}: candidate-union 的目标必须写在 domains[].reference`);
    }
    return validateCandidateUnion(container, context, stack);
  }
  if (container.kind === "encoded-scalar") {
    if (!targetDeclared) {
      throw new TypeError(`${context}: encoded-scalar 必须在外层直接点名 owner 候选表`);
    }
    return validateEncodedScalar(container, context);
  }
  if (container.kind === "bit-slice") {
    if (!targetDeclared) {
      throw new TypeError(`${context}: bit-slice 必须在外层直接点名 owner 候选表`);
    }
    return validateBitSlice(container, context);
  }
  if (container.kind === "linked-fields") {
    if (!targetDeclared) {
      throw new TypeError(`${context}: linked-fields 必须在外层直接点名 owner 候选表`);
    }
    return validateLinkedFields(container, context);
  }
  if (container.kind === "provider-code") {
    if (!targetDeclared) {
      throw new TypeError(`${context}: provider-code 必须直接点名提供代码的 owner 模块`);
    }
    return 1;
  }
  if (container.kind === "object") {
    if (targetDeclared) {
      throw new TypeError(`${context}: 对象引用的目标必须写在 fields[].reference`);
    }
    for (const field of ["length", "size", "reorder"]) {
      if (container[field] !== undefined) {
        throw new TypeError(`${context}: object 不声明 ${field}`);
      }
    }
    return validateStructuredFields(container.fields, context, stack);
  }
  if (!new Set(["fixed", "current"]).has(container.length)) {
    throw new TypeError(
      `${context}: 引用数组 length 必须是 fixed 或按当前值展开的 current`,
    );
  }
  if (container.length === "fixed") {
    if (!Number.isInteger(container.size) || container.size < 1) {
      throw new TypeError(`${context}: fixed 引用数组必须声明正整数 size`);
    }
  } else if (container.size !== undefined) {
    throw new TypeError(`${context}: current 引用数组不能硬编码 size`);
  }
  if (container.reorder !== false) {
    throw new TypeError(`${context}: 引用数组必须明确禁止排序`);
  }
  if (container.fields === undefined) {
    if (!targetDeclared) {
      throw new TypeError(`${context}: 标量引用数组必须在外层声明引用目标`);
    }
    return 1;
  }
  if (targetDeclared) {
    throw new TypeError(`${context}: 对象数组的引用目标必须写在 fields[].reference`);
  }
  return validateStructuredFields(container.fields, context, stack);
}

function validateReference(reference, context, stack = new Set()) {
  if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
    throw new TypeError(`${context}: reference 必须是对象`);
  }
  if (stack.has(reference)) throw new TypeError(`${context}: reference/container 不能循环引用`);
  stack.add(reference);
  try {
    const targetDeclared = hasReferenceTarget(reference);
    const contextAware = reference.contextAware !== undefined;
    const nullableDeclared = reference.nullable !== undefined;
    const sentinelsDeclared = reference.sentinels !== undefined;
    if (contextAware && (reference.container !== undefined || nullableDeclared
        || sentinelsDeclared || reference.scope !== undefined)) {
      throw new TypeError(`${context}: context-aware 是独立的标量引用形状`);
    }
    if (nullableDeclared) {
      validateNullable(reference.nullable, context);
    }
    if (sentinelsDeclared) {
      validateSentinels(reference.sentinels, context);
    }
    if (nullableDeclared || sentinelsDeclared) {
      const declaration = [nullableDeclared ? "nullable" : "", sentinelsDeclared
        ? "sentinels" : ""].filter(Boolean).join("/");
      if (!targetDeclared) {
        throw new TypeError(`${context}: ${declaration} 只能声明在直接引用叶子上`);
      }
      const logicalScalarContainers = new Set([
        "encoded-scalar", "bit-slice", "linked-fields",
      ]);
      if (reference.container?.kind
          && !logicalScalarContainers.has(reference.container.kind)) {
        throw new TypeError(`${context}: ${declaration} 只支持标量引用叶子`);
      }
    }
    const providerCode = reference.container?.kind === "provider-code";
    if (targetDeclared) {
      if (providerCode) validateProviderCode(reference, context);
      else validateReferenceTarget(reference, context);
    }
    if (reference.container?.kind === "compound-match"
        && (!Object.hasOwn(reference, "module") || reference.targets)) {
      throw new TypeError(`${context}: compound-match 必须直接点名一个 owner 模块`);
    }
    if (reference.container?.kind === "encoded-scalar"
        && (!Object.hasOwn(reference, "module") || reference.targets)) {
      throw new TypeError(`${context}: encoded-scalar 必须直接点名一个 owner 模块`);
    }
    if (new Set(["bit-slice", "linked-fields", "provider-code"])
      .has(reference.container?.kind)
        && (!Object.hasOwn(reference, "module") || reference.targets)) {
      throw new TypeError(
        `${context}: ${reference.container.kind} 必须直接点名一个 owner 模块`,
      );
    }
    if (reference.scope?.source !== undefined && reference.container !== undefined) {
      throw new TypeError(`${context}: consumer scope 只支持直接标量引用叶子`);
    }
    let referenceLeaves = targetDeclared ? 1 : 0;
    if (reference.container !== undefined) {
      referenceLeaves = validateContainer(reference.container, `${context}: reference.container`, {
        targetDeclared,
        stack,
      });
    }
    if (!referenceLeaves) {
      throw new TypeError(`${context}: 结构化引用至少要声明一个 reference 叶子`);
    }
  } finally {
    stack.delete(reference);
  }
  return reference;
}

export function registerContextAwareReferenceCodec(codecId, codec) {
  const id = requireCodecId(codecId, "context-aware");
  if (!codec || typeof codec !== "object" || typeof codec.bind !== "function") {
    throw new TypeError(`${id}: context-aware owner codec 必须提供 bind`);
  }
  if (contextAwareReferenceCodecs.has(id)) {
    throw new Error(`context-aware owner codec 重复登记：${id}`);
  }
  contextAwareReferenceCodecs.set(id, Object.freeze({bind: codec.bind}));
}


function requireCodecId(codecId, label = "opcode operand") {
  const id = String(codecId || "");
  if (!CODEC_ID.test(id)) throw new TypeError(`${label} codec ID 无效：${id || "（空）"}`);
  return id;
}

function encodedScalarCodec(codecId) {
  const id = requireCodecId(codecId, "encoded scalar");
  const codec = encodedScalarCodecs.get(id);
  if (!codec) throw new Error(`未登记 owner encoded scalar codec：${id}`);
  return codec;
}

function encodedScalarValue(value, context) {
  if (!new Set(["number", "string"]).has(typeof value)
      || (typeof value === "number" && !Number.isFinite(value))) {
    throw new TypeError(`${context} 必须是有限数值或字符串`);
  }
  return value;
}

/** owner 独占编码与候选投影知识；字段层只调用不透明操作，并校验投影没有发明目标键。 */
export function registerEncodedScalarReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "encoded scalar");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")
      || (definition.candidates !== undefined && typeof definition.candidates !== "function")) {
    throw new TypeError(
      `${id}: encoded scalar codec 必须提供 decode/encode，`
        + "accepts/candidates 若有也必须是函数",
    );
  }
  if (encodedScalarCodecs.has(id)) {
    throw new TypeError(`encoded scalar codec 重复登记：${id}`);
  }
  encodedScalarCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
    candidates: definition.candidates || (rows => rows),
  }));
}

function decodeEncodedScalarReference(codecId, sourceValue) {
  const source = encodedScalarValue(sourceValue, `${codecId}: source value`);
  return encodedScalarValue(
    encodedScalarCodec(codecId).decode(source),
    `${codecId}: decoded reference value`,
  );
}




function bitSliceCodec(codecId) {
  const id = requireCodecId(codecId, "bit slice");
  const codec = bitSliceCodecs.get(id);
  if (!codec) throw new Error(`未登记 owner bit slice codec：${id}`);
  return codec;
}

function preservedIdentity(value, context) {
  let encoded;
  try {
    encoded = JSON.stringify(value, (_key, item) => {
      if (typeof item === "number" && !Number.isFinite(item)) {
        throw new TypeError(`${context} 不能包含非有限数值`);
      }
      if (new Set(["undefined", "function", "symbol", "bigint"]).has(typeof item)) {
        throw new TypeError(`${context} 必须是 JSON 值`);
      }
      return item;
    });
  } catch (error) {
    throw new TypeError(`${context} 无法形成稳定保存态：${error?.message || error}`);
  }
  if (encoded === undefined) throw new TypeError(`${context} 必须是 JSON 值`);
  return encoded;
}

function bitSliceSnapshot(codecId, sourceValue) {
  const source = encodedScalarValue(sourceValue, `${codecId}: source value`);
  const decoded = bitSliceCodec(codecId).decode(source);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)
      || !Object.hasOwn(decoded, "target") || !Object.hasOwn(decoded, "preserved")) {
    throw new TypeError(
      `${codecId}: bit slice decoder 必须返回 {target, preserved}`,
    );
  }
  const unexpected = Object.keys(decoded).filter(field =>
    !new Set(["target", "preserved"]).has(field));
  if (unexpected.length) {
    throw new TypeError(`${codecId}: bit slice decoder 只允许 target/preserved`);
  }
  return {
    target: encodedScalarValue(decoded.target, `${codecId}: decoded reference value`),
    preserved: preservedIdentity(decoded.preserved, `${codecId}: preserved state`),
  };
}

/** 位段布局只在 owner codec；字段层额外证明写回前后的非目标保存态完全一致。 */
export function registerBitSliceReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "bit slice");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")) {
    throw new TypeError(
      `${id}: bit slice codec 必须提供 decode/encode，accepts 若有也必须是函数`,
    );
  }
  if (bitSliceCodecs.has(id)) throw new TypeError(`bit slice codec 重复登记：${id}`);
  bitSliceCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
  }));
}

function decodeBitSliceReference(codecId, sourceValue) {
  return bitSliceSnapshot(codecId, sourceValue).target;
}



function linkedFieldCodec(codecId) {
  const id = requireCodecId(codecId, "linked fields");
  const codec = linkedFieldCodecs.get(id);
  if (!codec) throw new Error(`未登记 owner linked fields codec：${id}`);
  return codec;
}

function linkedSourceValues(values, context) {
  if (!Array.isArray(values) || values.length < 2) {
    throw new TypeError(`${context} 必须含至少两个组成字段值`);
  }
  return values.map((value, index) => encodedScalarValue(value, `${context}[${index}]`));
}

/**
 * 多个存储字段怎样合成一个目标键完全由 owner codec 决定。
 * candidates 可以先把这次静态声明实际加载的候选表投影成 owner 的逻辑目标；
 * accepts 随后收到完整投影，让 owner 能沿发布关系解析值域。通用层只保证投影
 * 没有发明发布表之外的目标键，也不解释句柄或复制 owner 的边界规则。若这个
 * 逻辑目标不是目标模块的通用句柄域，owner 可明确要求按字段声明呈现投影行。
 */
export function registerLinkedFieldReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "linked fields");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")
      || (definition.candidates !== undefined && typeof definition.candidates !== "function")
      || (definition.context !== undefined && typeof definition.context !== "function")
      || (definition.candidatePresentation !== undefined
        && definition.candidatePresentation !== "declared")) {
    throw new TypeError(
      `${id}: linked fields codec 必须提供 decode/encode，`
        + "accepts/candidates/context 若有也必须是函数，candidatePresentation 只可为 declared",
    );
  }
  if (linkedFieldCodecs.has(id)) {
    throw new TypeError(`linked fields codec 重复登记：${id}`);
  }
  linkedFieldCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
    candidates: definition.candidates || (rows => rows),
    candidatePresentation: definition.candidatePresentation || "owner",
    context: definition.context || null,
  }));
}


function decodeLinkedFieldReference(codecId, sourceValues, context = null) {
  const source = linkedSourceValues(sourceValues, `${codecId}: source values`);
  preservedIdentity(context, `${codecId}: owner context`);
  return encodedScalarValue(
    linkedFieldCodec(codecId).decode(Object.freeze([...source]), context),
    `${codecId}: decoded reference value`,
  );
}




/** owner 登记自己的解码与编码；通用字段层不包含任何 opcode 常量或长度规则。 */
export function registerOpcodeOperandCodec(codecId, definition) {
  const id = requireCodecId(codecId);
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function") {
    throw new TypeError(`${id}: opcode operand codec 必须同时提供 decode/encode`);
  }
  if (opcodeOperandCodecs.has(id)) {
    throw new TypeError(`opcode operand codec 重复登记：${id}`);
  }
  opcodeOperandCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
  }));
}

function opcodeOperandCodec(codecId) {
  const id = requireCodecId(codecId);
  const codec = opcodeOperandCodecs.get(id);
  if (!codec) throw new Error(`未登记 owner opcode operand codec：${id}`);
  return codec;
}

function opcodeScalar(value, context) {
  if (!new Set(["number", "string"]).has(typeof value)
      || (typeof value === "number" && !Number.isFinite(value))) {
    throw new TypeError(`${context}.value 必须是有限数值或字符串`);
  }
  return value;
}

/**
 * 把 owner decoder 的稳定 token 形状校验成字段层可渲染的命令列表。
 * decoder 返回的 operand.id 是 owner encoder 唯一认识的定位符，字段层不解释它。
 */

/** Field views and their controls consume the same owner decoder. */
function decodeOpcodeOperandValue(codecId, value) {
  const declaration = {codec: codecId};
  const decoded = opcodeOperandCodec(codecId).decode(value);
  if (!Array.isArray(decoded)) {
    throw new TypeError(`${declaration.codec}: owner decoder 必须返回命令数组`);
  }
  const commandIds = new Set();
  const operandIds = new Set();
  return decoded.map((command, commandIndex) => {
    const commandContext = `${declaration.codec}.commands[${commandIndex}]`;
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      throw new TypeError(`${commandContext} 必须是对象`);
    }
    const id = String(command.id ?? "");
    if (!id || commandIds.has(id)) {
      throw new TypeError(`${commandContext}.id 无效或重复`);
    }
    commandIds.add(id);
    if (!Array.isArray(command.operands)) {
      throw new TypeError(`${commandContext}.operands 必须是数组`);
    }
    const operands = command.operands.map((operand, operandIndex) => {
      const operandContext = `${commandContext}.operands[${operandIndex}]`;
      if (!operand || typeof operand !== "object" || Array.isArray(operand)) {
        throw new TypeError(`${operandContext} 必须是对象`);
      }
      const operandId = String(operand.id ?? "");
      const token = String(operand.token || "");
      if (!operandId || operandIds.has(operandId)) {
        throw new TypeError(`${operandContext}.id 无效或跨命令重复`);
      }
      if (!OPCODE_TOKEN.test(token)) {
        throw new TypeError(`${operandContext}.token 不是稳定语义 token`);
      }
      operandIds.add(operandId);
      return Object.freeze({
        id: operandId,
        token,
        label: String(operand.label || token),
        value: opcodeScalar(operand.value, operandContext),
        meta: String(operand.meta || ""),
      });
    });
    return Object.freeze({
      id,
      opcode: String(command.opcode ?? ""),
      label: String(command.label || command.name || `命令 ${commandIndex + 1}`),
      operands: Object.freeze(operands),
    });
  });
}

/** 保存期必须经过同一个 owner encoder；没有 codec 时绝不按普通字段路径写入。 */
export function applyOpcodeOperandEdits(codecId, value, updates) {
  if (!Array.isArray(updates) || !updates.length) {
    throw new TypeError(`${codecId}: opcode operand encoder 没有收到修改`);
  }
  const normalized = updates.map((update, index) => {
    const context = `${codecId}.updates[${index}]`;
    if (!update || typeof update !== "object") throw new TypeError(`${context} 无效`);
    const id = String(update.id ?? "");
    const token = String(update.token || "");
    if (!id || !token) throw new TypeError(`${context} 缺少 owner operand id/token`);
    return Object.freeze({id, token, value: opcodeScalar(update.value, context)});
  });
  const encoded = opcodeOperandCodec(codecId).encode(value, normalized);
  if (encoded === undefined) {
    throw new TypeError(`${codecId}: owner encoder 没有返回编码后的字段值`);
  }
  return encoded;
}


/** 取列内正式声明；本分支没有正式声明时才套用机制隔离样例。 */

function encodedReference(reference) {
  return encodeURIComponent(JSON.stringify(reference));
}



function valueAtPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return MISSING;
    current = current[segment];
  }
  return current;
}

function scopeScalar(value, context) {
  const type = typeof value;
  if (value !== null && !new Set(["string", "number", "boolean"]).has(type)) {
    throw new TypeError(`${context} 必须是 JSON 标量`);
  }
  if (type === "number" && !Number.isFinite(value)) {
    throw new TypeError(`${context} 不能是非有限数值`);
  }
  return value;
}


/**
 * 一个原始标量从多张静态 owner 表的候选并集中选择。各表保留自己的键、名称与预览
 * 投影；字段层不按数值范围或位规则猜它当前属于哪张表。
 */

/** 原字段保存 owner 编码值；picker 只展示解码后的不透明目标键。 */
function encodedScalarFieldMarkup({
  reference,
  value,
  label = "拥有者编码引用",
  controlMarkup = "",
} = {}) {
  const validated = validateReference(reference, label);
  if (validated.container?.kind !== "encoded-scalar") {
    throw new TypeError(`${label}: 不是 encoded-scalar 引用声明`);
  }
  if (!String(controlMarkup).trim()) {
    throw new TypeError(`${label}: encoded-scalar 必须保留原始精确值控件`);
  }
  const decoded = decodeEncodedScalarReference(validated.container.codec, value);
  return `<div class="module-field-reference-shell module-encoded-scalar-field"
    data-module-encoded-scalar="${esc(encodedReference(validated))}"
    data-module-encoded-scalar-label="${esc(encodedText(label))}">
    ${referenceFieldPickerMarkup({
    reference: validated,
    value: decoded,
    label,
    controlMarkup,
    pending: true,
  })}
  </div>`;
}

/** 原字段中只有一个位段是引用；非目标保存态由 owner codec 验证后写回。 */




/** 多个原始字段共同承载一个或一组逻辑引用；每项只由 primary 字段生成 picker。 */





/**
 * 代码 provider 是只读语义目标，不加载配置候选行，也不伪造可选择的配置记录。
 * 固定 role 直接呈现；动态形状只接受源码静态列出的 roles，再按 owner 发布入口唯一匹配。
 */





// 引用分支切换保留已绑定的字段控件及其当前值。




/**
 * 同一标量的目标由当前结构化行的语义字段分派。分支可以点名一个完整的静态
 * 引用叶子，或明确声明为普通值；这里不接受 selector 区间或业务 resolver。
 */



/**
 * 用当前聚合行的多个叶子反查唯一 owner 行。这个引用自身只展示 owner 身份与预览，
 * 不把复合身份序列化进任一数值字段；原始 source 控件继续走字段表的精确值写回。
 */


function encodedText(value) {
  return encodeURIComponent(String(value ?? ""));
}

function decodedText(value) {
  return decodeURIComponent(String(value || ""));
}


/** 派生集合只生成 owner 预览占位；不生成 input、select、details 或候选按钮。 */

function multiTargetModule(reference, row) {
  if (!reference.targets) return reference.module;
  const owner = valueAtPath(row, reference.targets.owner);
  if (owner === MISSING) return MISSING;
  return reference.targets.domains.find(domain =>
    domain.ownerValues.some(value => Object.is(value, owner)))?.module || null;
}

function referenceTableLabel(reference) {
  const table = reference.table;
  const source = table.document
    ? `document:${table.document}` : `resource:${table.resource}`;
  return `${source}${table.path.length ? `/${table.path.join("/")}` : ""}`;
}

function referenceTargetLabel(reference) {
  const modules = reference.targets
    ? reference.targets.domains.map(domain => domain.module)
    : [reference.module];
  return [...new Set(modules)].join("、");
}

function publishedResourceState(resourceId, manifest) {
  const descriptors = manifest?.browser_original_assets;
  if (!Array.isArray(descriptors)) return null;
  return descriptors.some(descriptor => descriptor?.resource_id === resourceId);
}

/**
 * 只读取声明点名的这一张表；发布清单只核对这个精确资源 ID 是否存在，
 * 不枚举模块、不挑替代资源，也不参与候选生成。
 */
async function loadDeclaredReferenceRows(reference, {
  getDocument = db.getDocument,
  getResourceDocument = db.getResourceDocument,
  packageManifest = state.browserPackageManifest,
} = {}) {
  const validated = validateReference(reference, "字段引用");
  const modules = validated.targets
    ? validated.targets.domains.map(domain => domain.module) : [validated.module];
  await Promise.all(modules.map(prepareReferenceFieldPresentation));
  const table = validated.table;
  const target = referenceTargetLabel(validated);
  const publication = table.resource
    ? publishedResourceState(table.resource, packageManifest) : null;
  if (publication === false) {
    throw candidateError(
      "unpublished-resource",
      `目标领域 ${target} 没有可供此声明读取的已发布浏览器资源：当前发布清单不含 `
        + `resource:${table.resource}`,
    );
  }
  const documentValue = table.document
    ? await getDocument(table.document, MISSING)
    : await getResourceDocument(table.resource, MISSING);
  if (documentValue === MISSING) {
    const source = table.document ? `document:${table.document}` : `resource:${table.resource}`;
    throw candidateError(
      "load-failed",
      `目标领域 ${target} 的候选源 ${source}${publication === true
        ? " 已登记发布，但正文读取失败" : " 正文读取失败或不可用"}`,
    );
  }
  const rows = valueAtPath(documentValue, table.path);
  if (rows === MISSING) {
    throw candidateError(
      "path-mismatch",
      `候选源已读取，但声明路径 ${referenceTableLabel(validated)} 不存在`,
    );
  }
  if (!Array.isArray(rows)) {
    throw candidateError(
      "path-mismatch",
      `候选源已读取，但声明路径 ${referenceTableLabel(validated)} 不是候选数组`,
    );
  }
  return rows;
}

async function loadContextAwareSource(source, label, {
  getDocument,
  getResourceDocument,
  packageManifest,
}) {
  const publication = source.resource
    ? publishedResourceState(source.resource, packageManifest) : null;
  if (publication === false) {
    throw candidateError(
      "unpublished-resource",
      `${label} 未发布：当前发布清单不含 resource:${source.resource}`,
    );
  }
  const documentValue = source.document
    ? await getDocument(source.document, MISSING)
    : await getResourceDocument(source.resource, MISSING);
  const sourceLabel = source.document
    ? `document:${source.document}` : `resource:${source.resource}`;
  if (documentValue === MISSING) {
    throw candidateError("load-failed", `${label} ${sourceLabel} 正文读取失败或不可用`);
  }
  const value = valueAtPath(documentValue, source.path);
  if (value === MISSING) {
    throw candidateError(
      "path-mismatch",
      `${label} ${sourceLabel}/${source.path.join("/")} 不存在`,
    );
  }
  return value;
}

/** 只读取 context-aware 声明中点名的两个 owner 来源，不扫描模块或资源。 */
async function loadDeclaredContextAwareSources(reference, {
  getDocument = db.getDocument,
  getResourceDocument = db.getResourceDocument,
  packageManifest = state.browserPackageManifest,
} = {}) {
  const validated = validateReference(reference, "context-aware 字段引用");
  if (!validated.contextAware) throw new TypeError("声明不是 context-aware 引用");
  const {contexts, candidates} = validated.contextAware.sources;
  const options = {getDocument, getResourceDocument, packageManifest};
  const [contextValue, candidateValue] = await Promise.all([
    loadContextAwareSource(contexts, "CHR 上下文 owner 来源", options),
    loadContextAwareSource(candidates, "CHR 候选 owner 来源", options),
  ]);
  return {contexts: contextValue, candidates: candidateValue};
}

function scopedRows(rows, reference, sourceValue = MISSING) {
  if (!reference.scope) return rows;
  if (reference.scope.source !== undefined && sourceValue === MISSING) {
    throw new TypeError("consumer scope 缺少当前 source 值");
  }
  const values = reference.scope.source === undefined
    ? reference.scope.values : [sourceValue];
  return rows.filter(row => {
    const value = valueAtPath(row, reference.scope.path);
    return value !== MISSING && values.some(candidate =>
      Object.is(candidate, value));
  });
}

function resolvedCandidateRows(rows, reference, sourceValue = MISSING) {
  const scoped = scopedRows(rows, reference, sourceValue);
  if (!reference.targets) {
    return {rows: scoped, rowModules: []};
  }
  const resolvedRows = [];
  const rowModules = [];
  scoped.forEach((row, index) => {
    const moduleId = multiTargetModule(reference, row);
    if (moduleId === MISSING) {
      throw candidateError(
        "path-mismatch",
        `候选表 ${referenceTableLabel(reference)} 第 ${index + 1} 行缺少发布归属字段 ${
          reference.targets.owner.join("/")}`,
      );
    }
    if (!moduleId) return;
    resolvedRows.push(row);
    rowModules.push(moduleId);
  });
  const representedModules = new Set(rowModules);
  const missingModules = reference.targets.domains
    .map(domain => domain.module)
    .filter(moduleId => !representedModules.has(moduleId));
  if (missingModules.length) {
    throw candidateError(
      "empty-domain",
      `候选表 ${referenceTableLabel(reference)} 已读取且路径匹配，但引用值域没有发布 ${
        missingModules.join(", ")} 的归属记录`,
    );
  }
  const keys = new Map();
  resolvedRows.forEach((row, index) => {
    const rawKey = valueAtPath(row, reference.key);
    if (rawKey === MISSING || rawKey === null || rawKey === "") return;
    const key = String(rawKey);
    if (keys.has(key)) {
      throw new Error(
        `多目标候选键 ${key} 同时属于 ${keys.get(key)} 与 ${rowModules[index]}`,
      );
    }
    keys.set(key, rowModules[index]);
  });
  return {rows: resolvedRows, rowModules};
}

function nativeControl(shell) {
  return shell.querySelector("[data-module-field-control]");
}


function referenceValueFromControl(control, reference) {
  if (reference.nullable === undefined) return control.value;
  try {
    return JSON.parse(control.value);
  } catch (error) {
    throw new TypeError(`可空引用的精确值不是 JSON：${error?.message || error}`);
  }
}

function consumerScopeBinding(shell, reference) {
  if (reference.scope?.source === undefined) return null;
  const encodedPath = shell.dataset.moduleReferenceScopeSourcePath;
  const encodedValue = shell.dataset.moduleReferenceScopeSourceValue;
  if (!encodedPath || encodedValue === undefined) {
    throw new TypeError("consumer scope DOM 缺少 source 路径或初始值");
  }
  let path;
  let initialValue;
  try {
    path = JSON.parse(decodedText(encodedPath));
    initialValue = JSON.parse(decodedText(encodedValue));
  } catch (error) {
    throw new TypeError(`consumer scope DOM 不是有效 JSON：${error?.message || error}`);
  }
  requirePath(path, "consumer scope DOM source path", {allowEmpty: false});
  scopeScalar(initialValue, "consumer scope DOM 初始值");
  const form = shell.closest("[data-module-field-save]");
  const control = [...(form?.querySelectorAll?.("[data-module-field-control]") || [])]
    .find(candidate => candidate.dataset.moduleFieldPath === encodedPath) || null;
  return {path, initialValue, control};
}

function consumerScopeControlValue(binding) {
  const control = binding.control;
  if (!control) return binding.initialValue;
  const type = control.dataset.moduleFieldType;
  if (type === "string") return control.value;
  if (type === "boolean") return control.checked;
  if (type === "number") {
    const value = Number(control.value);
    if (!control.value.trim() || !Number.isFinite(value)) {
      throw new TypeError(`consumer scope source ${binding.path.join("/")} 不是有效数字`);
    }
    return value;
  }
  if (type === "json") {
    try {
      return scopeScalar(
        JSON.parse(control.value),
        `consumer scope source ${binding.path.join("/")}`,
      );
    } catch (error) {
      throw new TypeError(
        `consumer scope source ${binding.path.join("/")} 不是有效 JSON 标量：${
          error?.message || error}`,
      );
    }
  }
  throw new TypeError(
    `consumer scope source ${binding.path.join("/")} 不是可读取的标量控件`,
  );
}

function renderResolvedShell(
  shell,
  reference,
  rows,
  rowModules,
  error,
  paint,
  unavailableKind = "",
) {
  const control = nativeControl(shell);
  if (!control) throw new Error("引用字段缺少原始精确值控件");
  const label = control.getAttribute("aria-label") || "引用";
  shell.innerHTML = referenceFieldPickerMarkup({
    reference,
    rows,
    rowModules,
    value: referenceValueFromControl(control, reference),
    label,
    controlMarkup: control.outerHTML,
    error,
    unavailableKind,
  });
  shell.dataset.moduleFieldReferenceReady = error ? "error" : "ready";
  hydrateReferenceFieldPickers(shell, {paint});
}

function bindConsumerScopeSource(shell, reference, rows, paint, binding) {
  if (!binding?.control || shell.dataset.moduleReferenceScopeSourceBound === "1") return;
  shell.dataset.moduleReferenceScopeSourceBound = "1";
  let current;
  try {
    current = JSON.stringify(consumerScopeControlValue(binding));
  } catch (_error) {
    current = "invalid";
  }
  const refresh = () => {
    let next;
    try {
      next = JSON.stringify(consumerScopeControlValue(binding));
    } catch (_error) {
      next = "invalid";
    }
    if (next === current) return;
    current = next;
    renderLoadedReferenceShell(shell, reference, rows, paint);
  };
  binding.control.addEventListener("input", refresh);
  binding.control.addEventListener("change", refresh);
}

function renderLoadedReferenceShell(shell, reference, loaded, paint) {
  let binding = null;
  try {
    binding = consumerScopeBinding(shell, reference);
    const sourceValue = binding ? consumerScopeControlValue(binding) : MISSING;
    const {rows, rowModules} = resolvedCandidateRows(loaded, reference, sourceValue);
    if (!rows.length) {
      const reason = binding
        ? `候选表 ${referenceTableLabel(reference)} 已读取且路径匹配，但没有 consumer source ${
          reference.scope.source.join("/")}=${String(sourceValue)} 对应的候选记录`
        : reference.scope
          ? `候选表 ${referenceTableLabel(reference)} 已读取且路径匹配，但没有符合声明值域的记录`
          : `候选表 ${referenceTableLabel(reference)} 已读取且路径匹配，但候选数组为空`;
      throw candidateError(
        "empty-domain",
        reason,
      );
    }
    renderResolvedShell(shell, reference, rows, rowModules, "", paint);
  } catch (error) {
    const failure = candidateFailure(error);
    renderResolvedShell(
      shell,
      reference,
      [],
      [],
      `候选项不可用：${failure.reason}`,
      paint,
      failure.kind,
    );
  }
  bindConsumerScopeSource(shell, reference, loaded, paint, binding);
}













































/**
 * 按声明分组读取候选表并水合。loadRows/paint 只供薄浏览器合同注入；产品路径固定
 * 调用上面的精确表读取器。
 */
