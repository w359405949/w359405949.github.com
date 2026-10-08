// @editor-module 承载页面上的模块编辑器；按定稿清单（proposal.json）的 primary_page 归组。
// 模块进入编辑页面的途径只有这一份清单，不从页面或资源形状反推。
import {SHOP_PAGES} from "./editor-pages.js";
const SHOP_PAGE_MODULES = Object.freeze([
  "application-config-family",
  "facility-config",
  "ui-facility",
]);

export const PAGE_MODULES = Object.freeze({
  "actors": Object.freeze([
    "direct-frame",
    "metasprite",
    "sprite-palette",
    "actor-visual",
    "shared-chr-bank",
    "metasprite-record",
  ]),
  "audio": Object.freeze([
    "audio-command",
    "audio-driver-section",
    "audio-opcode",
    "audio-voice",
    "dpcm-sample",
    "dpcm-storage",
  ]),
  "attack-effects": Object.freeze([
    "attack-visual",
    "attack-visual-aux-script",
    "battle-action",
    "battle-object-layout",
    "weapon-attack-parameter",
    "shared-indexed-byte-overlays",
  ]),
  "battle-test": Object.freeze([
    "battle-engine",
    "battle-amount-scaling-service",
    "battle-probability-thresholds",
    "battle-random-amount-service",
    "battle-status-scheduler",
    "battle-test-point",
    "index-stride-table",
  ]),
  "battleactors": Object.freeze([
    "battle-party-vertical-layout",
  ]),
  "boot-logo": Object.freeze([
    "boot-presentation",
  ]),
  "characters": Object.freeze([
    "character-growth",
    "character-initial-record",
    "fixed-text-slot",
    "party-field-actor-type-map",
    "party-healing-service",
    "ui-role-status",
    "ui-party-paired-selector",
  ]),
  "equipment-human": Object.freeze([
    "item-entry",
    "role-equipment-derived",
    "ui-equipment-control",
  ]),
  "equipment-tank": Object.freeze([
    "item-entry",
  ]),
  "items": Object.freeze([
    "item-entry",
    "field-item-dispatch",
    "field-item-use",
    "item-acquisition-service",
    "battle-item-service",
  ]),
  "monsters": Object.freeze([
    "monster-profile",
    "enemy-action",
    "enemy-action-pattern",
    "enemy-action-selection-service",
    "monster-figure",
    "monster-graphic",
    "monster-palette",
    "monster-palette-pair",
    "monster-visual-layout",
  ]),
  "scenes": Object.freeze([
    "encounter-event-flag-map",
    "encounter-trigger-runtime",
    "field-scene-lifecycle-service",
    "field-scroll-coordinate-delta-set",
    "metatile-page",
    "metatile-set",
    "palette",
    "scene",
    "scene-encounter-zone",
    "scene-direction-transform",
    "world-event",
  ]),
  "save": Object.freeze([
    "save-slot-runtime-service",
  ]),
  "shells": Object.freeze([
    "shell-record",
  ]),
  ...Object.fromEntries(SHOP_PAGES.map(page => [page.id, SHOP_PAGE_MODULES])),
  "party-strength": Object.freeze([
    "ui-vehicle-status",
  ]),
  "battle-results": Object.freeze([
    "battle-result-script",
  ]),
  "name-entry": Object.freeze([
    "ui-name-entry",
  ]),
  "text": Object.freeze([
    "char",
    "core-latin",
    "text-render-runtime",
    "text-record",
    "ui-tile-rectangle-service",
  ]),
  "title": Object.freeze([
    "boot-presentation",
  ]),
  "vehicles": Object.freeze([
    "vehicle-preset",
    "save-vehicle",
    "vehicle-visual-selector",
  ]),
  "wanted": Object.freeze([
    "wanted-record",
  ]),
  "wanted-ui": Object.freeze([
    "ui-wanted",
  ]),
});

// 同一页面里一个模块只能出现一条：重复会让承载页面长出两个同名模块段。
for (const [page, modules] of Object.entries(PAGE_MODULES)) {
  if (new Set(modules).size !== modules.length) throw new TypeError(`承载页面模块清单有重复：${page}`);
}
