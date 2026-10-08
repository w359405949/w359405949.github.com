// @editor-module 将视觉语义资产编码为逻辑组件载荷。
// Pure semantic encoder for Metal Max CN visual assets.
//
// This is the browser counterpart of engine/tools/mm_visual.py.  It owns the
// stable resource/component schemas and compact byte codecs, but deliberately
// knows nothing about ROM files, banks, target slots, or transport.  The
// AssetCompiler registry injects placement only after these payloads exist.

import {validateFieldOverrides, encodeImportedDocumentFields, fieldFragmentId, fieldOffsetInFragment, fieldByteLength, fieldRomValue, ROM_WRITE_PENDING} from "./field-codec.js";
import {MONSTER_PALETTE_FRAGMENT, monsterPaletteFieldOwner, monsterPaletteImportAsset} from "./monster-palette-compiler.js";
import {MONSTER_PALETTE_PAIR_FRAGMENT, monsterPalettePairFieldOwner, monsterPalettePairImportAsset} from "./monster-palette-pair-compiler.js";
import {MONSTER_FIGURE_FRAGMENTS, monsterFigureFieldOwner, monsterFigureImportAsset} from "./monster-figure-compiler.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {sha256Hex} from "./rom-linker.js";
import {
  ACTOR_TYPE_COUNT,
  PARTY_MEMBER_COUNT,
} from "./visual-actors.js";
import {attackChrTileEncoding, battleLayoutTileBinding,
  BATTLE_LAYOUT_CONTEXT_SOURCE, BATTLE_LAYOUT_TILE_SOURCE} from "./attack-chr-owner.js";
import {actorChrTileBinding, VISUAL_ACTORS_CONTEXT_SOURCE,
  VISUAL_CHR_CANDIDATE_SOURCE} from "./actor-chr-owner.js";
import {semanticScriptReferences} from "./attack-script-references.js";
import {decodeGenericObjects} from "./metasprite-layout.js";

export const VISUAL_COMPILER_ID = "visual-core/v1";
export const VISUAL_COMPONENT_CODEC = "metalmaxcn.visual-component";
export const VISUAL_COMPONENT_CODEC_VERSION = "1";
export const VISUAL_ENCODER = "visual-core/v1";
export const VISUAL_ENCODER_VERSION = "1";
const VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT =
  "monster-visual-layout.attack-source-anchors";

export const VISUAL_RESOURCE_IDS = Object.freeze([
  "attack-visual",
  "attack-visual-aux-script",
  "battle-action",
  "enemy-action",
  "enemy-action-pattern",
  "battle-object-layout",
  "actor-visual",
  "metasprite-record",
  "monster-visual-layout",
  "vehicle-visual-selector",
  "shared-chr-bank",
]);

export const ACTOR_FRAME_COUNT = 0xd7;
export const ACTOR_FRAMES_PER_DIRECTIONAL_MOTION = 6;
const ACTOR_MOTION_KINDS = new Set([
  "single-frame", "directionless-sequence", "directional-4x2",
]);
const ACTOR_DIRECTION_IDS = new Set(["up", "down", "left", "right"]);
const ACTOR_TILE_DELTA_COUNT = 0x10;
const ACTOR_QUADRANT_MAP_COUNT = 0x20;
const ACTOR_PALETTE_COUNT = 4;
export const GENERIC_POINTER_COUNT = 55;
const GENERIC_RECORD_BYTES = 678;
export const BATTLE_ACTOR_SELECTOR_COUNT = 5;
export const DIRECT_FRAME_POINTER_COUNT = 0x46;
const DIRECT_FRAME_RECORD_BYTES = 543;
const BATTLE_SPRITE_PALETTE_COUNT = 4;
export const MONSTER_ENEMY_COUNT = 131;
export const MONSTER_PALETTE_PAIR_COUNT = 0x1b;
export const MONSTER_PALETTE_COUNT = 0x4a;
const MONSTER_DUAL_PALETTE_BYTES = 108;
export const MONSTER_GRAPHIC_COUNT = 79;
export const MONSTER_SEQUENTIAL_GRAPHICS = 72;
export const MONSTER_SPECIAL_BANK_COUNT = 7;
const MONSTER_ATTACK_SOURCE_ANCHOR_BYTES = 0xf2;
export const MONSTER_LAYOUT_BYTES = 862;
const VEHICLE_PRESET_COUNT = 18;
const VEHICLE_STATUS_CHASSIS_FIRST = 0x91;
const VEHICLE_STATUS_CHASSIS_COUNT = 8;
const ATTACK_VISUAL_RECORD_COUNT = 0x4f;
const ATTACK_VISUAL_AUX_RECORD_COUNT = 26;
export const ATTACK_VISUAL_TABLE_BYTES = 1371;
const ATTACK_VISUAL_AUX_TABLE_BYTES = 558;
const ATTACK_VISUAL_AUX_COMPONENT_ID = "attack-visual-aux-script.records";
const ATTACK_VISUAL_TERMINATOR = 0x9f;
const ATTACK_VISUAL_BLOCK_END = 0xa0;
export const ATTACK_VISUAL_OPAQUE_RECORD_ID = 0x46;
export const ATTACK_VISUAL_OPAQUE_BYTES = Object.freeze([
  0x1c, 0x0b, 0x07, 0x0d, 0x1b, 0xc2, 0x0c, 0x28,
  0x02, 0x53, 0x14, 0xff, 0x03, 0x04, 0xa0, 0x9f,
]);
export const ATTACK_VISUAL_OPAQUE_BLOB = Object.freeze({
  encoding: "hex-bytes/v1",
  length: ATTACK_VISUAL_OPAQUE_BYTES.length,
  bytes_hex: "1C 0B 07 0D 1B C2 0C 28 02 53 14 FF 03 04 A0 9F",
  sha256: "668c9403e16f4152b33fb689f659575ec626c02c598c93c83db70130abb317b2",
});
const ATTACK_VISUAL_COMMAND_SPECS = new Map([
  [0x00, ["call_visual_script", ["visual_code"]]],
  [0x01, ["call_aux_script", ["script_id"]]],
  [0x02, ["play_sound", ["sound_id"]]],
  [0x03, ["set_delay", ["frames"]]],
  [0x04, ["set_frame_mode_and_wait", ["mode"]]],
  [0x05, ["run_battle_ui_sequence", []]],
  [0x06, ["clear_effect_objects", []]],
  [0x07, ["clear_object_set_delay", ["packed_object_delay"]]],
  [0x08, ["set_object_action", ["packed_object_delay", "action"]]],
  [0x09, ["move_object_xy", ["packed_object_delay", "delta_x", "delta_y"]]],
  [0x0a, ["clear_object0_y", []]],
  [0x0b, ["set_battle_sprite_palette", ["palette_offset"]]],
  [0x0c, ["repeat_command_block", ["repeat_count"]]],
  [0x0d, ["move_object_x", ["packed_object_delay", "delta_x"]]],
  [0x0e, ["increment_object_action", ["packed_object_delay"]]],
  [0x0f, ["decrement_object_action", ["packed_object_delay"]]],
  [0x10, ["increment_actor_state", ["delay"]]],
  [0x11, ["decrement_actor_state", ["delay"]]],
  [0x12, ["spawn_object_at_target", ["packed_object_delay", "action"]]],
  [0x13, ["spawn_object_at_actor", ["packed_object_delay", "action"]]],
  [0x14, ["move_actor_x_or_skip", ["delta_x"]]],
  [0x15, ["skip_or_move_actor_x", ["delta_x"]]],
  [0x16, ["animate_linear_path", ["path_parameter"]]],
  [0x17, ["animate_linear_path_with_trail", [
    "path_parameter", "trail_object_count",
  ]]],
  [0x18, ["animate_linear_path_delayed", ["path_parameter", "duration"]]],
  [0x19, ["animate_path_delayed_with_trail", [
    "path_parameter", "duration", "trail_object_count",
  ]]],
  [0x1a, ["animate_toggled_path", ["path_parameter"]]],
  [0x1b, ["animate_toggled_path_mirrored", ["path_parameter"]]],
]);
const BATTLE_ACTION_FIRST = 0x01;
const BATTLE_ACTION_LAST = 0xfe;
const BATTLE_ACTION_RECORD_COUNT = BATTLE_ACTION_LAST - BATTLE_ACTION_FIRST + 1;
const BATTLE_ACTION_NULL_COUNT = 7;
const BATTLE_ACTION_CONFIG_COMPONENT_ID = "battle-action.config-table";
const BATTLE_ACTION_POINTER_COMPONENT_ID = "battle-action.pointer-table";
const BATTLE_OBJECT_LAYOUT_COUNT = 226;
const BATTLE_OBJECT_LAYOUT_BYTES = 1338;
const ENEMY_ACTION_RECORD_COUNT = 112;
const ENEMY_ACTION_VISUAL_COMPONENT_ID = "enemy-action.visual-selectors";
const ENEMY_ACTION_VISUAL_MASK = 0x3f;
const ENEMY_ACTION_REPEAT_COUNTER_MASK = 0xc0;
const BATTLE_OBJECT_LAYOUT_COMPONENT_LENGTHS = Object.freeze(
  "10,13,13,13,13,13,13,13,4,11,11,5,5,5,5,5,3,3,3,3,4,3,3,4,3,5,3,5,3,2,3,4,3,2,2,2,2,2,2,2,5,2,2,2,2,2,2,2,10,3,2,7,3,3,3,2,2,3,10,2,7,2,2,2,2,3,3,3,21,21,3,3,7,5,2,3,3,2,2,2,2,2,2,2,2,7,2,3,3,13,2,5,5,5,4,3,5,3,5,9,13,41,2,2,2,2,2,3,2,2,3,3,13,2,2,2,2,3,3,3,5,5,5,5,5,2,3,7,9,11,11,4,5,3,2,5,5,5,2,5,7,9,9,9,4,3,3,3,5,5,2,2,4,4,4,3,3,3,3,5,13,13,13,9,5,2,3,10,2,2,2,2,2,5,2,2,5,5,5,5,5,7,5,13,10,13,5,5,5,5,5,5,5,5,2,2,2,3,5,7,10,10,10,7,7,4,10,10,10,10,10,10,5,21,25,25,13,13,13,13,13,13,25,25,5,25"
    .split(",").map(Number),
);

// mm_visual.visual_chr_bank_ids 的浏览器副本：actor/monster bank，加上每个普通
// 场景、世界地图分区与动画页、UI/设施预览页，以及战斗特效脚本要的精灵窗口页。
//
// 它是**构建契约**，所以必须自己一份，不能改成读包里的 chr.json——那样一份被
// 改过的包就能自己声明要写哪些 bank。代价是它得跟着 Python 那边手工重新生成：
// `visual_chr_bank_ids` 每加一类来源（世界地图、战斗特效……都加过），这里少跟一
// 次，`shared-chr-bank` 的编译就整个报 identity set mismatch。
//
// 顺序必须与 bindings 里 components 的 asset_offset 顺序一致（当前即 bank 号升
// 序），encodeVisual 按这个顺序拼字节。
export const VISUAL_CHR_BANK_IDS = Object.freeze([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0a, 0x0b,
  0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
  0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22,
  0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c,
  0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a,
  0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 0x44,
  0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e,
  0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x61, 0x62, 0x63,
  0x64, 0x65, 0x66, 0x67, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f,
  0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
  0x7a, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f, 0x80, 0x81, 0x82, 0x83,
  0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
  0x8e, 0x8f, 0x90, 0x91, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
  0x99, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0xa0, 0xa1, 0xa2, 0xa3,
  0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae,
  0xaf, 0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8,
  0xb9, 0xba, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf, 0xc0, 0xc1, 0xc2, 0xc3,
  0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xcb, 0xcc, 0xcd,
  0xce, 0xcf,
]);

const ASSET_SCHEMAS = Object.freeze({
  "attack-visual": "metalmaxcn.weapon-effect.asset.attack-visual",
  "attack-visual-aux-script":
    "metalmaxcn.weapon-effect.asset.attack-visual-aux-script",
  "battle-action": "metalmaxcn.module-asset.battle-action",
  "enemy-action": "metalmaxcn.module-asset.enemy-action",
  "enemy-action-pattern": "metalmaxcn.module-asset.enemy-action-pattern",
  "battle-object-layout": "metalmaxcn.module-asset.battle-object-layout",
  "actor-visual": "metalmaxcn.visual.asset.actors",
  "metasprite-record": "metalmaxcn.visual.asset.metasprites",
  "monster-visual-layout": "metalmaxcn.visual.asset.monsters",
  "vehicle-visual-selector": "metalmaxcn.visual.asset.vehicle-selectors",
  "shared-chr-bank": "metalmaxcn.visual.asset.chr",
});

const COMPONENT_SPECS = Object.freeze({
  "attack-visual": Object.freeze(Array.from(
    {length: ATTACK_VISUAL_TABLE_BYTES},
    (_, index) => [
      `attack-visual.table-byte.${index.toString(16).toUpperCase().padStart(4, "0")}`,
      1,
    ],
  )),
  "attack-visual-aux-script": Object.freeze([
    [ATTACK_VISUAL_AUX_COMPONENT_ID, ATTACK_VISUAL_AUX_TABLE_BYTES],
  ]),
  "battle-action": Object.freeze([
    [BATTLE_ACTION_CONFIG_COMPONENT_ID, BATTLE_ACTION_RECORD_COUNT],
    [BATTLE_ACTION_POINTER_COMPONENT_ID, BATTLE_ACTION_RECORD_COUNT * 2],
  ]),
  "enemy-action-pattern": Object.freeze([["enemy-action-pattern.records", 99 * 6]]),
  "enemy-action": Object.freeze([
    [ENEMY_ACTION_VISUAL_COMPONENT_ID, ENEMY_ACTION_RECORD_COUNT],
  ]),
  "battle-object-layout": Object.freeze(
    BATTLE_OBJECT_LAYOUT_COMPONENT_LENGTHS.map((length, id) => [
      `battle-object-layout.record-${id.toString(16).toUpperCase().padStart(3, "0")}`,
      length,
    ]),
  ),
  "actor-visual": Object.freeze([
    ["actor-visual.field-sprite-palettes", 16],
    ["actor-visual.frame-descriptors", ACTOR_FRAME_COUNT],
    ["actor-visual.party-alive-types", PARTY_MEMBER_COUNT],
    ["actor-visual.quadrant-maps", ACTOR_QUADRANT_MAP_COUNT],
    ["actor-visual.tile-a", ACTOR_FRAME_COUNT],
    ["actor-visual.tile-b", ACTOR_FRAME_COUNT],
    ["actor-visual.tile-deltas", ACTOR_TILE_DELTA_COUNT],
    ["actor-visual.type-frame-bases", ACTOR_TYPE_COUNT],
    ["actor-visual.type-oam-attributes", ACTOR_TYPE_COUNT],
  ]),
  "metasprite-record": Object.freeze([
    ["metasprite-record.battle-actor-selectors", BATTLE_ACTOR_SELECTOR_COUNT],
    ["metasprite-record.battle-sprite-palettes", 12],
    ["metasprite-record.direct-frame-pointers", DIRECT_FRAME_POINTER_COUNT * 2],
    ["metasprite-record.direct-frame-records", DIRECT_FRAME_RECORD_BYTES],
    ["metasprite-record.generic-pointers", GENERIC_POINTER_COUNT * 2],
    ["metasprite-record.generic-records", GENERIC_RECORD_BYTES],
  ]),
  "monster-visual-layout": Object.freeze([
    ["monster-visual-layout.attack-source-anchors", MONSTER_ATTACK_SOURCE_ANCHOR_BYTES],
    ["monster-visual-layout.dimensions", MONSTER_GRAPHIC_COUNT],
    ["monster-visual-layout.dual-palette-layouts", MONSTER_DUAL_PALETTE_BYTES],
    ["monster-visual-layout.enemy-palette-codes", MONSTER_ENEMY_COUNT],
    ["monster-visual-layout.enemy-to-graphic", MONSTER_ENEMY_COUNT],
    ["monster-visual-layout.graphic-bank-codes", MONSTER_GRAPHIC_COUNT],
    ["monster-visual-layout.layout-pointers", MONSTER_GRAPHIC_COUNT * 2],
    ["monster-visual-layout.layout-region", MONSTER_LAYOUT_BYTES],
    ["monster-visual-layout.palette-colors", MONSTER_PALETTE_COUNT * 3],
    ["monster-visual-layout.palette-pairs", MONSTER_PALETTE_PAIR_COUNT * 2],
    ["monster-visual-layout.sequential-tile-offsets", MONSTER_SEQUENTIAL_GRAPHICS],
    ["monster-visual-layout.special-bank-roots", MONSTER_SPECIAL_BANK_COUNT],
  ]),
  "vehicle-visual-selector": Object.freeze([
    ["vehicle-visual-selector.map-actor-types", VEHICLE_PRESET_COUNT],
    ["vehicle-visual-selector.status-background-chr-banks", VEHICLE_STATUS_CHASSIS_COUNT],
    ["vehicle-visual-selector.status-sprite-chr-banks", VEHICLE_STATUS_CHASSIS_COUNT],
  ]),
  "shared-chr-bank": Object.freeze(VISUAL_CHR_BANK_IDS.map(bank => [
    `shared-chr-bank.bank-${bank.toString(16).padStart(2, "0")}`,
    0x400,
  ])),
});

class VisualEncodingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "VisualEncodingError";
  }
}

const plainObject = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

function requireObject(value, label) {
  if (!plainObject(value)) throw new VisualEncodingError(`${label} must be an object`);
  return value;
}

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new VisualEncodingError(
      `${label} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

const byte = (value, label) => integer(value, label, 0, 0xff);
const word = (value, label) => integer(value, label, 0, 0xffff);

function recordsById(values, count, label) {
  if (!Array.isArray(values) || values.length !== count) {
    throw new VisualEncodingError(`${label} must contain exactly ${count} records`);
  }
  const byId = new Map();
  for (const [position, raw] of values.entries()) {
    const record = requireObject(raw, `${label}[${position}]`);
    const id = integer(record.id, `${label}[${position}].id`, 0, count - 1);
    if (byId.has(id)) throw new VisualEncodingError(`${label} repeats stable id ${id}`);
    byId.set(id, record);
  }
  return Array.from({length: count}, (_, id) => byId.get(id));
}

function encodeByteRecords(values, count, label) {
  return Uint8Array.from(recordsById(values, count, label).map((record, index) =>
    byte(record.value, `${label}[${index}].value`)));
}

function encodeColorRecords(values, count, width, label) {
  const output = new Uint8Array(count * width);
  for (const [index, record] of recordsById(values, count, label).entries()) {
    if (!Array.isArray(record.colors) || record.colors.length !== width) {
      throw new VisualEncodingError(
        `${label}[${index}].colors must contain ${width} bytes`,
      );
    }
    for (let color = 0; color < width; color += 1) {
      output[index * width + color] = byte(
        record.colors[color], `${label}[${index}].colors[${color}]`,
      );
    }
  }
  return output;
}

function encodeWords(values, count, field, label) {
  const output = new Uint8Array(count * 2);
  for (const [index, record] of recordsById(values, count, label).entries()) {
    const value = word(record[field], `${label}[${index}].${field}`);
    output[index * 2] = value & 0xff;
    output[index * 2 + 1] = value >> 8;
  }
  return output;
}

function actorMotions(document) {
  if (!Array.isArray(document.motions) || !document.motions.length) {
    throw new VisualEncodingError(
      "motions must contain at least one actor motion",
    );
  }
  const motions = new Map();
  for (const [index, raw] of document.motions.entries()) {
    const motion = requireObject(raw, `motions[${index}]`);
    if (typeof motion.id !== "string" || !motion.id) {
      throw new VisualEncodingError(
        `motions[${index}].id must be a non-empty string`,
      );
    }
    if (motions.has(motion.id)) {
      throw new VisualEncodingError(`motions repeats stable id ${motion.id}`);
    }
    if (motion.resource_id !== `actor-motion:${motion.id}`) {
      throw new VisualEncodingError(
        `motions[${index}].resource_id must equal actor-motion:${motion.id}`,
      );
    }
    if (!ACTOR_MOTION_KINDS.has(motion.kind)) {
      throw new VisualEncodingError(`motions[${index}].kind is invalid`);
    }
    if (!Array.isArray(motion.frame_ids)) {
      throw new VisualEncodingError(
        `motions[${index}].frame_ids must be an array`,
      );
    }
    const expectedCount = motion.kind === "single-frame" ? 1
      : motion.kind === "directional-4x2"
        ? ACTOR_FRAMES_PER_DIRECTIONAL_MOTION : null;
    if (expectedCount !== null && motion.frame_ids.length !== expectedCount) {
      throw new VisualEncodingError(
        `motions[${index}].frame_ids must contain ${expectedCount} frames`,
      );
    }
    if (motion.kind === "directionless-sequence"
        && (motion.frame_ids.length < 2 || motion.frame_ids.length > 6)) {
      throw new VisualEncodingError(
        `motions[${index}].frame_ids must contain 2..6 sequence frames`,
      );
    }
    const frames = motion.frame_ids.map((value, frameIndex) => integer(
      value, `motions[${index}].frame_ids[${frameIndex}]`,
      0, ACTOR_FRAME_COUNT - 1,
    ));
    if (frames.some((frame, frameIndex) => frame !== frames[0] + frameIndex)) {
      throw new VisualEncodingError(
        `motions[${index}].frame_ids must be a contiguous selector run`,
      );
    }
    motions.set(motion.id, {...motion, frame_ids: frames});
  }
  return motions;
}

function validateActorDirectionalSelector(document) {
  const selector = requireObject(
    document.directional_selector,
    "directional_selector",
  );
  if (integer(
    selector.steps_per_direction,
    "directional_selector.steps_per_direction",
    1,
    8,
  ) !== 2) {
    throw new VisualEncodingError(
      "directional_selector.steps_per_direction must equal 2",
    );
  }
  if (!Array.isArray(selector.directions)
      || selector.directions.length !== ACTOR_DIRECTION_IDS.size) {
    throw new VisualEncodingError(
      "directional_selector.directions must contain four entries",
    );
  }
  const seen = new Set();
  for (const [index, raw] of selector.directions.entries()) {
    const direction = requireObject(
      raw, `directional_selector.directions[${index}]`,
    );
    if (typeof direction.id !== "string"
        || !ACTOR_DIRECTION_IDS.has(direction.id)
        || seen.has(direction.id)) {
      throw new VisualEncodingError(
        `directional_selector.directions[${index}].id is invalid`,
      );
    }
    seen.add(direction.id);
    if (!Array.isArray(direction.frame_indexes)
        || direction.frame_indexes.length !== 2) {
      throw new VisualEncodingError(
        `directional_selector.directions[${index}].frame_indexes must contain 2 indexes`,
      );
    }
    direction.frame_indexes.forEach((value, frameIndex) => integer(
      value,
      `directional_selector.directions[${index}].frame_indexes[${frameIndex}]`,
      0,
      ACTOR_FRAMES_PER_DIRECTIONAL_MOTION - 1,
    ));
    byte(
      direction.oam_attribute_or,
      `directional_selector.directions[${index}].oam_attribute_or`,
    );
  }
}

function actorTypeFrameBases(actorTypes, motions) {
  return Uint8Array.from(actorTypes.map((record, index) => {
    const expectedResourceId = `actor-type:${index.toString(16).toUpperCase().padStart(2, "0")}`;
    if (record.resource_id !== expectedResourceId) {
      throw new VisualEncodingError(
        `actor_types[${index}].resource_id must equal ${expectedResourceId}`,
      );
    }
    if (typeof record.motion_id !== "string"
        || !motions.has(record.motion_id)) {
      throw new VisualEncodingError(
        `actor_types[${index}].motion_id must reference motions`,
      );
    }
    if (!Array.isArray(record.entry_overrides)) {
      throw new VisualEncodingError(
        `actor_types[${index}].entry_overrides must be an array`,
      );
    }
    const entries = new Set();
    for (const [overrideIndex, raw] of record.entry_overrides.entries()) {
      const override = requireObject(
        raw, `actor_types[${index}].entry_overrides[${overrideIndex}]`,
      );
      if (typeof override.entry_point !== "string" || !override.entry_point
          || entries.has(override.entry_point)) {
        throw new VisualEncodingError(
          `actor_types[${index}].entry_overrides[${overrideIndex}].entry_point is invalid`,
        );
      }
      entries.add(override.entry_point);
      if (typeof override.motion_id !== "string"
          || !motions.has(override.motion_id)) {
        throw new VisualEncodingError(
          `actor_types[${index}].entry_overrides[${overrideIndex}].motion_id must reference motions`,
        );
      }
    }
    return motions.get(record.motion_id).frame_ids[0];
  }));
}

function encodeActors(document) {
  validateActorDirectionalSelector(document);
  const frames = recordsById(document.frames, ACTOR_FRAME_COUNT, "frames");
  const actorTypes = recordsById(
    document.actor_types, ACTOR_TYPE_COUNT, "actor_types",
  );
  const motions = actorMotions(document);
  const partyAliveActorTypes = recordsById(
    document.party_alive_actor_types,
    PARTY_MEMBER_COUNT,
    "party_alive_actor_types",
  );
  return new Map([
    ["actor-visual.field-sprite-palettes", encodeColorRecords(
      document.field_sprite_palettes, ACTOR_PALETTE_COUNT, 4,
      "field_sprite_palettes",
    )],
    ["actor-visual.frame-descriptors", Uint8Array.from(frames.map(
      (record, index) => byte(record.descriptor, `frames[${index}].descriptor`),
    ))],
    ["actor-visual.party-alive-types", Uint8Array.from(
      partyAliveActorTypes.map((record, index) => integer(
        record.actor_type,
        `party_alive_actor_types[${index}].actor_type`,
        0,
        ACTOR_TYPE_COUNT - 1,
      )),
    )],
    ["actor-visual.quadrant-maps", encodeByteRecords(
      document.quadrant_maps, ACTOR_QUADRANT_MAP_COUNT, "quadrant_maps",
    )],
    ["actor-visual.tile-a", Uint8Array.from(frames.map(
      (record, index) => byte(record.tile_a, `frames[${index}].tile_a`),
    ))],
    ["actor-visual.tile-b", Uint8Array.from(frames.map(
      (record, index) => byte(record.tile_b, `frames[${index}].tile_b`),
    ))],
    ["actor-visual.tile-deltas", encodeByteRecords(
      document.tile_deltas, ACTOR_TILE_DELTA_COUNT, "tile_deltas",
    )],
    ["actor-visual.type-frame-bases", actorTypeFrameBases(
      actorTypes, motions,
    )],
    ["actor-visual.type-oam-attributes", Uint8Array.from(actorTypes.map(
      (record, index) => byte(
        record.oam_attributes, `actor_types[${index}].oam_attributes`,
      ),
    ))],
  ]);
}

const VISUAL_ACTORS_OWNER = "actor-visual";
const ACTOR_FIELD_COMPONENTS = Object.freeze({
  palettes: "actor-visual.field-sprite-palettes",
  frames: "actor-visual.frame-descriptors",
  party: "actor-visual.party-alive-types",
  quadrants: "actor-visual.quadrant-maps",
  tileA: "actor-visual.tile-a",
  tileB: "actor-visual.tile-b",
  deltas: "actor-visual.tile-deltas",
  typeBases: "actor-visual.type-frame-bases",
  typeOam: "actor-visual.type-oam-attributes",
});

const actorFieldHandle = (kind, id) =>
  `${VISUAL_ACTORS_OWNER}:${kind}:${id}`;

function actorField(resourceId, entityHandle, fieldName, defaultValue,
  documentPath, fragmentId, offsetInFragment, extra = {}) {
  return {resourceId, entityHandle, fieldName, defaultValue, documentPath,
    fragmentId, offsetInFragment, byteLength: 1, ...extra};
}

/**
 * Describe the byte-owning leaves of actor-visual.  Motion definitions and
 * entry overrides are semantic references; only actor-type motion_id is
 * editable, and its published reference map derives the physical first-frame
 * byte without making up a new ROM address.
 */
export function visualActorsFieldDescriptions(document) {
  requireObject(document, `${VISUAL_ACTORS_OWNER} document`);
  const frames = recordsById(document.frames, ACTOR_FRAME_COUNT, "frames");
  const actorTypes = recordsById(document.actor_types, ACTOR_TYPE_COUNT, "actor_types");
  const motions = actorMotions(document);
  const party = recordsById(document.party_alive_actor_types, PARTY_MEMBER_COUNT,
    "party_alive_actor_types");
  const quadrants = recordsById(document.quadrant_maps, ACTOR_QUADRANT_MAP_COUNT,
    "quadrant_maps");
  const deltas = recordsById(document.tile_deltas, ACTOR_TILE_DELTA_COUNT,
    "tile_deltas");
  const palettes = recordsById(document.field_sprite_palettes, ACTOR_PALETTE_COUNT,
    "field_sprite_palettes");
  const fields = [];
  palettes.forEach((record, position) => {
    if (!Array.isArray(record.colors) || record.colors.length !== 4) {
      throw new VisualEncodingError(`field_sprite_palettes[${position}].colors must contain 4 bytes`);
    }
    record.colors.forEach((value, slot) => fields.push(actorField(
      VISUAL_ACTORS_OWNER, actorFieldHandle("palette", record.id), `color_${slot}`,
      byte(value, `field_sprite_palettes[${position}].colors[${slot}]`),
      ["field_sprite_palettes", position, "colors", slot],
      ACTOR_FIELD_COMPONENTS.palettes, record.id * 4 + slot,
    )));
  });
  frames.forEach((record, position) => {
    for (const [fieldName, component] of [["descriptor", ACTOR_FIELD_COMPONENTS.frames],
      ["tile_a", ACTOR_FIELD_COMPONENTS.tileA], ["tile_b", ACTOR_FIELD_COMPONENTS.tileB]]) {
      fields.push(actorField(VISUAL_ACTORS_OWNER, actorFieldHandle("frame", record.id),
        fieldName, byte(record[fieldName], `frames[${position}].${fieldName}`),
        ["frames", position, fieldName], component, record.id));
    }
  });
  party.forEach((record, position) => fields.push(actorField(
    VISUAL_ACTORS_OWNER, actorFieldHandle("party", record.id), "actor_type",
    integer(record.actor_type, `party_alive_actor_types[${position}].actor_type`,
      0, ACTOR_TYPE_COUNT - 1), ["party_alive_actor_types", position, "actor_type"],
    ACTOR_FIELD_COMPONENTS.party, record.id,
  )));
  quadrants.forEach((record, position) => fields.push(actorField(
    VISUAL_ACTORS_OWNER, actorFieldHandle("quadrant", record.id), "value",
    byte(record.value, `quadrant_maps[${position}].value`),
    ["quadrant_maps", position, "value"], ACTOR_FIELD_COMPONENTS.quadrants, record.id,
  )));
  deltas.forEach((record, position) => fields.push(actorField(
    VISUAL_ACTORS_OWNER, actorFieldHandle("delta", record.id), "value",
    byte(record.value, `tile_deltas[${position}].value`),
    ["tile_deltas", position, "value"], ACTOR_FIELD_COMPONENTS.deltas, record.id,
  )));
  actorTypes.forEach((record, position) => {
    if (typeof record.motion_id !== "string" || !motions.has(record.motion_id)) {
      throw new VisualEncodingError(`actor_types[${position}].motion_id must reference motions`);
    }
    const referenceValues = Object.fromEntries([...motions.entries()].map(([id, motion]) => [
      id, motion.frame_ids[0],
    ]));
    fields.push(actorField(
      VISUAL_ACTORS_OWNER, actorFieldHandle("type", record.id), "motion_id",
      record.motion_id, ["actor_types", position, "motion_id"],
      ACTOR_FIELD_COMPONENTS.typeBases, record.id,
      {allowedReferences: [...motions.keys()], referenceValues,
        entityAliases: [record.resource_id],
        // 引用列：候选是已发布 motions 的句柄，物理字节由 referenceValues 派生
        // （帧基址），不凭空造地址。
        serialization: {references: [...motions.keys()], referenceValues}},
    ));
    fields.push(actorField(
      VISUAL_ACTORS_OWNER, actorFieldHandle("type", record.id), "oam_attributes",
      byte(record.oam_attributes, `actor_types[${position}].oam_attributes`),
      ["actor_types", position, "oam_attributes"], ACTOR_FIELD_COMPONENTS.typeOam,
      record.id, {entityAliases: [record.resource_id]},
    ));
  });
  // Keep the selector as a semantic invariant.  It has no independently
  // writable component, so edits to it are rejected by validate below.
  validateActorDirectionalSelector(document);
  return fields;
}

const VISUAL_ACTOR_EDITOR_LABELS = Object.freeze({
  color_0: "调色板色 0",
  color_1: "调色板色 1",
  color_2: "调色板色 2",
  color_3: "调色板色 3",
  descriptor: "帧描述",
  tile_a: "帧图块 A",
  tile_b: "帧图块 B",
  actor_type: "角色类型",
  motion_id: "动作选择器",
  oam_attributes: "OAM 属性",
  value: "原值",
});

export function visualActorsObjects(document) {
  const fields = visualActorsFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    if (!grouped.has(field.entityHandle)) grouped.set(field.entityHandle, []);
    grouped.get(field.entityHandle).push(field);
  }
  const objects = [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `角色视觉 · ${entityHandle}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName,
      label: VISUAL_ACTOR_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: 0,
      max: field.fieldName === "actor_type" ? ACTOR_TYPE_COUNT - 1 : 255,
      ...(field.fieldName.startsWith('color_') ? {max: 63, semantic: {kind: 'palette-index', palette: 'nes'}} : {}),
      // 动作选择器是句柄不是数值：候选取已发布 motions，标签沿用旧控件的「句柄 · 名称」。
      ...(field.fieldName === "motion_id" ? {candidates: {
        resourceId: VISUAL_ACTORS_OWNER,
        documentPath: ["motions"],
        value: ["id"],
        label: ["id", "label"],
      }} : {}),
      // 帧图块列：候选与像素按该帧的已发布 CHR 消费上下文解析，控制权在 owner。
      ...(field.fieldName === "tile_a" || field.fieldName === "tile_b" ? {semantic: {kind: "image"}, tile: {
        contexts: VISUAL_ACTORS_CONTEXT_SOURCE,
        candidates: VISUAL_CHR_CANDIDATE_SOURCE,
        consumer: actorFrameId(entityHandle),
        bind: actorChrTileBinding,
      }} : {}),
    }))},
  }));
  for (const motion of actorMotions(document).values()) {
    const rows = motion.frame_ids.map(id => actorFieldHandle("frame", id));
    objects.push({id: motion.resource_id, label: motion.label, fragmentIds: [
      ACTOR_FIELD_COMPONENTS.frames, ACTOR_FIELD_COMPONENTS.tileA,
      ACTOR_FIELD_COMPONENTS.tileB,
    ], fields: rows.flatMap(row => ["descriptor", "tile_a", "tile_b"]
      .map(name => [row, name])), editor: {kind: "numeric-table", rows,
      columns: ["descriptor", "tile_a", "tile_b"].map(name => ({
        name, label: VISUAL_ACTOR_EDITOR_LABELS[name], min: 0, max: 255,
      }))}});
  }
  return objects;
}

