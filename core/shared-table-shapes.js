// @editor-module Shared physical shapes for tables read by the maintainer and written by the editor.
export const MONSTER_TABLE_WIDTH = 1;
export const MONSTER_TABLE_SHAPES = Object.freeze([
  ["flags", "怪物总标志", 231518, 131], ["packed_a", "怪物压缩属性 A", 231649, 131],
  ["packed_b", "怪物压缩属性 B", 231780, 131], ["special_lookup", "怪物特殊映射", 231911, 32],
  ["hp", "怪物 HP 基值", 231943, 131], ["attack", "怪物攻击基值", 232074, 131],
  ["defense", "怪物防御基值", 232205, 131], ["speed", "怪物速度", 232336, 131],
  ["attack_code", "怪物攻击修饰码", 232467, 131], ["defense_code", "怪物防御修饰码", 232598, 131],
  ["experience_code", "怪物经验基值", 232729, 131], ["gold_code", "怪物金钱基值", 232860, 131],
  ["drop_items", "怪物掉落道具 ID", 140591, 107],
]);

export const CHARACTER_GROWTH_TABLE_SHAPES = Object.freeze([
  ["random-growth-increment-table", 162518, 16, 1],
  ["experience-thresholds", 162882, 99, 3],
  ["max-hp-contributions", 163179, 49, 1],
  ["battle-skill-requirements", 163521, 99, 1],
  ["repair-skill-requirements", 163620, 99, 1],
  ["driving-skill-requirements", 163719, 99, 1],
]);

export const AUDIO_PERIOD_TABLE_SHAPES = Object.freeze([
  {table: "period-table", offset: 237706, count: 96, width: 2},
  {table: "fade-curve", offset: 238406, count: 16, width: 1},
]);
