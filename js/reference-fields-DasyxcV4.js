import './prg-loaders-DnCSmXk9.js';
import './emulator-Bpa8EsFw.js';
import './timeline-player-YCH7Y-3h.js';
import './attack-chr-tile-selector-Bv5xCQyz.js';

// @editor-module 固定字段列的静态引用声明与候选表读取
//
// 正式声明可写在单值列的 column.reference；一列绑定多个值时，写在对应的
// column.paths[N].reference。引用数组与带引用子字段的对象仍在同一处声明 container，
// 每个叶子绑定自己的精确数值路径，不把容器序列化成单个 picker 的值。一个候选表
// 同时发布多个实体 owner 时，用 targets.owner/domains 按发布字段分域；禁止把 ID 范围
// 复制进声明。候选来源必须在引用叶子里点名，禁止扫模块图、清单或运行时资源来猜。
// 本文件的 SAMPLE 只用于本机制分支，避免改 static-tables.js 与清单子线撞文件。

const CODEC_ID = /^[a-z0-9][a-z0-9._/-]*$/u;
const opcodeOperandCodecs = new Map();
const encodedScalarCodecs = new Map();
const bitSliceCodecs = new Map();
const linkedFieldCodecs = new Map();
const contextAwareReferenceCodecs = new Map();

const SCENE_HANDLE_REFERENCE_CODEC_ID = "scene/opaque-handle/v1";

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








const SHELL_VISUAL_REFERENCE_CODEC_ID = "shell-record/visual-selector/v1";
const AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID =
  "audio-voice/envelope-pointer/v1";
const AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID =
  "audio-command/track-sequence-pointer/v1";
const APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID =
  "application-config-family/configuration-pointer/v1";
const INVESTIGATION_HANDLER_SELECTOR_CODEC_ID =
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

const ATTACK_VISUAL_COMMANDS_CODEC_ID = "attack-visual/commands/v1";
const ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID =
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

const ACTOR_MOTION_CHR_TILE_CODEC_ID = "shared-chr-bank/actor-motion-tile";

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
Object.freeze([
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

function registerContextAwareReferenceCodec(codecId, codec) {
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

/** owner 独占编码与候选投影知识；字段层只调用不透明操作，并校验投影没有发明目标键。 */
function registerEncodedScalarReferenceCodec(codecId, definition) {
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

/** 位段布局只在 owner codec；字段层额外证明写回前后的非目标保存态完全一致。 */
function registerBitSliceReferenceCodec(codecId, definition) {
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

/**
 * 多个存储字段怎样合成一个目标键完全由 owner codec 决定。
 * candidates 可以先把这次静态声明实际加载的候选表投影成 owner 的逻辑目标；
 * accepts 随后收到完整投影，让 owner 能沿发布关系解析值域。通用层只保证投影
 * 没有发明发布表之外的目标键，也不解释句柄或复制 owner 的边界规则。若这个
 * 逻辑目标不是目标模块的通用句柄域，owner 可明确要求按字段声明呈现投影行。
 */
function registerLinkedFieldReferenceCodec(codecId, definition) {
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




/** owner 登记自己的解码与编码；通用字段层不包含任何 opcode 常量或长度规则。 */
function registerOpcodeOperandCodec(codecId, definition) {
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

/** 保存期必须经过同一个 owner encoder；没有 codec 时绝不按普通字段路径写入。 */
function applyOpcodeOperandEdits(codecId, value, updates) {
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













































/**
 * 按声明分组读取候选表并水合。loadRows/paint 只供薄浏览器合同注入；产品路径固定
 * 调用上面的精确表读取器。
 */

export { ACTOR_MOTION_CHR_TILE_CODEC_ID, APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID, ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID, ATTACK_VISUAL_COMMANDS_CODEC_ID, AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID, AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID, INVESTIGATION_HANDLER_SELECTOR_CODEC_ID, SCENE_HANDLE_REFERENCE_CODEC_ID, SHELL_VISUAL_REFERENCE_CODEC_ID, applyOpcodeOperandEdits, registerBitSliceReferenceCodec, registerContextAwareReferenceCodec, registerEncodedScalarReferenceCodec, registerLinkedFieldReferenceCodec, registerOpcodeOperandCodec };