/** 帧句柄 `actor-visual:frame:<id>` 里的帧号；它就是 CHR 上下文的消费键。 */
function actorFrameId(entityHandle) {
  const match = /^actor-visual:frame:(\d+)$/u.exec(entityHandle);
  if (!match) throw new TypeError(`角色帧句柄无效：${entityHandle}`);
  return Number(match[1]);
}

export function serializeVisualActorsField(field) {
  // 动作选择器存的是句柄：写进 ROM 的是已发布引用表派生的帧基址字节。
  if (field.fieldName === "motion_id") {
    const frameBase = field.serialization?.referenceValues?.[field.value];
    if (!fieldFragmentId(field) || fieldByteLength(field) !== 1
        || !Number.isInteger(frameBase) || frameBase < 0 || frameBase > 0xff) {
      throw new VisualEncodingError(
        `actor-visual motion_id ${field.value} must reference a published motion`,
      );
    }
    return new Uint8Array([frameBase]);
  }
  if (!fieldFragmentId(field) || fieldByteLength(field) !== 1 || !Number.isInteger(field.value)
      || field.value < 0 || field.value > 0xff) {
    throw new VisualEncodingError(`actor-visual field ${field.fieldName} must be a byte`);
  }
  return new Uint8Array([field.value]);
}

function validateVisualActorsAsset(asset, original) {
  if (asset?.resource_id !== VISUAL_ACTORS_OWNER
      || original?.resource_id !== VISUAL_ACTORS_OWNER
      || asset.schema !== ASSET_SCHEMAS[VISUAL_ACTORS_OWNER]
      || original.schema !== asset.schema) {
    throw new VisualEncodingError("actor-visual asset identity changed");
  }
  visualActorsFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of visualActorsFieldDescriptions(original.document)) {
    const path = field.assetPath ?? ["document", ...field.documentPath];
    const value = path.reduce((node, key) => node?.[key], asset);
    if (field.readOnly && !canonicalJsonEqual(value, field.defaultValue)) {
      throw new VisualEncodingError("actor-visual read-only semantic metadata changed");
    }
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] =
      structuredClone(value);
  }
  if (!canonicalJsonEqual(asset, expected)) {
    throw new VisualEncodingError(
      "actor-visual only published frame, palette, mapping and actor-type fields are editable",
    );
  }
  encodeActors(asset.document);
}

export function validateVisualActorsFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, visualActorsFieldDescriptions,
    validateVisualActorsAsset);
}

export function encodeVisualActorsFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const identity = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== VISUAL_ACTORS_OWNER || values.has(identity)) {
      throw new VisualEncodingError("actor-visual field identity invalid or repeated");
    }
    values.set(identity, defaults ? field.defaultValue : field.value);
  }
  const take = (kind, id, name) => {
    const identity = JSON.stringify([actorFieldHandle(kind, id), name]);
    if (!values.has(identity)) throw new VisualEncodingError(`actor-visual missing field ${identity}`);
    const value = values.get(identity);
    values.delete(identity);
    return value;
  };
  const palettes = new Uint8Array(16);
  for (let id = 0; id < ACTOR_PALETTE_COUNT; id++) for (let slot = 0; slot < 4; slot++) {
    palettes[id * 4 + slot] = byte(take("palette", id, `color_${slot}`),
      `palette ${id} color ${slot}`);
  }
  const frames = new Map([
    [ACTOR_FIELD_COMPONENTS.frames, new Uint8Array(ACTOR_FRAME_COUNT)],
    [ACTOR_FIELD_COMPONENTS.tileA, new Uint8Array(ACTOR_FRAME_COUNT)],
    [ACTOR_FIELD_COMPONENTS.tileB, new Uint8Array(ACTOR_FRAME_COUNT)],
  ]);
  for (let id = 0; id < ACTOR_FRAME_COUNT; id++) {
    frames.get(ACTOR_FIELD_COMPONENTS.frames)[id] = byte(take("frame", id, "descriptor"), `frame ${id} descriptor`);
    frames.get(ACTOR_FIELD_COMPONENTS.tileA)[id] = byte(take("frame", id, "tile_a"), `frame ${id} tile_a`);
    frames.get(ACTOR_FIELD_COMPONENTS.tileB)[id] = byte(take("frame", id, "tile_b"), `frame ${id} tile_b`);
  }
  const party = new Uint8Array(PARTY_MEMBER_COUNT);
  for (let id = 0; id < PARTY_MEMBER_COUNT; id++) party[id] = integer(
    take("party", id, "actor_type"), `party ${id} actor_type`, 0, ACTOR_TYPE_COUNT - 1,
  );
  const quadrants = new Uint8Array(ACTOR_QUADRANT_MAP_COUNT);
  for (let id = 0; id < ACTOR_QUADRANT_MAP_COUNT; id++) quadrants[id] = byte(
    take("quadrant", id, "value"), `quadrant ${id}`,
  );
  const deltas = new Uint8Array(ACTOR_TILE_DELTA_COUNT);
  for (let id = 0; id < ACTOR_TILE_DELTA_COUNT; id++) deltas[id] = byte(
    take("delta", id, "value"), `tile delta ${id}`,
  );
  const typeBases = new Uint8Array(ACTOR_TYPE_COUNT);
  const typeOam = new Uint8Array(ACTOR_TYPE_COUNT);
  for (let id = 0; id < ACTOR_TYPE_COUNT; id++) {
    const motionField = fields.find(field => field.entityHandle === actorFieldHandle("type", id)
      && field.fieldName === "motion_id");
    const motionId = take("type", id, "motion_id");
    const frameBase = motionField?.referenceValues?.[motionId];
    if (!Number.isInteger(frameBase)) throw new VisualEncodingError(`actor type ${id} has invalid motion reference`);
    typeBases[id] = byte(frameBase, `actor type ${id} frame base`);
    typeOam[id] = byte(take("type", id, "oam_attributes"), `actor type ${id} OAM`);
  }
  if (values.size) throw new VisualEncodingError("actor-visual has unregistered fields");
  return [
    {fragment_id: ACTOR_FIELD_COMPONENTS.palettes, payload: palettes, relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.frames, payload: frames.get(ACTOR_FIELD_COMPONENTS.frames), relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.party, payload: party, relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.quadrants, payload: quadrants, relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.tileA, payload: frames.get(ACTOR_FIELD_COMPONENTS.tileA), relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.tileB, payload: frames.get(ACTOR_FIELD_COMPONENTS.tileB), relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.deltas, payload: deltas, relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.typeBases, payload: typeBases, relocations: []},
    {fragment_id: ACTOR_FIELD_COMPONENTS.typeOam, payload: typeOam, relocations: []},
  ];
}

const METASPRITE_FIELD_TABLES = [
  ["battle_actor_metasprite_selectors", "battle-actor-selectors", BATTLE_ACTOR_SELECTOR_COUNT, 1, "metasprite_id", 1, GENERIC_POINTER_COUNT - 1],
  ["battle_sprite_palettes", "battle-sprite-palettes", BATTLE_SPRITE_PALETTE_COUNT, 3, "colors", 1, 255],
  ["direct_frame_pointers", "direct-frame-pointers", DIRECT_FRAME_POINTER_COUNT, 2, "pointer_cpu", 2, 65535],
  ["direct_frame_record_region", "direct-frame-records", DIRECT_FRAME_RECORD_BYTES, 1, "value", 1, 255],
  ["generic_pointers", "generic-pointers", GENERIC_POINTER_COUNT, 2, "pointer_cpu", 2, 65535],
  ["generic_record_region", "generic-records", GENERIC_RECORD_BYTES, 1, "value", 1, 255],
];

export function metaspriteFieldDescriptions(document) {
  requireObject(document, "metasprite-record document");
  const resourceId = "metasprite-record", fields = [];
  const uiHeaders = new Set([0x03, 0x30, ...Array.from({length: 12}, (_, index) => 0x16 + index)]
    .map(id => document.generic_pointers.find(row => row.id === id)?.pointer_cpu - 0x80B6));
  for (const [collection, component, count, stride, key, width, maximum] of METASPRITE_FIELD_TABLES) {
    recordsById(document[collection], count, collection);
    for (const [position, record] of document[collection].entries()) {
      const handle = `${resourceId}:${component}:${record.id}`;
      if (key === "colors" && (!Array.isArray(record.colors) || record.colors.length !== 3))
        throw new VisualEncodingError(`${handle} must contain exactly three colors`);
      for (let slot = 0; slot < (key === "colors" ? 3 : 1); slot++) {
        const path = key === "colors" ? [key, slot] : [key];
        const value = path.reduce((node, member) => node[member], record);
        integer(value, `${handle}.${key}`, 0, maximum);
        fields.push({resourceId, entityHandle: handle, recordId: record.id,
          fieldName: key === "colors" ? `color_${slot}` : key, defaultValue: value,
          documentPath: [collection, position, ...path], fragmentId: `${resourceId}.${component}`,
          offsetInFragment: record.id * stride + slot,
          byteLength: key === "colors" ? 1 : width});
        if (collection === 'generic_record_region' && uiHeaders.has(record.id))
          Object.assign(fields.at(-1), {minimum: 1, maximum: value});
      }
    }
  }
  return fields;
}

export function metaspriteGenericObject(document, reference) {
  const id = reference?.id;
  integer(id, 'metasprite id', 0, GENERIC_POINTER_COUNT - 1);
  const pointer = word(reference?.pointer?.value, 'metasprite pointer');
  const pointers = new Uint16Array(GENERIC_POINTER_COUNT);
  pointers[id] = pointer;
  const records = recordsById(document.generic_record_region, GENERIC_RECORD_BYTES, 'generic_record_region');
  const object = decodeGenericObjects(pointers, records.map(row => row.value))[id];
  const start = object.pointer - 0x80B6;
  const capacity = reference.capacity ?? object.sprites.length;
  if (!object.runtimeGenerated) integer(capacity, 'metasprite capacity', object.sprites.length, 0x7F);
  return {...object, source_fields: [
    {resource_id: 'metasprite', entity_handle: reference.handle, field: 'pointer_cpu'},
    ...(!object.runtimeGenerated ? Array.from({length: 1 + capacity * 4}, (_, index) => ({
      resource_id: 'metasprite-record', entity_handle: `metasprite-record:generic-records:${start + index}`, field: 'value',
    })) : []),
  ]};
}

function validateMetaspriteAsset(asset, original) {
  if (asset?.resource_id !== "metasprite-record" || original?.resource_id !== asset.resource_id
      || asset.schema !== ASSET_SCHEMAS[asset.resource_id]) throw new VisualEncodingError("metasprite-record asset identity changed");
  metaspriteFieldDescriptions(asset.document);
  for (const id of [0x03, 0x30, ...Array.from({length: 12}, (_, index) => 0x16 + index)]) {
    const pointer = original.document.generic_pointers.find(row => row.id === id)?.pointer_cpu;
    const index = pointer - 0x80B6;
    const maximum = original.document.generic_record_region[index]?.value;
    const count = asset.document.generic_record_region[index]?.value;
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 0x7F
        || !Number.isInteger(count) || count < 1 || count > maximum)
      throw new VisualEncodingError('界面元精灵图块数超出原记录容量');
  }
  const expected = structuredClone(original);
  for (const field of metaspriteFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("metasprite-record only existing selectors, pointers, record bytes and colors are editable");
}

export function validateMetaspriteFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, metaspriteFieldDescriptions, validateMetaspriteAsset);
}

export function encodeMetaspriteFields(fields, {defaults = false} = {}) {
  const values = new Map(), resourceId = "metasprite-record";
  for (const field of fields) {
    const identity = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== resourceId || values.has(identity))
      throw new VisualEncodingError("metasprite-record field identity duplicated or foreign");
    values.set(identity, defaults ? field.defaultValue : field.value);
  }
  const result = METASPRITE_FIELD_TABLES.map(([_collection, component, count, stride, key, width, maximum]) => {
    const payload = new Uint8Array(count * stride);
    for (let id = 0; id < count; id++) for (let slot = 0; slot < (key === "colors" ? 3 : 1); slot++) {
      const identity = JSON.stringify([`${resourceId}:${component}:${id}`, key === "colors" ? `color_${slot}` : key]);
      if (!values.has(identity)) throw new VisualEncodingError(`metasprite-record missing field ${identity}`);
      const value = integer(values.get(identity), identity, 0, maximum); values.delete(identity);
      for (let index = 0; index < width; index++) payload[id * stride + slot + index] = (value >>> (index * 8)) & 255;
    }
    return {fragment_id: `${resourceId}.${component}`, payload, relocations: []};
  });
  if (values.size) throw new VisualEncodingError("metasprite-record has unregistered fields");
  return result;
}

const METASPRITE_EDITOR_LABELS = Object.freeze({
  metasprite_id: "元精灵编号",
  color_0: "调色板颜色 0",
  color_1: "调色板颜色 1",
  color_2: "调色板颜色 2",
  pointer_cpu: "指针地址",
  value: "记录字节",
});

export function metaspriteObjects(document) {
  const fields = metaspriteFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `元精灵 · ${entityHandle.split(":").slice(1).join(" / ")}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName,
      label: METASPRITE_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: field.minimum ?? 0,
      max: field.maximum ?? (field.fieldName === "metasprite_id" ? 0x36 : field.byteLength === 2 ? 0xffff : 0xff),
    }))},
  }));
}

export function serializeMetaspriteField(field) {
  if (field.resourceId !== "metasprite-record" || !Number.isInteger(field.value)
      || field.value < 0 || field.value > (fieldByteLength(field) === 2 ? 0xffff : 0xff))
    throw new VisualEncodingError("metasprite-record field value is invalid");
  const payload = new Uint8Array(fieldByteLength(field));
  for (let index = 0; index < payload.length; index++) payload[index] = (field.value >>> (index * 8)) & 0xff;
  return payload;
}

const METASPRITE_REFERENCE_EDITOR_LABELS = Object.freeze({pointer_cpu: "指针地址"});

export function metaspriteReferenceFieldDescriptions(document) {
  if (document?.record_count !== 54 || !Array.isArray(document.records)
      || document.records.length !== 54)
    throw new VisualEncodingError("metasprite semantic records changed");
  return document.records.map((record, position) => {
    const expected = `metasprite:${record.id.toString(16).toUpperCase().padStart(2, "0")}`;
    if (record.handle !== expected || record.id !== position + 1
        || !Number.isInteger(record.pointer?.value) || record.pointer.value < 0 || record.pointer.value > 0xffff)
      throw new VisualEncodingError(`${expected}: metasprite semantic identity changed`);
    return {resourceId: "metasprite", entityHandle: record.handle, fieldName: "pointer_cpu",
      defaultValue: record.pointer.value, documentPath: ["records", position, "pointer", "value"]};
  });
}

export function metaspriteReferenceObjects(document) {
  return metaspriteReferenceFieldDescriptions(document).map(field => ({
    id: field.entityHandle,
    label: `元精灵引用 · ${field.entityHandle.split(":").at(-1)}`,
    fragmentIds: [],
    fields: [[field.entityHandle, field.fieldName]],
    editor: {kind: "numeric-table", rows: [field.entityHandle], columns: [{
      name: field.fieldName, label: METASPRITE_REFERENCE_EDITOR_LABELS[field.fieldName], min: 0, max: 0xffff,
    }]},
  }));
}

export function validateMetaspriteReferenceFieldOverrides(original, overrides) {
  const fields = new Map(metaspriteReferenceFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]);
    const field = fields.get(key);
    if (row.resource_id !== "metasprite" || !field || seen.has(key)
        || !Number.isInteger(row.value) || row.value < 0 || row.value > 0xffff)
      throw new VisualEncodingError("metasprite reference field identity or value is invalid");
    seen.add(key);
  }
}

export function serializeMetaspriteReferenceField() {
  throw new VisualEncodingError("metasprite reference projection has no ROM writeback");
}

export function validateMetaspritePreimage(fields, fragmentId, baseline) {
  if (!fields.length || fields.some(field => fieldFragmentId(field) !== fragmentId))
    throw new VisualEncodingError("metasprite-record Origin fragment identity drift");
  for (const field of fields) {
    const value = field.defaultValue;
    if (!Number.isInteger(value) || fieldOffsetInFragment(field) + fieldByteLength(field) > baseline.length)
      throw new VisualEncodingError("metasprite-record Origin field shape drift");
    for (let index = 0; index < fieldByteLength(field); index++)
      if (baseline[fieldOffsetInFragment(field) + index] !== ((value >>> (index * 8)) & 0xff))
        throw new VisualEncodingError("metasprite-record Origin value drift");
  }
}

function encodeMonsters(document, fieldFragments) {
  const enemies = recordsById(
    document.enemies, MONSTER_ENEMY_COUNT, "enemies",
  );
  const graphics = recordsById(
    document.graphics, MONSTER_GRAPHIC_COUNT, "graphics",
  );
  const figureFragments = fieldFragments || new Map(encodeImportedDocumentFields(
    monsterFigureImportAsset(enemies), monsterFigureImportAsset(enemies), monsterFigureFieldOwner)
    .map(component => [component.fragment_id, component]));
  const pointers = new Uint8Array(MONSTER_GRAPHIC_COUNT * 2);
  const tileOffsets = new Uint8Array(MONSTER_SEQUENTIAL_GRAPHICS);
  for (const [index, graphic] of graphics.entries()) {
    const pointer = word(
      graphic.layout_pointer_cpu, `graphics[${index}].layout_pointer_cpu`,
    );
    pointers[index * 2] = pointer & 0xff;
    pointers[index * 2 + 1] = pointer >> 8;
    if (index < MONSTER_SEQUENTIAL_GRAPHICS) {
      tileOffsets[index] = byte(
        graphic.tile_offset, `graphics[${index}].tile_offset`,
      );
    } else if (graphic.tile_offset !== null) {
      throw new VisualEncodingError(
        `graphics[${index}].tile_offset must be null for direct tilemaps`,
      );
    }
  }
  return new Map([
    [VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT, fieldFragments
      ? fieldFragments.get(VISUAL_MONSTERS_ATTACK_SOURCE_FRAGMENT)
      : encodeByteRecords(document.attack_source_anchor_region,
        MONSTER_ATTACK_SOURCE_ANCHOR_BYTES, "attack_source_anchor_region")],
    ["monster-visual-layout.dimensions", Uint8Array.from(graphics.map(
      (record, index) => byte(record.dimension, `graphics[${index}].dimension`),
    ))],
    ["monster-visual-layout.dual-palette-layouts", encodeByteRecords(
      document.dual_palette_layout_region, MONSTER_DUAL_PALETTE_BYTES,
      "dual_palette_layout_region",
    )],
    ...MONSTER_FIGURE_FRAGMENTS.map(id => [id, figureFragments.get(id)]),
    ["monster-visual-layout.graphic-bank-codes", Uint8Array.from(graphics.map(
      (record, index) => byte(record.bank_code, `graphics[${index}].bank_code`),
    ))],
    ["monster-visual-layout.layout-pointers", pointers],
    ["monster-visual-layout.layout-region", encodeByteRecords(
      document.layout_region, MONSTER_LAYOUT_BYTES, "layout_region",
    )],
    [MONSTER_PALETTE_FRAGMENT, fieldFragments
      ? fieldFragments.get(MONSTER_PALETTE_FRAGMENT)
      : encodeImportedDocumentFields(monsterPaletteImportAsset(document.palettes),
        monsterPaletteImportAsset(document.palettes), monsterPaletteFieldOwner)[0]],
    [MONSTER_PALETTE_PAIR_FRAGMENT, fieldFragments
      ? fieldFragments.get(MONSTER_PALETTE_PAIR_FRAGMENT)
      : encodeImportedDocumentFields(monsterPalettePairImportAsset(document.palette_pairs),
        monsterPalettePairImportAsset(document.palette_pairs), monsterPalettePairFieldOwner)[0]],
    ["monster-visual-layout.sequential-tile-offsets", tileOffsets],
    ["monster-visual-layout.special-bank-roots", encodeByteRecords(
      document.special_bank_roots, MONSTER_SPECIAL_BANK_COUNT,
      "special_bank_roots",
    )],
  ]);
}

const VEHICLE_SELECTOR_FIELDS = Object.freeze([
  ["map_actor_types", "map-actor-types", "actor_type", VEHICLE_PRESET_COUNT, ACTOR_TYPE_COUNT - 1],
  ["status_background_chr_banks", "status-background-chr-banks", "chr_bank", VEHICLE_STATUS_CHASSIS_COUNT, 255],
  ["status_sprite_chr_banks", "status-sprite-chr-banks", "chr_bank", VEHICLE_STATUS_CHASSIS_COUNT, 255],
]);
const vehicleSelectorHandle = (slug, id) =>
  `vehicle-visual-selector:${slug}:${id.toString(16).toUpperCase().padStart(2, "0")}`;

export function vehicleSelectorFieldDescriptions(document) {
  const fields = [];
  for (const [collection, slug, fieldName, count, maximum] of VEHICLE_SELECTOR_FIELDS) {
    recordsById(document?.[collection], count, collection);
    for (const [position, record] of document[collection].entries()) {
      if (fieldName === "chr_bank" && record.chassis_id !== VEHICLE_STATUS_CHASSIS_FIRST + record.id)
        throw new VisualEncodingError(`${collection}:${record.id}.chassis_id must equal its published chassis`);
      const defaultValue = integer(record[fieldName], `${collection}:${record.id}.${fieldName}`, 0, maximum);
      fields.push({resourceId: "vehicle-visual-selector", entityHandle: vehicleSelectorHandle(slug, record.id),
        recordId: record.id, fieldName, defaultValue, documentPath: [collection, position, fieldName],
        fragmentId: `vehicle-visual-selector.${slug}`, offsetInFragment: record.id, byteLength: 1});
    }
  }
  return fields;
}

function validateVehicleSelectorAsset(asset, original = asset) {
  if (asset?.resource_id !== "vehicle-visual-selector" || asset.schema !== ASSET_SCHEMAS[asset.resource_id])
    throw new VisualEncodingError("vehicle-visual-selector asset identity/schema changed");
  vehicleSelectorFieldDescriptions(asset.document);
  if (asset === original) return;
  const expected = structuredClone(original);
  for (const {documentPath: path} of vehicleSelectorFieldDescriptions(original.document))
    expected.document[path[0]][path[1]][path[2]] = asset.document[path[0]][path[1]][path[2]];
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("vehicle-visual-selector only existing selector values are editable");
}

export function validateVehicleSelectorFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, vehicleSelectorFieldDescriptions, validateVehicleSelectorAsset);
}

export function encodeVehicleSelectorFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "vehicle-visual-selector" || values.has(key))
      throw new VisualEncodingError("vehicle-visual-selector field identity invalid or repeated");
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const output = VEHICLE_SELECTOR_FIELDS.map(([, slug, fieldName, count, maximum]) => {
    const payload = Uint8Array.from({length: count}, (_, id) => {
      const key = JSON.stringify([vehicleSelectorHandle(slug, id), fieldName]);
      const value = integer(values.get(key), key, 0, maximum);
      values.delete(key);
      return value;
    });
    return {fragment_id: `vehicle-visual-selector.${slug}`, payload, relocations: []};
  });
  if (values.size) throw new VisualEncodingError("vehicle-visual-selector unknown fields remain");
  return output;
}

const VEHICLE_SELECTOR_EDITOR_LABELS = Object.freeze({
  actor_type: "地图角色类型",
  chr_bank: "CHR bank",
});

export function vehicleSelectorObjects(document) {
  const fields = vehicleSelectorFieldDescriptions(document);
  return fields.map(field => ({
    id: field.entityHandle,
    label: `战车视觉选择器 · ${field.entityHandle.split(":").slice(-2).join(" / ")}`,
    fragmentIds: [field.fragmentId],
    fields: [[field.entityHandle, field.fieldName]],
    editor: {kind: "numeric-table", rows: [field.entityHandle], columns: [{
      name: field.fieldName,
      label: VEHICLE_SELECTOR_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: 0,
      max: field.fieldName === "actor_type" ? ACTOR_TYPE_COUNT - 1 : 0xff,
    }]},
  }));
}

export function serializeVehicleSelectorField(field) {
  if (field.resourceId !== "vehicle-visual-selector" || fieldByteLength(field) !== 1
      || !Number.isInteger(field.value) || field.value < 0 || field.value > 0xff)
    throw new VisualEncodingError("vehicle-visual-selector field value is invalid");
  return new Uint8Array([field.value]);
}

export function validateVehicleSelectorPreimage(fields, fragmentId, baseline) {
  if (fields.length !== 1 || fieldFragmentId(fields[0]) !== fragmentId
      || baseline.length <= fieldOffsetInFragment(fields[0]))
    throw new VisualEncodingError("vehicle-visual-selector Origin field identity drift");
  const field = fields[0];
  if (baseline[fieldOffsetInFragment(field)] !== field.defaultValue)
    throw new VisualEncodingError("vehicle-visual-selector Origin value drift");
}

const attackVisualHex = value =>
  `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;

function encodeAttackVisualCommand(
  commandValue, recordId, commandIndex, offset, namespace = "attack-visual",
) {
  const label = `${namespace}:${recordId.toString(16).toUpperCase().padStart(2, "0")}` +
    `.commands[${commandIndex}]`;
  const command = requireObject(commandValue, label);
  const opcode = byte(command.opcode, `${label}.opcode`);
  if (command.opcode_hex !== attackVisualHex(opcode)) {
    throw new VisualEncodingError(`${label}.opcode_hex does not match opcode`);
  }
  if (command.offset !== offset) {
    throw new VisualEncodingError(`${label}.offset must equal encoded offset ${offset}`);
  }

  let expectedName;
  let operandNames;
  let marker;
  if (opcode === ATTACK_VISUAL_BLOCK_END) {
    expectedName = "end_repeat_block";
    operandNames = [];
    marker = true;
  } else {
    const spec = ATTACK_VISUAL_COMMAND_SPECS.get(opcode);
    if (!spec) {
      throw new VisualEncodingError(
        `${label}.opcode ${attackVisualHex(opcode)} is outside the stable command domain`,
      );
    }
    [expectedName, operandNames] = spec;
    marker = false;
  }
  if (command.name !== expectedName) {
    throw new VisualEncodingError(`${label}.name does not match opcode`);
  }
  if (command.marker !== marker) {
    throw new VisualEncodingError(`${label}.marker does not match opcode`);
  }
  const expectedLength = 1 + operandNames.length;
  if (command.length !== expectedLength) {
    throw new VisualEncodingError(
      `${label}.length must equal ${expectedLength} for ${expectedName}`,
    );
  }
  if (!Array.isArray(command.operands) ||
      command.operands.length !== operandNames.length) {
    throw new VisualEncodingError(
      `${label}.operands must contain ${operandNames.length} values`,
    );
  }

  const encoded = [opcode];
  for (const [operandIndex, operandName] of operandNames.entries()) {
    const operandLabel = `${label}.operands[${operandIndex}]`;
    const operand = requireObject(command.operands[operandIndex], operandLabel);
    if (operand.name !== operandName) {
      throw new VisualEncodingError(
        `${operandLabel}.name must equal ${JSON.stringify(operandName)}`,
      );
    }
    const value = byte(operand.value, `${operandLabel}.value`);
    if (operand.value_hex !== attackVisualHex(value)) {
      throw new VisualEncodingError(`${operandLabel}.value_hex does not match value`);
    }
    if (value === ATTACK_VISUAL_TERMINATOR) {
      throw new VisualEncodingError(
        `${operandLabel}.value cannot equal $9F because $9F terminates the record`,
      );
    }
    if (operandName === "visual_code" && value >= ATTACK_VISUAL_RECORD_COUNT) {
      throw new VisualEncodingError(
        `${operandLabel}.value must reference attack-visual 00..4E`,
      );
    }
    if (operandName === "script_id" && value >= ATTACK_VISUAL_AUX_RECORD_COUNT) {
      throw new VisualEncodingError(
        `${operandLabel}.value must reference auxiliary script 00..19`,
      );
    }
    if (["delta_x", "delta_y"].includes(operandName)) {
      const signed = value < 0x80 ? value : value - 0x100;
      if (operand.signed_value !== signed) {
        throw new VisualEncodingError(
          `${operandLabel}.signed_value does not match value`,
        );
      }
    }
    encoded.push(value);
  }
  return encoded;
}

function encodeAttackVisual(asset, document) {
  if (asset.schema !== ASSET_SCHEMAS["attack-visual"] ||
      asset.codec !== "weapon-effects/v1") {
    throw new VisualEncodingError("attack-visual asset identity is invalid");
  }
  if (document.schema !== `${ASSET_SCHEMAS["attack-visual"]}.document`) {
    throw new VisualEncodingError("attack-visual document identity is invalid");
  }
  if (document.record_count !== ATTACK_VISUAL_RECORD_COUNT ||
      !Array.isArray(document.records) ||
      document.records.length !== ATTACK_VISUAL_RECORD_COUNT) {
    throw new VisualEncodingError(
      `attack-visual document must contain ${ATTACK_VISUAL_RECORD_COUNT} records`,
    );
  }

  const table = [];
  for (const [recordId, recordValue] of document.records.entries()) {
    const recordHex = recordId.toString(16).toUpperCase().padStart(2, "0");
    const label = `attack-visual:${recordHex}`;
    const record = requireObject(recordValue, label);
    if (record.handle !== label || record.id !== recordId ||
        record.id_hex !== `0x${recordHex}` || record.owner !== "attack-visual") {
      throw new VisualEncodingError(`${label} stable identity changed`);
    }
    const delimiter = requireObject(record.delimiter, `${label}.delimiter`);
    if (delimiter.value !== ATTACK_VISUAL_TERMINATOR ||
        delimiter.value_hex !== attackVisualHex(ATTACK_VISUAL_TERMINATOR) ||
        delimiter.included_in_record !== true) {
      throw new VisualEncodingError(`${label} delimiter contract changed`);
    }

    if (recordId === ATTACK_VISUAL_OPAQUE_RECORD_ID) {
      if (record.edit_policy !== "immutable" ||
          record.decode_status !== "opaque-unreferenced-slot" ||
          !Array.isArray(record.commands) || record.commands.length !== 0 ||
          stableJson(record.opaque_blob) !== stableJson(ATTACK_VISUAL_OPAQUE_BLOB)) {
        throw new VisualEncodingError(
          "attack-visual:46 immutable opaque blob differs from its " +
          "analysis-approved 16 bytes",
        );
      }
      if (delimiter.offset !== ATTACK_VISUAL_OPAQUE_BYTES.length - 1) {
        throw new VisualEncodingError("attack-visual:46 delimiter offset changed");
      }
      table.push(...ATTACK_VISUAL_OPAQUE_BYTES);
      continue;
    }

    if (record.edit_policy !== "mutable" || record.decode_status !== "decoded") {
      throw new VisualEncodingError(`${label} must remain a decoded command record`);
    }
    if (record.opaque_blob != null) {
      throw new VisualEncodingError(`${label} must not define an opaque blob`);
    }
    if (!Array.isArray(record.commands)) {
      throw new VisualEncodingError(`${label}.commands must be an array`);
    }
    const recordBytes = [];
    for (const [commandIndex, command] of record.commands.entries()) {
      recordBytes.push(...encodeAttackVisualCommand(
        command, recordId, commandIndex, recordBytes.length,
      ));
    }
    if (delimiter.offset !== recordBytes.length) {
      throw new VisualEncodingError(
        `${label}.delimiter.offset must equal ${recordBytes.length}`,
      );
    }
    recordBytes.push(ATTACK_VISUAL_TERMINATOR);
    table.push(...recordBytes);
  }

  if (table.length !== ATTACK_VISUAL_TABLE_BYTES) {
    throw new VisualEncodingError(
      `attack-visual semantic table has ${table.length} bytes; ` +
      `expected ${ATTACK_VISUAL_TABLE_BYTES}`,
    );
  }
  const delimiterCount = table.filter(value =>
    value === ATTACK_VISUAL_TERMINATOR).length;
  if (delimiterCount !== ATTACK_VISUAL_RECORD_COUNT) {
    throw new VisualEncodingError(
      `attack-visual table contains ${delimiterCount} raw $9F bytes; ` +
      `expected exactly ${ATTACK_VISUAL_RECORD_COUNT} record delimiters`,
    );
  }
  return new Map(table.map((value, index) => [
    `attack-visual.table-byte.${index.toString(16).toUpperCase().padStart(4, "0")}`,
    Uint8Array.of(value),
  ]));
}

const attackVisualCommandHandle = recordId =>
  `attack-visual:${recordId.toString(16).toUpperCase().padStart(2, "0")}`;

/**
 * The command stream is the field for each decoded script.  Record $46 is
 * deliberately absent: its 16 bytes are an analysis-approved opaque preimage
 * and therefore cannot become a writable field by being exposed as raw bytes.
 * Each field owns the exact byte components emitted by its command stream;
 * the first component is kept in `fragmentId` and the rest use the existing
 * additional-fragments physical identity.
 */
export function attackVisualFieldDescriptions(document) {
  // Run the canonical semantic encoder first.  Besides checking the document
  // identity this locks the immutable record and every delimiter before fields
  // are published to a browser session.
  encodeAttackVisual({
    resource_id: "attack-visual",
    schema: ASSET_SCHEMAS["attack-visual"],
    codec: "weapon-effects/v1",
  }, document);
  const fields = [];
  let tableOffset = 0;
  for (const [position, record] of document.records.entries()) {
    // The canonical encoder has already checked the delimiter offset against
    // the actual byte stream.  Use that published offset for the physical
    // span so field layout cannot drift when a command's semantic length and
    // encoded byte count are represented by different object properties.
    const bytes = record.delimiter.offset + 1;
    if (record.id !== ATTACK_VISUAL_OPAQUE_RECORD_ID) {
      const fragments = Array.from({length: bytes}, (_, index) => ({
        fragmentId: `attack-visual.table-byte.${(tableOffset + index)
          .toString(16).toUpperCase().padStart(4, "0")}`,
        offsetInFragment: 0,
        byteLength: 1,
      }));
      const [primary, ...additionalFragments] = fragments;
      fields.push({
        resourceId: "attack-visual",
        entityHandle: attackVisualCommandHandle(record.id),
        recordId: record.id,
        fieldName: "commands",
        defaultValue: record.commands,
        documentPath: ["records", position, "commands"],
        ...primary,
        additionalFragments,
      });
    }
    tableOffset += bytes;
  }
  if (tableOffset !== ATTACK_VISUAL_TABLE_BYTES) {
    throw new VisualEncodingError("attack-visual fields do not cover 1371 bytes");
  }
  return fields;
}

function validateAttackVisualAsset(asset, original = asset) {
  if (asset?.resource_id !== "attack-visual" ||
      asset.schema !== ASSET_SCHEMAS["attack-visual"] ||
      asset.codec !== "weapon-effects/v1") {
    throw new VisualEncodingError("attack-visual asset identity changed");
  }
  attackVisualFieldDescriptions(asset.document);
  if (asset === original) return;
  const expected = structuredClone(original);
  for (const field of attackVisualFieldDescriptions(original.document)) {
    const path = field.documentPath;
    const value = path.reduce((node, key) => node?.[key], asset.document);
    const parent = path.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[path.at(-1)] = structuredClone(value);
  }
  if (!canonicalJsonEqual(asset, expected)) {
    throw new VisualEncodingError(
      "attack-visual only existing decoded command streams are editable",
    );
  }
}

export function validateAttackVisualFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, attackVisualFieldDescriptions,
    validateAttackVisualAsset);
}

export function encodeAttackVisualFields(fields, {defaults = false} = {}) {
  const commandsByHandle = new Map();
  for (const field of fields) {
    if (field.resourceId !== "attack-visual" || field.fieldName !== "commands" ||
        commandsByHandle.has(field.entityHandle)) {
      throw new VisualEncodingError("attack-visual field identity duplicated or foreign");
    }
    commandsByHandle.set(field.entityHandle, defaults ? field.defaultValue : field.value);
  }
  const table = [];
  for (let id = 0; id < ATTACK_VISUAL_RECORD_COUNT; id += 1) {
    if (id === ATTACK_VISUAL_OPAQUE_RECORD_ID) {
      table.push(...ATTACK_VISUAL_OPAQUE_BYTES);
      continue;
    }
    const handle = attackVisualCommandHandle(id);
    const commands = commandsByHandle.get(handle);
    if (!Array.isArray(commands)) throw new VisualEncodingError(`attack-visual missing field ${handle}`);
    const bytes = [];
    for (const [commandIndex, command] of commands.entries()) {
      bytes.push(...encodeAttackVisualCommand(command, id, commandIndex, bytes.length));
    }
    bytes.push(ATTACK_VISUAL_TERMINATOR);
    table.push(...bytes);
    commandsByHandle.delete(handle);
  }
  if (commandsByHandle.size || table.length !== ATTACK_VISUAL_TABLE_BYTES) {
    throw new VisualEncodingError("attack-visual fields must cover 78 decoded records and 1371 bytes");
  }
  return table.map((value, index) => ({
    fragment_id: `attack-visual.table-byte.${index.toString(16).toUpperCase().padStart(4, "0")}`,
    payload: Uint8Array.of(value),
    relocations: [],
  }));
}

export function serializeAttackVisualField(field) {
  if (field?.resourceId !== "attack-visual" || field.fieldName !== "commands"
      || !Number.isInteger(field.recordId) || field.recordId === ATTACK_VISUAL_OPAQUE_RECORD_ID
      || !Array.isArray(field.value)) {
    throw new VisualEncodingError("attack-visual field identity or value is invalid");
  }
  const bytes = [];
  for (const [index, command] of field.value.entries()) {
    bytes.push(...encodeAttackVisualCommand(command, field.recordId, index, bytes.length));
  }
  bytes.push(ATTACK_VISUAL_TERMINATOR);
  return Uint8Array.from(bytes);
}

/** Keep delimiter offsets and reference labels derived from the shared commands. */
export function projectAttackVisualFieldView(document) {
  for (const record of document.records) {
    Object.defineProperty(record.delimiter, "offset", {
      enumerable: true, configurable: true,
      get: () => record.id === ATTACK_VISUAL_OPAQUE_RECORD_ID
        ? ATTACK_VISUAL_OPAQUE_BYTES.length - 1
        : record.commands.reduce((length, command) => length + command.length, 0),
    });
    if (record.id === ATTACK_VISUAL_OPAQUE_RECORD_ID) continue;
    Object.defineProperty(record, "direct_references", {
      enumerable: true, configurable: true,
      get: () => semanticScriptReferences({
        script: {commands: record.commands}, source_handle: record.handle,
        prefix_length: 0, default_chr_mode: 0x38,
      }),
    });
  }
}

const AUXILIARY_SCRIPT_OWNER = "attack-visual-aux-script";
const auxiliaryScriptHandle = id => AUXILIARY_SCRIPT_OWNER + ":" + id.toString(16).toUpperCase().padStart(2, "0");

function auxiliaryScriptBytes(commands, id) {
  if (!Array.isArray(commands)) throw new VisualEncodingError("auxiliary commands must be an array");
  const bytes = [];
  for (const [index, command] of commands.entries()) {
    const encoded = encodeAttackVisualCommand(command, id, index, bytes.length, AUXILIARY_SCRIPT_OWNER);
    if (encoded.includes(ATTACK_VISUAL_TERMINATOR))
      throw new VisualEncodingError("auxiliary command bytes cannot contain an extra raw $9F delimiter");
    bytes.push(...encoded);
  }
  return bytes;
}

function auxiliaryScriptRows(document) {
  if (document?.schema !== ASSET_SCHEMAS[AUXILIARY_SCRIPT_OWNER] + ".document" ||
      document.record_count !== ATTACK_VISUAL_AUX_RECORD_COUNT ||
      !Array.isArray(document.records) || document.records.length !== ATTACK_VISUAL_AUX_RECORD_COUNT)
    throw new VisualEncodingError("auxiliary document must contain 26 records");
  const rows = new Map();
  for (const [position, record] of document.records.entries()) {
    const id = integer(record?.id, "auxiliary record id", 0, ATTACK_VISUAL_AUX_RECORD_COUNT - 1);
    const delimiter = record.delimiter;
    if (rows.has(id) || record.handle !== auxiliaryScriptHandle(id) || record.owner !== AUXILIARY_SCRIPT_OWNER ||
        record.id_hex !== attackVisualHex(id) || record.decode_status !== "decoded" ||
        delimiter?.value !== ATTACK_VISUAL_TERMINATOR || delimiter.value_hex !== "0x9F" ||
        delimiter.included_in_record !== true)
      throw new VisualEncodingError("auxiliary record identity or delimiter contract changed");
    const bytes = auxiliaryScriptBytes(record.commands, id);
    if (delimiter.offset !== bytes.length) throw new VisualEncodingError("auxiliary delimiter offset disagrees with commands");
    rows.set(id, {record, position, length: bytes.length + 1});
  }
  const ordered = [...rows.values()].sort((a, b) => a.record.id - b.record.id);
  if (ordered.reduce((total, row) => total + row.length, 0) !== ATTACK_VISUAL_AUX_TABLE_BYTES)
    throw new VisualEncodingError("auxiliary semantic table must contain exactly 558 bytes");
  return ordered;
}

export function auxiliaryScriptFieldDescriptions(document) {
  let offset = 0;
  return auxiliaryScriptRows(document).map(({record, position, length}) => {
    const field = {resourceId: AUXILIARY_SCRIPT_OWNER, entityHandle: record.handle, fieldName: "commands",
      recordId: record.id, defaultValue: record.commands, documentPath: ["records", position, "commands"],
      fragmentId: ATTACK_VISUAL_AUX_COMPONENT_ID, offsetInFragment: offset, byteLength: length};
    offset += length;
    return field;
  });
}

const COMMAND_EDITOR_COLUMN = Object.freeze({name: "commands", label: "命令",
  semantic: {kind: "command-stream", operandReferences: {sound_id: "audio-command"}}, commands: true});

/** 一个字段片段一个字段对象：片段里的记录各一行，列是命令数组（命令控件）。 */
function commandFieldObjects(descriptions, label) {
  const byFragment = new Map();
  for (const field of descriptions) {
    if (!byFragment.has(field.fragmentId)) byFragment.set(field.fragmentId, []);
    byFragment.get(field.fragmentId).push(field);
  }
  return [...byFragment.entries()].map(([fragmentId, rows]) => {
    const handles = [...new Set(rows.map(field => field.entityHandle))];
    return {id: fragmentId, label, fragmentIds: [fragmentId],
      fields: rows.map(field => [field.entityHandle, field.fieldName]),
      editor: {kind: "command-table", rows: handles, rowLabels: handles,
        columns: [COMMAND_EDITOR_COLUMN]}};
  });
}

export function attackVisualObjects(document) {
  return commandFieldObjects(attackVisualFieldDescriptions(document), "攻击视觉命令");
}

export function auxiliaryScriptObjects(document) {
  return commandFieldObjects(auxiliaryScriptFieldDescriptions(document), "辅助脚本命令");
}

export function validateAuxiliaryScriptFieldOverrides(original, overrides) {
  if (original?.resource_id !== AUXILIARY_SCRIPT_OWNER || original.schema !== ASSET_SCHEMAS[AUXILIARY_SCRIPT_OWNER] ||
      original.codec !== "weapon-effects/v1") throw new VisualEncodingError("auxiliary asset identity changed");
  validateFieldOverrides(original, overrides, auxiliaryScriptFieldDescriptions, (asset, source) => {
    const expected = structuredClone(source);
    let length = ATTACK_VISUAL_AUX_RECORD_COUNT;
    for (const field of auxiliaryScriptFieldDescriptions(source.document)) {
      const position = field.documentPath[1], commands = asset.document.records[position].commands;
      length += auxiliaryScriptBytes(commands, field.recordId).length;
      expected.document.records[position].commands = commands;
    }
    if (length !== ATTACK_VISUAL_AUX_TABLE_BYTES)
      throw new VisualEncodingError("auxiliary semantic table must contain exactly 558 bytes");
    if (!canonicalJsonEqual(asset, expected))
      throw new VisualEncodingError("auxiliary edits cannot change record identity, provenance or published metadata");
  });
}

export function encodeAuxiliaryScriptFields(fields, {defaults = false} = {}) {
  const programs = new Map();
  for (const field of fields) {
    if (field.resourceId !== AUXILIARY_SCRIPT_OWNER || field.fieldName !== "commands" ||
        programs.has(field.entityHandle)) throw new VisualEncodingError("auxiliary field identity duplicated or foreign");
    programs.set(field.entityHandle, defaults ? field.defaultValue : field.value);
  }
  const table = [];
  for (let id = 0; id < ATTACK_VISUAL_AUX_RECORD_COUNT; id++) {
    const handle = auxiliaryScriptHandle(id);
    if (!programs.has(handle)) throw new VisualEncodingError("auxiliary field missing " + handle);
    table.push(...auxiliaryScriptBytes(programs.get(handle), id), ATTACK_VISUAL_TERMINATOR);
    programs.delete(handle);
  }
  if (programs.size || table.length !== ATTACK_VISUAL_AUX_TABLE_BYTES)
    throw new VisualEncodingError("auxiliary fields must cover exactly 26 records and 558 bytes");
  return [{fragment_id: ATTACK_VISUAL_AUX_COMPONENT_ID, payload: Uint8Array.from(table), relocations: []}];
}

export function serializeAuxiliaryScriptField(field) {
  if (field?.resourceId !== AUXILIARY_SCRIPT_OWNER || field.fieldName !== "commands"
      || !Number.isInteger(field.recordId) || !Array.isArray(field.value)) {
    throw new VisualEncodingError("auxiliary script field identity or value is invalid");
  }
  return Uint8Array.from([
    ...auxiliaryScriptBytes(field.value, field.recordId), ATTACK_VISUAL_TERMINATOR,
  ]);
}

/** Commands are the field; delimiters and references follow those same values. */
export function projectAuxiliaryScriptFieldView(document) {
  const rows = [...document.records].sort((a, b) => a.id - b.id);
  const external = new Map(rows.map(row => [row.handle, row.incoming_references
    .filter(reference => !reference.source.startsWith(AUXILIARY_SCRIPT_OWNER + ":"))]));
  let previous = [], cached = null;
  const graph = () => {
    const values = rows.map(row => row.commands);
    if (cached && values.every((value, index) => value === previous[index])) return cached;
    const direct = new Map(), incoming = new Map([...external].map(([handle, references]) => [handle, [...references]]));
    for (const row of rows) {
      // The existing byte codec admits unaligned raw palette operands. Such an
      // operand has no logical palette reference; do not guess one or widen it.
      const commands = row.commands.filter(command => command.name !== "set_battle_sprite_palette" ||
        command.operands.find(operand => operand.name === "palette_offset")?.value % 3 === 0);
      const references = semanticScriptReferences({script: {commands}, source_handle: row.handle,
        prefix_length: 0, default_chr_mode: null});
      direct.set(row.handle, references);
      for (const reference of references) if (reference.relation === "calls-auxiliary-script")
        incoming.get(reference.target).push(reference);
    }
    previous = values; cached = {direct, incoming}; return cached;
  };
  const derive = (target, key, get) => Object.defineProperty(target, key, {enumerable: true, configurable: true, get});
  for (const row of rows) {
    derive(row.delimiter, "offset", () => row.commands.reduce((length, command) => length + command.length, 0));
    derive(row, "direct_references", () => graph().direct.get(row.handle));
    derive(row, "incoming_references", () => graph().incoming.get(row.handle));
    derive(row, "incoming_reference_count", () => row.incoming_references.length);
    derive(row, "incoming_consumer_handles", () => [...new Set(row.incoming_references.map(reference => reference.source))].sort());
    derive(row, "incoming_consumer_count", () => row.incoming_consumer_handles.length);
    derive(row, "shared_entity", () => row.incoming_consumer_count > 1);
  }
}

function battleActionValues(record, label) {
  const columns = integer(record.columns, `${label}.columns`, 1, 8);
  const rows = integer(record.rows, `${label}.rows`, 1, 8);
  const palette = integer(record.palette_id, `${label}.palette_id`, 0, 3);
  const reference = record.layout_reference;
  if (reference === null) {
    if (record.available !== false) throw new VisualEncodingError(`${label}: null slot availability changed`);
  } else {
    const match = typeof reference === "string" ? /^battle-object-layout:([0-9A-F]{3})$/.exec(reference) : null;
    const layout = match ? Number.parseInt(match[1], 16) : -1;
    if (record.available !== true || layout < 0 || layout >= BATTLE_OBJECT_LAYOUT_COUNT)
      throw new VisualEncodingError(`${label}: invalid logical layout reference`);
    if (columns * rows + 1 !== BATTLE_OBJECT_LAYOUT_COMPONENT_LENGTHS[layout])
      throw new VisualEncodingError(`${label}: config shape escapes its fixed layout capacity`);
  }
  return {columns, rows, palette, reference};
}

export function battleActionFieldDescriptions(document) {
  const resourceId = "battle-action";
  if (document?.schema !== ASSET_SCHEMAS[resourceId] || document.module_id !== resourceId
      || document.record_count !== BATTLE_ACTION_RECORD_COUNT || document.owned_byte_count !== 762
      || !Array.isArray(document.records) || document.records.length !== BATTLE_ACTION_RECORD_COUNT)
    throw new VisualEncodingError("battle-action asset identity or record count is invalid");
  const fields = [], seen = new Set(); let nullCount = 0;
  for (const [position, record] of document.records.entries()) {
    const id = integer(record.id, "battle-action.id", BATTLE_ACTION_FIRST, BATTLE_ACTION_LAST);
    const suffix = id.toString(16).toUpperCase().padStart(2, "0"), handle = `${resourceId}:${suffix}`;
    if (seen.has(id) || record.handle !== handle || record.id_hex !== `0x${suffix}`)
      throw new VisualEncodingError(`${handle}: record identity duplicated or changed`);
    seen.add(id);
    const {reference} = battleActionValues(record, handle);
    if (reference === null) nullCount += 1;
    for (const [name, mask, shift, bias] of [["columns", 0xe0, 5, 1], ["rows", 0x1c, 2, 1], ["palette_id", 3, 0, 0]])
      fields.push({resourceId, entityHandle: handle, recordId: id, fieldName: name,
        defaultValue: record[name], documentPath: ["records", position, name],
        fragmentId: BATTLE_ACTION_CONFIG_COMPONENT_ID, offsetInFragment: id - 1,
        byteLength: 1, bitMask: mask, bitShift: shift, valueBias: bias});
    fields.push({resourceId, entityHandle: handle, recordId: id, fieldName: "layout_reference",
      defaultValue: reference, documentPath: ["records", position, "layout_reference"],
      fragmentId: BATTLE_ACTION_POINTER_COMPONENT_ID, offsetInFragment: (id - 1) * 2,
      byteLength: 2, readOnly: reference === null,
      ...(reference === null ? {edit_policy: "immutable",
        immutable_reason: "空槽由指针哨兵和 available=false 共同决定"} : {}),
      serialization: {references: Object.freeze(Array.from({length: BATTLE_OBJECT_LAYOUT_COUNT}, (_, layoutId) =>
        `battle-object-layout:${layoutId.toString(16).toUpperCase().padStart(3, "0")}`))}});
  }
  if (nullCount !== BATTLE_ACTION_NULL_COUNT) throw new VisualEncodingError("battle-action must retain seven null slots");
  return fields;
}

function validateBattleActionAsset(asset, original) {
  if (asset?.resource_id !== "battle-action" || original?.resource_id !== asset.resource_id
      || asset.schema !== ASSET_SCHEMAS[asset.resource_id]) throw new VisualEncodingError("battle-action asset identity changed");
  battleActionFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of battleActionFieldDescriptions(original.document)) {
    if (field.readOnly) continue;
    const path = field.documentPath;
    expected.document.records[path[1]][path[2]] = asset.document.records[path[1]][path[2]];
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("battle-action can only edit existing config values and non-null layout references");
}

export function validateBattleActionFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, battleActionFieldDescriptions, validateBattleActionAsset);
}

const BATTLE_ACTION_EDITOR_LABELS = Object.freeze({
  columns: "列数",
  rows: "行数",
  palette_id: "调色板组",
  layout_reference: "布局引用",
});

export function battleActionObjects(document) {
  const fields = battleActionFieldDescriptions(document), byHandle = new Map();
  for (const field of fields) (byHandle.get(field.entityHandle) || (byHandle.set(field.entityHandle, []), byHandle.get(field.entityHandle))).push(field);
  return [...byHandle.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `战斗对象动作 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName, label: BATTLE_ACTION_EDITOR_LABELS[field.fieldName] || field.fieldName,
      reference: field.fieldName === "layout_reference", min: field.fieldName === "palette_id" ? 0 : 1,
      max: field.fieldName === "palette_id" ? 3 : 8,
      ...(field.fieldName === "layout_reference" ? {
        candidates: {resourceId: "battle-object-layout", documentPath: ["records"],
          value: ["handle"], label: ["handle"]},
        semantic: {kind: "reference", targetModule: "battle-object-layout"},
      } : {}),
    }))},
  }));
}

export function serializeBattleActionField(field, selected = [field]) {
  if (field.resourceId !== "battle-action") throw new VisualEncodingError("battle-action field identity drift");
  const sameObject = selected.filter(candidate => candidate.entityHandle === field.entityHandle);
  if (field.fieldName === "layout_reference") {
    if (field.readOnly) throw new VisualEncodingError("null battle-action layout reference is read-only");
    const reference = sameObject.find(candidate => candidate.fieldName === field.fieldName)?.value;
    if (!/^battle-object-layout:[0-9A-F]{3}$/u.test(reference || ""))
      throw new VisualEncodingError(`${field.entityHandle}: invalid layout reference`);
    return {
      payload: new Uint8Array(2),
      relocations: [{offset: 0, target_resource_id: reference}],
    };
  }
  const values = Object.fromEntries(sameObject.map(candidate => [candidate.fieldName, candidate.value]));
  const reference = values.layout_reference;
  const {columns, rows, palette} = battleActionValues({...values, available: reference !== null}, field.entityHandle);
  return new Uint8Array([((columns - 1) << 5) | ((rows - 1) << 2) | palette]);
}

export function validateBattleActionPreimage(fields, fragmentId, baseline) {
  if (![BATTLE_ACTION_CONFIG_COMPONENT_ID, BATTLE_ACTION_POINTER_COMPONENT_ID].includes(fragmentId))
    throw new VisualEncodingError("battle-action Origin fragment identity drift");
  const owned = fields.filter(field => fieldFragmentId(field) === fragmentId);
  if (fragmentId === BATTLE_ACTION_CONFIG_COMPONENT_ID) {
    if (baseline.length !== BATTLE_ACTION_RECORD_COUNT || owned.length !== 3)
      throw new VisualEncodingError("battle-action config Origin shape drift");
    for (const field of owned) {
      const value = field.defaultValue;
      const raw = baseline[fieldOffsetInFragment(field)];
      const expected = field.fieldName === "columns" ? (value - 1) << 5
        : field.fieldName === "rows" ? (value - 1) << 2 : value;
      if ((raw & field.bitMask) !== expected) throw new VisualEncodingError("battle-action config Origin drift");
    }
    return;
  }
  if (baseline.length !== BATTLE_ACTION_RECORD_COUNT * 2 || owned.length !== 1)
    throw new VisualEncodingError("battle-action pointer Origin shape drift");
  for (const field of owned) if (field.defaultValue === null &&
      (baseline[fieldOffsetInFragment(field)] !== 0xff || baseline[fieldOffsetInFragment(field) + 1] !== 0xff))
    throw new VisualEncodingError("battle-action null pointer Origin drift");
}

export function encodeBattleActionFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "battle-action" || values.has(key)) throw new VisualEncodingError("battle-action field identity duplicated or foreign");
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new VisualEncodingError(`battle-action missing field ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const configs = new Uint8Array(BATTLE_ACTION_RECORD_COUNT), pointers = new Uint8Array(BATTLE_ACTION_RECORD_COUNT * 2), relocations = [];
  let nullCount = 0;
  for (let id = BATTLE_ACTION_FIRST; id <= BATTLE_ACTION_LAST; id++) {
    const handle = `battle-action:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    const reference = take(handle, "layout_reference");
    const {columns, rows, palette} = battleActionValues({columns: take(handle, "columns"), rows: take(handle, "rows"),
      palette_id: take(handle, "palette_id"), layout_reference: reference, available: reference !== null}, handle);
    configs[id - 1] = ((columns - 1) << 5) | ((rows - 1) << 2) | palette;
    const offset = (id - 1) * 2;
    if (reference === null) {pointers[offset] = 0xff; pointers[offset + 1] = 0xff; nullCount += 1;}
    else relocations.push({offset, target_resource_id: reference});
  }
  if (values.size || nullCount !== BATTLE_ACTION_NULL_COUNT) throw new VisualEncodingError("battle-action unregistered fields or null slots changed");
  return [{fragment_id: BATTLE_ACTION_CONFIG_COMPONENT_ID, payload: configs, relocations: []},
    {fragment_id: BATTLE_ACTION_POINTER_COMPONENT_ID, payload: pointers, relocations}];
}

export function enemyActionPatternFieldDescriptions(document) {
  const resourceId = "enemy-action-pattern";
  if (document.schema !== ASSET_SCHEMAS[resourceId] ||
      document.module_id !== resourceId || document.record_count !== 99 ||
      document.owned_byte_count !== 594 || !Array.isArray(document.records) ||
      document.records.length !== 99) {
    throw new VisualEncodingError(`${resourceId}: fixed record table changed`);
  }
  const result = [], seen = new Set();
  for (const [position, raw] of document.records.entries()) {
    const id = integer(raw.id, `${resourceId}.id`, 0, 98);
    if (seen.has(id)) throw new VisualEncodingError(`${resourceId}: duplicate record identity`);
    seen.add(id);
    const handle = `${resourceId}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    const record = requireObject(raw, handle);
    if (record.id !== id || record.id_hex !== attackVisualHex(id) ||
        record.handle !== handle || !Array.isArray(record.slots) || record.slots.length !== 6) {
      throw new VisualEncodingError(`${handle}: fixed identity or six-slot shape changed`);
    }
    const slots = new Set();
    for (const [slotPosition, rawSlot] of record.slots.entries()) {
      const index = integer(rawSlot.slot, `${handle}.slot`, 0, 5);
      if (slots.has(index)) throw new VisualEncodingError(`${handle}: duplicate slot identity`);
      slots.add(index);
      const slot = requireObject(rawSlot, `${handle}.slots[${index}]`);
      if (Object.keys(slot).sort().join(",") !== "action_reference,all_targets,slot" ||
          slot.slot !== index) {
        throw new VisualEncodingError(`${handle}: slot identity/fields changed`);
      }
      const match = typeof slot.action_reference === "string"
        ? /^enemy-action:([0-9A-F]{2})$/u.exec(slot.action_reference) : null;
      const actionId = match ? Number.parseInt(match[1], 16) : -1;
      if (actionId < 0 || actionId >= ENEMY_ACTION_RECORD_COUNT) {
        throw new VisualEncodingError(`${handle}: invalid enemy-action reference`);
      }
      if (typeof slot.all_targets !== "boolean") {
        throw new VisualEncodingError(`${handle}: all_targets must be boolean`);
      }
      for (const name of ["action_reference", "all_targets"]) result.push({
        resourceId, entityHandle: `${handle}:slot:${index}`, fieldName: name,
        recordId: id, slotId: index, defaultValue: slot[name],
        documentPath: ["records", position, "slots", slotPosition, name],
        fragmentId: "enemy-action-pattern.records", offsetInFragment: id * 6 + index,
        byteLength: 1, bitMask: name === "all_targets" ? 0x80 : 0x7f,
        bitShift: name === "all_targets" ? 7 : 0,
      });
    }
  }
  return result;
}

function validateEnemyActionPatternAsset(asset, original) {
  if (asset?.resource_id !== "enemy-action-pattern" || original?.resource_id !== asset.resource_id
      || asset.schema !== ASSET_SCHEMAS[asset.resource_id])
    throw new VisualEncodingError("enemy-action-pattern asset identity changed");
  enemyActionPatternFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of enemyActionPatternFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("enemy-action-pattern can only edit published action references and target scopes");
}

export function validateEnemyActionPatternFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, enemyActionPatternFieldDescriptions, validateEnemyActionPatternAsset);
}

export function encodeEnemyActionPatternFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "enemy-action-pattern" || values.has(key))
      throw new VisualEncodingError("enemy-action-pattern field identity duplicated or foreign");
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new VisualEncodingError(`enemy-action-pattern missing field ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const payload = new Uint8Array(594);
  for (let id = 0; id < 99; id++) for (let slot = 0; slot < 6; slot++) {
    const handle = `enemy-action-pattern:${id.toString(16).toUpperCase().padStart(2, "0")}:slot:${slot}`;
    const reference = take(handle, "action_reference"), allTargets = take(handle, "all_targets");
    const match = typeof reference === "string" ? /^enemy-action:([0-9A-F]{2})$/u.exec(reference) : null;
    const actionId = match ? Number.parseInt(match[1], 16) : -1;
    if (actionId < 0 || actionId >= ENEMY_ACTION_RECORD_COUNT || typeof allTargets !== "boolean")
      throw new VisualEncodingError(`${handle}: invalid action reference or target scope`);
    payload[id * 6 + slot] = actionId | (allTargets ? 0x80 : 0);
  }
  if (values.size) throw new VisualEncodingError("enemy-action-pattern has unregistered fields");
  return [{fragment_id: "enemy-action-pattern.records", payload, relocations: []}];
}

const ENEMY_ACTION_PATTERN_EDITOR_LABELS = Object.freeze({
  action_reference: "行动引用",
  all_targets: "全体目标",
});

export function enemyActionPatternObjects(document) {
  const fields = enemyActionPatternFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `敌方行动模式 · ${entityHandle.split(":").slice(-2).join(" / ")}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName,
      label: ENEMY_ACTION_PATTERN_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: 0, max: field.fieldName === "all_targets" ? 1 : 0x7f,
    }))},
  }));
}

function enemyActionPatternFieldByte(field, selected) {
  if (field.resourceId !== "enemy-action-pattern" || fieldByteLength(field) !== 1)
    throw new VisualEncodingError("enemy-action-pattern field identity drift");
  const sameByte = selected.filter(candidate => candidate.entityHandle === field.entityHandle);
  const action = sameByte.find(candidate => candidate.fieldName === "action_reference");
  const targets = sameByte.find(candidate => candidate.fieldName === "all_targets");
  const match = typeof action?.value === "string" ? /^enemy-action:([0-9A-F]{2})$/u.exec(action.value) : null;
  const actionId = match ? Number.parseInt(match[1], 16) : -1;
  if (actionId < 0 || actionId >= ENEMY_ACTION_RECORD_COUNT || typeof targets?.value !== "boolean")
    throw new VisualEncodingError(`${field.entityHandle}: invalid action reference or target scope`);
  return new Uint8Array([actionId | (targets.value ? 0x80 : 0)]);
}

export function serializeEnemyActionPatternField(field, selected = [field]) {
  return enemyActionPatternFieldByte(field, selected);
}

export function validateEnemyActionPatternPreimage(fields, fragmentId, baseline) {
  if (fragmentId !== "enemy-action-pattern.records" || baseline.length !== 594 || fields.length !== 594 * 2)
    throw new VisualEncodingError("enemy-action-pattern Origin table identity drift");
  const seen = new Set();
  for (const field of fields) {
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (seen.has(key) || fieldFragmentId(field) !== fragmentId || fieldOffsetInFragment(field) !== field.recordId * 6 + field.slotId)
      throw new VisualEncodingError("enemy-action-pattern Origin field identity drift");
    seen.add(key);
    const raw = baseline[fieldOffsetInFragment(field)];
    if (field.fieldName === "action_reference") {
      const match = /^enemy-action:([0-9A-F]{2})$/u.exec(field.defaultValue);
      if (!match || (raw & 0x7f) !== Number.parseInt(match[1], 16))
        throw new VisualEncodingError("enemy-action-pattern action reference Origin drift");
    } else if (Boolean(raw & 0x80) !== field.defaultValue) {
      throw new VisualEncodingError("enemy-action-pattern target scope Origin drift");
    }
  }
}

function enemyActionSelector(value, repeat, label) {
  integer(repeat, `${label}.repeat_counter_class`, 0, 3);
  if (value === null) {
    if (repeat !== 3) throw new VisualEncodingError(`${label} null selector must retain the FF sentinel`);
    return 0xff;
  }
  integer(value, `${label}.visual_selector`, 0, ENEMY_ACTION_VISUAL_MASK);
  const encoded = (repeat << 6) | value;
  if (encoded === 0xff) throw new VisualEncodingError(`${label} selector cannot encode as the FF null sentinel`);
  return encoded;
}

export function enemyActionFieldDescriptions(document) {
  const resourceId = "enemy-action";
  if (document.schema !== ASSET_SCHEMAS[resourceId] || document.module_id !== resourceId
      || document.record_count !== ENEMY_ACTION_RECORD_COUNT || document.owned_byte_count !== ENEMY_ACTION_RECORD_COUNT * 3)
    throw new VisualEncodingError("enemy-action fixed table identity changed");
  recordsById(document.records, ENEMY_ACTION_RECORD_COUNT, "enemy-action.records");
  const fields = [];
  for (const [position, record] of document.records.entries()) {
    const handle = `enemy-action:${record.id.toString(16).toUpperCase().padStart(2, "0")}`;
    if (record.handle !== handle || record.id_hex !== attackVisualHex(record.id))
      throw new VisualEncodingError(`${handle} stable identity changed`);
    const visual = requireObject(record.fields?.visual_and_counter_initializer, handle);
    const raw = byte(visual.raw, `${handle}.raw`), repeat = visual.repeat_counter_class;
    if (repeat !== (raw >> 6)) throw new VisualEncodingError(`${handle} repeat counter differs from its source bits`);
    enemyActionSelector(visual.visual_selector, repeat, handle);
    const reference = visual.visual_selector === null ? null : `attack-visual:${visual.visual_selector.toString(16).toUpperCase().padStart(2, "0")}`;
    if (visual.value !== reference || (visual.visual_selector === null && raw !== 255))
      throw new VisualEncodingError(`${handle} visual reference or null source is inconsistent`);
    for (const name of ["visual_selector", "repeat_counter_class"]) fields.push({resourceId, entityHandle: handle,
      recordId: record.id, fieldName: name, defaultValue: visual[name],
      documentPath: ["records", position, "fields", "visual_and_counter_initializer", name],
      fragmentId: ENEMY_ACTION_VISUAL_COMPONENT_ID, offsetInFragment: record.id, byteLength: 1,
      bitMask: name === "visual_selector" ? 0x3f : 0xc0, bitShift: name === "visual_selector" ? 0 : 6,
      ...((name === "repeat_counter_class" || visual.visual_selector === null)
        ? {writeback: ROM_WRITE_PENDING} : {})});
  }
  return fields;
}

export function validateEnemyActionFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, enemyActionFieldDescriptions, (asset, source) => {
    const expected = structuredClone(source);
    for (const field of enemyActionFieldDescriptions(source.document)) {
      const path = field.documentPath, value = path.reduce((node, key) => node[key], asset.document);
      path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] = value;
    }
    for (const [index, record] of asset.document.records.entries()) {
      const visual = record.fields.visual_and_counter_initializer;
      if (visual.raw !== source.document.records[index].fields.visual_and_counter_initializer.raw)
        throw new VisualEncodingError("enemy-action source byte preimage changed");
      enemyActionSelector(visual.visual_selector, visual.repeat_counter_class, record.handle);
    }
    if (!canonicalJsonEqual(asset, expected)) throw new VisualEncodingError("enemy-action only published selector and counter fields are editable");
  });
}

/** Reference labels are a read-only projection of the same numeric selector. raw remains the Original preimage. */
export function projectEnemyActionFieldView(document) {
  for (const record of document.records) {
    const visual = record.fields.visual_and_counter_initializer;
    Object.defineProperty(visual, "value", {enumerable: true, configurable: true, get: () =>
      visual.visual_selector === null ? null : `attack-visual:${visual.visual_selector.toString(16).toUpperCase().padStart(2, "0")}`});
    if (Object.hasOwn(visual, "visual_selector_hex")) Object.defineProperty(visual, "visual_selector_hex", {
      enumerable: true, configurable: true, get: () => visual.visual_selector === null ? null : attackVisualHex(visual.visual_selector)});
  }
}

export function encodeEnemyActionFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "enemy-action" || values.has(key)) throw new VisualEncodingError("enemy-action field identity duplicated or foreign");
    const encodedValue = fieldRomValue(field, {defaults});
    if (field.writeback?.state === "unpermitted" && encodedValue !== field.defaultValue)
      throw new VisualEncodingError("enemy-action field without permission reached ROM payload");
    values.set(key, encodedValue);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new VisualEncodingError(`enemy-action missing field ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const payload = new Uint8Array(ENEMY_ACTION_RECORD_COUNT);
  for (let id = 0; id < ENEMY_ACTION_RECORD_COUNT; id++) {
    const handle = `enemy-action:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    payload[id] = enemyActionSelector(take(handle, "visual_selector"), take(handle, "repeat_counter_class"), handle);
  }
  if (values.size) throw new VisualEncodingError("enemy-action has unregistered fields");
  return [{fragment_id: ENEMY_ACTION_VISUAL_COMPONENT_ID, payload, relocations: []}];
}

const ENEMY_ACTION_EDITOR_LABELS = Object.freeze({
  visual_selector: "攻击特效编号",
  repeat_counter_class: "重复计数类别",
});

export function enemyActionObjects(document) {
  const fields = enemyActionFieldDescriptions(document);
  return [{
    id: ENEMY_ACTION_VISUAL_COMPONENT_ID,
    label: "敌方行动",
    fragmentIds: [ENEMY_ACTION_VISUAL_COMPONENT_ID],
    fields: fields.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [...new Set(fields.map(field => field.entityHandle))], columns: fields
      .filter((field, index, visible) => visible.findIndex(candidate => candidate.fieldName === field.fieldName) === index)
      .map(field => ({name: field.fieldName, label: ENEMY_ACTION_EDITOR_LABELS[field.fieldName] || field.fieldName,
        min: 0, max: field.fieldName === "repeat_counter_class" ? 3 : 0x3f,
        nullable: field.fieldName === "visual_selector"}))},
  }];
}

export function serializeEnemyActionField(field, selected = [field]) {
  if (field.resourceId !== "enemy-action" || field.fieldName !== "visual_selector" || field.readOnly
      || !Number.isInteger(field.value) || field.value < 0 || field.value > ENEMY_ACTION_VISUAL_MASK)
    throw new VisualEncodingError("enemy-action visual selector is invalid or read-only");
  const repeatField = selected.find(candidate => candidate.entityHandle === field.entityHandle
    && candidate.fieldName === "repeat_counter_class");
  const repeat = repeatField && fieldRomValue(repeatField);
  return new Uint8Array([enemyActionSelector(field.value, repeat, field.entityHandle)]);
}

export function validateEnemyActionPreimage(fields, fragmentId, baseline) {
  if (fragmentId !== ENEMY_ACTION_VISUAL_COMPONENT_ID || baseline.length !== ENEMY_ACTION_RECORD_COUNT
      || fields.length !== ENEMY_ACTION_RECORD_COUNT * 2)
    throw new VisualEncodingError("enemy-action Origin table identity drift");
  const seen = new Set();
  for (const field of fields) {
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (seen.has(key) || fieldFragmentId(field) !== fragmentId || fieldOffsetInFragment(field) !== field.recordId)
      throw new VisualEncodingError("enemy-action Origin field identity drift");
    seen.add(key);
    if (field.fieldName === "repeat_counter_class" && ((baseline[field.recordId] >> 6) !== field.defaultValue))
      throw new VisualEncodingError("enemy-action repeat counter Origin drift");
    if (field.fieldName === "visual_selector" && field.defaultValue !== null
        && ((baseline[field.recordId] & 0x3f) !== field.defaultValue))
      throw new VisualEncodingError("enemy-action visual selector Origin drift");
  }
}

export function battleObjectLayoutFieldDescriptions(document) {
  const resourceId = "battle-object-layout";
  if (document.schema !== ASSET_SCHEMAS[resourceId] ||
      document.module_id !== resourceId ||
      document.record_count !== BATTLE_OBJECT_LAYOUT_COUNT ||
      document.owned_byte_count !== BATTLE_OBJECT_LAYOUT_BYTES ||
      !Array.isArray(document.records) ||
      document.records.length !== BATTLE_OBJECT_LAYOUT_COUNT) {
    throw new VisualEncodingError(
      "battle-object-layout asset identity or record count is invalid",
    );
  }

  const descriptions = [], seen = new Set();
  let encodedLength = 0;
  document.records.forEach((recordValue, position) => {
    const match = /^battle-object-layout:([0-9A-F]{3})$/.exec(recordValue?.handle || "");
    const layoutId = match ? Number.parseInt(match[1], 16) : -1;
    if (layoutId < 0 || layoutId >= BATTLE_OBJECT_LAYOUT_COUNT || seen.has(layoutId))
      throw new VisualEncodingError("battle-object-layout identity missing, duplicated or out of range");
    seen.add(layoutId);
    const suffix = layoutId.toString(16).toUpperCase().padStart(3, "0");
    const handle = `${resourceId}:${suffix}`;
    const fragmentId = `${resourceId}.record-${suffix}`;
    const record = requireObject(recordValue, handle);
    if (record.handle !== handle) {
      throw new VisualEncodingError(`${handle} stable identity or fixed order changed`);
    }
    const shape = requireObject(record.shape_contract, `${handle}.shape_contract`);
    const expectedLength = BATTLE_OBJECT_LAYOUT_COMPONENT_LENGTHS[layoutId];
    const byteLength = integer(
      shape.byte_length,
      `${handle}.shape_contract.byte_length`,
      2,
      65,
    );
    const tileCount = integer(
      shape.tile_count,
      `${handle}.shape_contract.tile_count`,
      1,
      64,
    );
    if (byteLength !== expectedLength || byteLength !== tileCount + 1) {
      throw new VisualEncodingError(`${handle} fixed slot capacity changed`);
    }
    const fields = requireObject(record.fields, `${handle}.fields`);
    const origin = requireObject(fields.origin, `${handle}.fields.origin`);
    const originX = integer(
      origin.x_quarter_tiles,
      `${handle}.origin.x_quarter_tiles`,
      0,
      15,
    );
    const originY = integer(
      origin.y_quarter_tiles,
      `${handle}.origin.y_quarter_tiles`,
      0,
      15,
    );
    if (!Array.isArray(fields.tile_references) ||
        fields.tile_references.length !== tileCount) {
      throw new VisualEncodingError(
        `${handle} must contain exactly ${tileCount} logical tile references`,
      );
    }
    fields.tile_references.forEach((reference, index) => {
      try {
        attackChrTileEncoding(reference);
      } catch (error) {
        throw new VisualEncodingError(
          `${handle}.tile_references[${index}]: ${error?.message || error}`,
        );
      }
    });
    for (const [name, value, shift] of [["x_quarter_tiles", originX, 4], ["y_quarter_tiles", originY, 0]])
      descriptions.push({resourceId, entityHandle: handle, fieldName: name, recordId: layoutId,
        documentPath: ["records", position, "fields", "origin", name], defaultValue: value,
        fragmentId, offsetInFragment: 0, byteLength: 1, bitMask: 15 << shift, bitShift: shift});
    descriptions.push({resourceId, entityHandle: handle, fieldName: "tile_references", recordId: layoutId,
      documentPath: ["records", position, "fields", "tile_references"], defaultValue: fields.tile_references,
      fragmentId, offsetInFragment: 1, byteLength: tileCount});
    encodedLength += byteLength;
  });
  if (encodedLength !== BATTLE_OBJECT_LAYOUT_BYTES) {
    throw new VisualEncodingError(
      `battle-object-layout encoded ${encodedLength}; expected ${BATTLE_OBJECT_LAYOUT_BYTES}`,
    );
  }
  return descriptions;
}

function validateBattleObjectLayoutAsset(asset, original) {
  if (asset?.resource_id !== "battle-object-layout" || original?.resource_id !== asset.resource_id
      || asset.schema !== ASSET_SCHEMAS[asset.resource_id])
    throw new VisualEncodingError("battle-object-layout asset identity changed");
  battleObjectLayoutFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of battleObjectLayoutFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      path.reduce((node, key) => node[key], asset.document);
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("battle-object-layout can only edit published origin and fixed tile references");
}

export function validateBattleObjectLayoutFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, battleObjectLayoutFieldDescriptions, validateBattleObjectLayoutAsset);
}

export function encodeBattleObjectLayoutFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "battle-object-layout" || values.has(key))
      throw new VisualEncodingError("battle-object-layout field identity duplicated or foreign");
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  const take = (handle, name) => {
    const key = JSON.stringify([handle, name]);
    if (!values.has(key)) throw new VisualEncodingError(`battle-object-layout missing field ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const result = BATTLE_OBJECT_LAYOUT_COMPONENT_LENGTHS.map((length, id) => {
    const suffix = id.toString(16).toUpperCase().padStart(3, "0"), handle = `battle-object-layout:${suffix}`;
    const x = integer(take(handle, "x_quarter_tiles"), `${handle}.x`, 0, 15);
    const y = integer(take(handle, "y_quarter_tiles"), `${handle}.y`, 0, 15);
    const references = take(handle, "tile_references");
    if (!Array.isArray(references) || references.length !== length - 1)
      throw new VisualEncodingError(`${handle} fixed tile capacity changed`);
    const payload = new Uint8Array(length);
    payload[0] = (x << 4) | y;
    references.forEach((reference, index) => {payload[index + 1] = attackChrTileEncoding(reference);});
    return {fragment_id: `battle-object-layout.record-${suffix}`, payload, relocations: []};
  });
  if (values.size) throw new VisualEncodingError("battle-object-layout has unregistered fields");
  return result;
}

const BATTLE_OBJECT_LAYOUT_EDITOR_LABELS = Object.freeze({
  x_quarter_tiles: "原点 X",
  y_quarter_tiles: "原点 Y",
  tile_references: "图块引用",
});

export function battleObjectLayoutObjects(document) {
  const fields = battleObjectLayoutFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  const records = new Map(document.records.map(record => [record.handle, record]));
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `战斗效果对象布局 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName,
      label: BATTLE_OBJECT_LAYOUT_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: 0, max: field.fieldName === "tile_references" ? 255 : 15,
      ...(field.fieldName === "x_quarter_tiles" || field.fieldName === "y_quarter_tiles"
        ? {semantic: {kind: "dimension", unit: "1/4 tile"}} : {}),
      ...(field.fieldName === "tile_references" ? {semantic: {kind: "image"}, tile: {
        contexts: BATTLE_LAYOUT_CONTEXT_SOURCE, candidates: BATTLE_LAYOUT_TILE_SOURCE,
        consumer: {handle: entityHandle, sourceOffset: records.get(entityHandle)?.source?.offset,
          tileCount: records.get(entityHandle)?.shape_contract?.tile_count},
        bind: battleLayoutTileBinding,
      }} : {}),
    }))},
  }));
}

export function serializeBattleObjectLayoutField(field, selected = [field]) {
  if (field.resourceId !== "battle-object-layout")
    throw new VisualEncodingError("battle-object-layout field identity drift");
  if (field.fieldName === "tile_references") {
    if (!Array.isArray(field.value) || field.value.length !== fieldByteLength(field))
      throw new VisualEncodingError("battle-object-layout tile references length changed");
    return Uint8Array.from(field.value, attackChrTileEncoding);
  }
  const sameObject = selected.filter(candidate => candidate.entityHandle === field.entityHandle);
  const x = sameObject.find(candidate => candidate.fieldName === "x_quarter_tiles")?.value;
  const y = sameObject.find(candidate => candidate.fieldName === "y_quarter_tiles")?.value;
  return new Uint8Array([(integer(x, "battle-object-layout.x", 0, 15) << 4)
    | integer(y, "battle-object-layout.y", 0, 15)]);
}

export function validateBattleObjectLayoutPreimage(fields, fragmentId, baseline) {
  if (!fragmentId.startsWith("battle-object-layout.record-") || !baseline.length)
    throw new VisualEncodingError("battle-object-layout Origin fragment identity drift");
  const origin = fields.filter(field => field.fieldName !== "tile_references");
  const tiles = fields.find(field => field.fieldName === "tile_references");
  if (origin.length !== 2 || !tiles || fieldFragmentId(tiles) !== fragmentId || baseline.length !== fieldByteLength(tiles) + 1
      || ((baseline[0] >> 4) !== origin.find(field => field.fieldName === "x_quarter_tiles").defaultValue)
      || ((baseline[0] & 15) !== origin.find(field => field.fieldName === "y_quarter_tiles").defaultValue))
    throw new VisualEncodingError("battle-object-layout Origin value drift");
  const expected = Uint8Array.from(tiles.defaultValue, attackChrTileEncoding);
  for (let index = 0; index < expected.length; index++) if (baseline[index + 1] !== expected[index])
    throw new VisualEncodingError("battle-object-layout tile Origin drift");
}

function visualChrTileHandle(bankId, tileId) {
  return `shared-chr-bank:bank:${bankId.toString(16).toUpperCase().padStart(2, "0")}:tile:${tileId.toString(16).toUpperCase().padStart(2, "0")}`;
}

export function visualChrDocumentScopes(document) {
  visualChrObjectCount(document);
  return document.banks.map((bank, index) => ({
    path: ['banks', index, 'tiles'],
    describeOptions: {objectOffset: index * 64, objectLimit: 64},
  }));
}

export function visualChrFieldScope(document, handle) {
  const match = /^shared-chr-bank:bank:([0-9A-F]{2}):tile:([0-9A-F]{2})$/.exec(handle);
  const bank = match ? document.banks.findIndex(bank => bank.id === Number.parseInt(match[1], 16)) : -1;
  const tile = match ? Number.parseInt(match[2], 16) : -1;
  if (bank < 0 || tile < 0 || tile >= 64) throw new VisualEncodingError(`shared-chr-bank unknown tile: ${handle}`);
  return {objectOffset: bank * 64 + tile, objectLimit: 1};
}

export function visualChrFieldDescriptions(document, {objectOffset = 0, objectLimit = undefined} = {}) {
  if (!Array.isArray(document?.banks) || document.banks.length !== VISUAL_CHR_BANK_IDS.length)
    throw new VisualEncodingError("shared-chr-bank fixed bank identity set changed");
  if (!Number.isInteger(objectOffset) || objectOffset < 0 ||
      (objectLimit !== undefined && (!Number.isInteger(objectLimit) || objectLimit < 0)))
    throw new VisualEncodingError("shared-chr-bank field object range is invalid");
  const fields = [], seen = new Set(), objectCount = document.banks.length * 64;
  const objectEnd = Math.min(objectLimit === undefined ? objectCount : objectOffset + objectLimit,
    objectCount);
  // `getFieldObjects()` requests this description one page at a time during a
  // build.  Walking every tile to reach each page made the 12k-tile CHR owner
  // quadratic.  A full description (the default) still validates every tile;
  // a page validates exactly the fields it describes.
  for (const [bankIndex, bank] of document.banks.entries()) {
    if (!VISUAL_CHR_BANK_IDS.includes(bank.id) || seen.has(bank.id))
      throw new VisualEncodingError("shared-chr-bank invalid or repeated bank identity");
    seen.add(bank.id);
    const first = bankIndex * 64, last = first + 64;
    if (last <= objectOffset || first >= objectEnd) continue;
    const tiles = recordsById(bank.tiles, 64, `bank-${bank.id.toString(16).padStart(2, "0")}.tiles`);
    for (let tileIndex = Math.max(0, objectOffset - first);
      tileIndex < Math.min(64, objectEnd - first); tileIndex += 1) {
      const tile = tiles[tileIndex];
      for (const plane of [0, 1]) {
        const fieldName = `plane_${plane}`, value = tile[fieldName];
        if (!Array.isArray(value) || value.length !== 8)
          throw new VisualEncodingError(`${fieldName} must contain 8 rows`);
        value.forEach(value => byte(value, fieldName));
        fields.push({resourceId: "shared-chr-bank", entityHandle: visualChrTileHandle(bank.id, tile.id),
          recordId: bank.id, tileId: tile.id, fieldName, defaultValue: value,
          documentPath: ["banks", bankIndex, "tiles", tileIndex, fieldName],
          fragmentId: `shared-chr-bank.bank-${bank.id.toString(16).padStart(2, "0")}`,
          offsetInFragment: tile.id * 16 + plane * 8, byteLength: 8});
      }
    }
  }
  return fields;
}

function validateVisualChrAsset(asset, original = asset) {
  if (asset?.resource_id !== "shared-chr-bank" || asset.schema !== ASSET_SCHEMAS["shared-chr-bank"])
    throw new VisualEncodingError("shared-chr-bank asset identity/schema changed");
  visualChrFieldDescriptions(asset.document);
  if (asset === original) return;
  const expected = structuredClone(original);
  for (const field of visualChrFieldDescriptions(original.document)) {
    const path = field.documentPath;
    const candidate = path.reduce((node, key) => node?.[key], asset.document);
    const parent = path.slice(0, -1).reduce((node, key) => node[key], expected.document);
    parent[path.at(-1)] = candidate;
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new VisualEncodingError("shared-chr-bank only existing pixel planes are editable");
}

export function validateVisualChrFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, visualChrFieldDescriptions, validateVisualChrAsset);
}

export function encodeVisualChrFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const identity = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== "shared-chr-bank" || values.has(identity))
      throw new VisualEncodingError("shared-chr-bank field identity invalid or repeated");
    values.set(identity, defaults ? field.defaultValue : field.value);
  }
  const output = VISUAL_CHR_BANK_IDS.map(bankId => {
    const payload = new Uint8Array(1024);
    for (let tileId = 0; tileId < 64; tileId++) for (const plane of [0, 1]) {
      const identity = JSON.stringify([visualChrTileHandle(bankId, tileId), `plane_${plane}`]);
      const value = values.get(identity);
      if (!Array.isArray(value) || value.length !== 8)
        throw new VisualEncodingError(`${identity} must contain 8 rows`);
      value.forEach((value, row) => {payload[tileId * 16 + plane * 8 + row] = byte(value, identity);});
      values.delete(identity);
    }
    return {fragment_id: `shared-chr-bank.bank-${bankId.toString(16).padStart(2, "0")}`, payload, relocations: []};
  });
  if (values.size) throw new VisualEncodingError("shared-chr-bank unknown fields remain");
  return output;
}

const VISUAL_CHR_EDITOR_LABELS = Object.freeze({plane_0: "像素低位面", plane_1: "像素高位面"});

export function visualChrObjects(document, options = {}) {
  const fields = visualChrFieldDescriptions(document, {
    objectOffset: options.offset || 0, objectLimit: options.limit,
  });
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `CHR 图块 · ${entityHandle.split(":").slice(-2).join(" / ")}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName,
      label: VISUAL_CHR_EDITOR_LABELS[field.fieldName] || field.fieldName,
      array: true, length: 8, min: 0, max: 0xff,
    }))},
  }));
}

export function visualChrObjectCount(document) {
  if (!Array.isArray(document?.banks) || document.banks.length !== VISUAL_CHR_BANK_IDS.length)
    throw new VisualEncodingError("shared-chr-bank fixed bank identity set changed");
  return document.banks.length * 64;
}

export function serializeVisualChrField(field) {
  if (field.resourceId !== "shared-chr-bank" || !Array.isArray(field.value)
      || field.value.length !== 8 || field.value.some(value => !Number.isInteger(value) || value < 0 || value > 0xff))
    throw new VisualEncodingError("shared-chr-bank plane must contain eight bytes");
  return Uint8Array.from(field.value);
}

export function validateVisualChrPreimage(fields, fragmentId, baseline) {
  if (fields.length !== 2 || fields.some(field => fieldFragmentId(field) !== fragmentId)
      || baseline.length !== 1024)
    throw new VisualEncodingError("shared-chr-bank Origin tile identity drift");
  for (const field of fields) {
    if (!Array.isArray(field.defaultValue) || field.defaultValue.length !== 8)
      throw new VisualEncodingError("shared-chr-bank Origin plane shape drift");
    for (let index = 0; index < 8; index++) {
      const offset = fieldOffsetInFragment(field) + index;
      if (baseline[offset] !== field.defaultValue[index])
        throw new VisualEncodingError("shared-chr-bank Origin plane value drift");
    }
  }
}

export function visualAssetSchema(resourceId) {
  const schema = ASSET_SCHEMAS[resourceId];
  if (!schema) throw new VisualEncodingError(`unknown visual resource: ${resourceId}`);
  return schema;
}

export function visualComponentSpecs(resourceId) {
  const specs = COMPONENT_SPECS[resourceId];
  if (!specs) throw new VisualEncodingError(`unknown visual resource: ${resourceId}`);
  return specs.map(([fragmentId, length]) => ({fragmentId, length}));
}

/** Encode one semantic value into sorted, placement-free logical fragments. */
export function visualAssetComponents(asset, resourceId = asset?.resource_id, {fieldFragments = null} = {}) {
  requireObject(asset, String(resourceId));
  if (!VISUAL_RESOURCE_IDS.includes(resourceId) || asset.resource_id !== resourceId) {
    throw new VisualEncodingError(`semantic resource id mismatch for ${resourceId}`);
  }
  const document = requireObject(asset.document, `${resourceId}.document`);
  let encoded;
  if (resourceId === "attack-visual") encoded = encodeAttackVisual(asset, document);
  else if (resourceId === "attack-visual-aux-script") {
    throw new VisualEncodingError("attack-visual-aux-script uses shared fields; document imports must use encodeImportedFields");
  } else if (resourceId === "battle-action") {
    throw new VisualEncodingError("battle-action uses shared fields; document imports must use encodeImportedFields");
  } else if (resourceId === "enemy-action-pattern") {
    throw new VisualEncodingError("enemy-action-pattern uses shared fields; document imports must use encodeImportedFields");
  } else if (resourceId === "enemy-action") {
    throw new VisualEncodingError("enemy-action uses shared fields; document imports must use encodeImportedFields");
  } else if (resourceId === "battle-object-layout") {
    throw new VisualEncodingError("battle-object-layout uses shared fields; document imports must use encodeImportedFields");
  }
  else if (resourceId === "actor-visual") encoded = encodeActors(document);
  else if (resourceId === "metasprite-record") throw new VisualEncodingError("metasprite-record uses shared fields; document imports must use encodeImportedFields");
  else if (resourceId === "monster-visual-layout") encoded = encodeMonsters(document, fieldFragments);
  else throw new VisualEncodingError(`${resourceId} uses shared fields; document imports must use encodeImportedFields`);

  const specs = visualComponentSpecs(resourceId);
  const expected = specs.map(spec => spec.fragmentId);
  const actual = [...encoded.keys()].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new VisualEncodingError(
      `${resourceId} component identity set mismatch`,
    );
  }
  return specs.map(spec => {
    const encodedValue = encoded.get(spec.fragmentId);
    const payload = encodedValue instanceof Uint8Array ?
      encodedValue : encodedValue?.payload;
    const relocations = encodedValue instanceof Uint8Array ?
      [] : encodedValue?.relocations;
    if (!(payload instanceof Uint8Array) || payload.length !== spec.length) {
      throw new VisualEncodingError(
        `${spec.fragmentId} encoded ${payload?.length}; expected ${spec.length}`,
      );
    }
    if (!Array.isArray(relocations)) {
      throw new VisualEncodingError(`${spec.fragmentId} relocations must be an array`);
    }
    return {fragment_id: spec.fragmentId, payload, relocations};
  });
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

export function attackVisualComponentIds() {
  return Array.from({length: ATTACK_VISUAL_TABLE_BYTES}, (_, index) =>
    `attack-visual.table-byte.${index.toString(16).toUpperCase().padStart(4, "0")}`);
}

export function attackVisualCommandProjectionBytes({command, record_id, command_index, expected_offset, namespace = "attack-visual"} = {}) {
  return encodeAttackVisualCommand(command, record_id, command_index, expected_offset, namespace);
}

export function attackVisualTableProjectionBytes({asset} = {}) {
  const map = encodeAttackVisual(asset, asset?.document);
  const ids = Array.from({length: ATTACK_VISUAL_TABLE_BYTES}, (_, index) =>
    `attack-visual.table-byte.${index.toString(16).toUpperCase().padStart(4, "0")}`);
  return Uint8Array.from(ids.flatMap(id => Array.from(map.get(id))));
}

export function auxiliaryScriptTableProjectionBytes({asset} = {}) {
  if (asset?.resource_id !== "attack-visual-aux-script" ||
      asset.schema !== ASSET_SCHEMAS["attack-visual-aux-script"] ||
      asset.codec !== "weapon-effects/v1")
    throw new VisualEncodingError("attack-visual-aux-script asset identity is invalid");
  const document = requireObject(asset.document, "attack-visual-aux-script.document");
  if (document.schema !== `${ASSET_SCHEMAS["attack-visual-aux-script"]}.document`)
    throw new VisualEncodingError("attack-visual-aux-script document identity is invalid");
  if (document.record_count !== ATTACK_VISUAL_AUX_RECORD_COUNT ||
      !Array.isArray(document.records) || document.records.length !== ATTACK_VISUAL_AUX_RECORD_COUNT)
    throw new VisualEncodingError(`attack-visual-aux-script document must contain ${ATTACK_VISUAL_AUX_RECORD_COUNT} records`);
  const table = [];
  for (const [id, recordValue] of document.records.entries()) {
    const label = `attack-visual-aux-script:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    const record = requireObject(recordValue, label);
    if (record.handle !== label || record.id !== id || record.id_hex !== `0x${id.toString(16).toUpperCase().padStart(2, "0")}` || record.owner !== "attack-visual-aux-script")
      throw new VisualEncodingError(`${label} stable identity or order changed`);
    const delimiter = requireObject(record.delimiter, `${label}.delimiter`);
    if (delimiter.value !== ATTACK_VISUAL_TERMINATOR || delimiter.value_hex !== "0x9F" || delimiter.included_in_record !== true)
      throw new VisualEncodingError(`${label} delimiter contract changed`);
    if (record.decode_status !== "decoded" || !Array.isArray(record.commands))
      throw new VisualEncodingError(`${label} must remain a decoded command record`);
    const bytes = auxiliaryScriptBytes(record.commands, id);
    if (delimiter.offset !== bytes.length) throw new VisualEncodingError(`${label}.delimiter.offset must equal ${bytes.length}`);
    table.push(...bytes, ATTACK_VISUAL_TERMINATOR);
  }
  if (table.length !== 558) throw new VisualEncodingError(`attack-visual-aux-script semantic table has ${table.length} bytes; expected 558`);
  if (table.filter(value => value === ATTACK_VISUAL_TERMINATOR).length !== ATTACK_VISUAL_AUX_RECORD_COUNT)
    throw new VisualEncodingError("attack-visual-aux-script table contains an unexpected delimiter count");
  return Uint8Array.from(table);
}

export function visualAssetInputSha256(asset) {
  return sha256Hex(new TextEncoder().encode(stableJson(asset)));
}
