// @editor-module monster-figure 的怪物形象组合作者工具
//
// 怪物名称、图形、单调色板与双调色板仍由各自 owner component 提供候选和预览；
// 本页写 monster-figure 的两条引用；monster-visual-layout 仅供组合预览。

import {resetToOriginalButton, bindFieldResetToOriginalButtons} from "../../ui/table.js";
import {esc} from "../../core/dom.js";
import {monsterVisualRecipes} from "../../core/monster-visual-recipes.js";
import {
  requireBrowserProjectRepository, setProjectFields, resetProjectFields,
} from "../../core/project-data.js";
import {
  monsterOwnerRecord, monsterPaletteIdentity, monsterPaletteSelector, monsterPalettePairs, projectMonsterFigureFields,
} from "../../core/monster-visual-owners.js";
import {fieldOwner} from "../../core/field-owners.js";
import {writeAccessMarker} from "../../ui/write-access-marker.js";
import {state} from "../../core/state.js";
import {db} from "../../core/project-db.js";
import {visualAssetComponents} from "../../core/visual-compiler.js";
import "../../modules/monster/components.js";
import "../../modules/monster/visual-components.js";
import {
  hydrateModuleComponents,
  prepareModuleComponent,
  renderModuleComponent,
} from "../../ui/module-components.js";
import "./monster-visual-auto-save.js";

export const MONSTER_FIGURE_AUTHORING_MODULE_ID = "monster-visual-layout";

const VISUAL_SCHEMA = "metalmaxcn.visual.asset.monsters";
const MONSTER_MODULE_ID = "monster-profile";
const FIGURE_MODULE_ID = "monster-figure";
const GRAPHIC_MODULE_ID = "monster-graphic";
const PALETTE_MODULE_ID = "monster-palette";
const PALETTE_PAIR_MODULE_ID = "monster-palette-pair";

function integerId(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > 0xff) {
    throw new TypeError(`${label} 必须是 0..255 的整数 ID`);
  }
  return result;
}

function uniqueRecord(records, id, label) {
  if (!Array.isArray(records)) throw new TypeError(`${label} 不是记录列表`);
  const matches = records.filter(record => Number(record?.id) === id);
  if (matches.length !== 1) throw new TypeError(`${label} 不是唯一记录`);
  return matches[0];
}

function paletteIdentity(documentValue, rawCode) {
  return monsterPaletteIdentity(documentValue, integerId(rawCode, "怪物调色板选择"));
}

function encodedPaletteIdentity(documentValue, moduleId, rawId) {
  return monsterPaletteSelector(documentValue, moduleId, integerId(rawId, "怪物调色板引用"));
}

/**
 * Read one enemy's semantic figure references. The selector byte never leaves
 * this owner boundary; callers receive a palette owner plus its stable ID.
 */
export function monsterFigureSelection(documentValue, enemyValue) {
  const enemyId = integerId(enemyValue, "怪物");
  const enemy = uniqueRecord(
    documentValue?.enemies,
    enemyId,
    `monster-visual-layout 怪物 ${enemyId}`,
  );
  const graphicId = integerId(enemy.graphic_id, "怪物图形引用");
  uniqueRecord(documentValue?.graphics, graphicId, `怪物图形 ${graphicId}`);
  return Object.freeze({
    enemyId,
    graphicId,
    ...paletteIdentity(documentValue, enemy.palette_code),
  });
}

function normalizedSelection(documentValue, enemyId, selection) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    throw new TypeError("怪物形象选择必须是语义引用对象");
  }
  const graphicId = integerId(selection.graphicId, "怪物图形引用");
  uniqueRecord(documentValue?.graphics, graphicId, `怪物图形 ${graphicId}`);
  const paletteModuleId = String(selection.paletteModuleId || "");
  const paletteId = integerId(selection.paletteId, "怪物调色板引用");
  encodedPaletteIdentity(documentValue, paletteModuleId, paletteId);
  return Object.freeze({enemyId, graphicId, paletteModuleId, paletteId});
}


/** Install exactly one enemy's semantic figure references. */

function requireVisualAsset(value, label = MONSTER_FIGURE_AUTHORING_MODULE_ID) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || value.schema !== VISUAL_SCHEMA
      || value.resource_id !== MONSTER_FIGURE_AUTHORING_MODULE_ID
      || !value.document || typeof value.document !== "object"
      || Array.isArray(value.document)) {
    throw new TypeError(`${label} 不是 monster-visual-layout 语义资产`);
  }
  // 正式 compiler 校验稳定 ID、完整记录数与全部发布 fragment。
  visualAssetComponents(value, MONSTER_FIGURE_AUTHORING_MODULE_ID);
  // 渲染配方继续由既有 owner decoder 校验，不在作者页复制图块／bank 规则。
  monsterVisualRecipes(value.document);
  // compiler 保证字段可编码；作者边界再保证每个 selector 真指向现有 owner 项。
  for (const enemy of value.document.enemies) {
    monsterFigureSelection(value.document, enemy.id);
  }
  return value;
}

function resolvedVisualAsset(resolved, label) {
  return requireVisualAsset(resolved?.value, label);
}

function requireMonsterDataAsset(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || value.resource_id !== MONSTER_MODULE_ID
      || !value.document || typeof value.document !== "object"
      || !Array.isArray(value.document.records)) {
    throw new TypeError("monster-profile 候选资产不可用");
  }
  return value;
}

/** Persist exactly one monster's graphic and palette-owner references. */
export async function saveMonsterFigureSelection(
  repository,
  enemyValue,
  selection,
  {expectedVersion} = {},
) {
  if (requireBrowserProjectRepository(state) !== repository) throw new Error("怪物形象字段不属于当前项目会话");
  const enemyId = integerId(enemyValue, "怪物");
  const visual = await db.readResource(MONSTER_FIGURE_AUTHORING_MODULE_ID);
  const normalized = normalizedSelection(visual.value.document, enemyId, selection);
  const [graphics, palettes] = await Promise.all([
    db.readResource(GRAPHIC_MODULE_ID),
    db.readResource(normalized.paletteModuleId),
  ]);
  const graphic = monsterOwnerRecord(graphics.value.document, normalized.graphicId, GRAPHIC_MODULE_ID);
  const palette = monsterOwnerRecord(palettes.value.document, normalized.paletteId, normalized.paletteModuleId);
  const fields = await monsterFigureFields(enemyId), values = [graphic.id, palette.id];
  const changed = fields.some((field, index) => field.value !== values[index]);
  await setProjectFields(db, fields.map((field, index) => ({field, value: values[index]})), {expectedVersion});
  return savedFigureProjection(fields, changed);
}

async function monsterFigureFields(rawId) {
  const id = integerId(rawId, "怪物");
  const owner = await db.readResource(FIGURE_MODULE_ID);
  const row = monsterOwnerRecord(owner.value.document, id, FIGURE_MODULE_ID);
  return Promise.all(["graphic_selector", "palette_selector"].map(name => db.getField(FIGURE_MODULE_ID, row.handle, name)));
}

async function savedFigureProjection(fields, changed) {
  const [resolved, owner] = await Promise.all([
    db.readResource(MONSTER_FIGURE_AUTHORING_MODULE_ID),
    db.readResource(FIGURE_MODULE_ID),
  ]);
  return {...resolved, changed, value: projectMonsterFigureFields(resolved.value, owner.value),
    ownerVersions: {[FIGURE_MODULE_ID]: fields[0].version}};
}


/** Restore only this monster's two references from immutable Original. */

function componentError(component) {
  return String(component?.error || "");
}

export async function prepareMonsterFigureAuthoring(props) {
  try {
    if (props.resourceId !== MONSTER_FIGURE_AUTHORING_MODULE_ID) {
      throw new TypeError(
        `怪物形象作者工具不能编辑 ${props.resourceId || "（空）"}`,
      );
    }
    const repository = requireBrowserProjectRepository(state);
    const asset = resolvedVisualAsset(
      props.resolved,
      MONSTER_FIGURE_AUTHORING_MODULE_ID,
    );
    const [originalResolved, monsterResolved] = await Promise.all([
      repository.getOriginal(MONSTER_FIGURE_AUTHORING_MODULE_ID),
      db.readResource(MONSTER_MODULE_ID),
    ]);
    const originalAsset = resolvedVisualAsset(
      originalResolved,
      "monster-visual-layout Original",
    );
    const monsterAsset = requireMonsterDataAsset(monsterResolved?.value);
    for (const enemy of asset.document.enemies) {
      uniqueRecord(
        monsterAsset.document.records,
        integerId(enemy.id, "怪物"),
        `monster-profile 怪物 ${enemy.id}`,
      );
    }
    const enemyId = integerId(asset.document.enemies[0]?.id, "第一个怪物");
    const initial = monsterFigureSelection(asset.document, enemyId);
    const [monsterReference, graphicReference, paletteReference, pairReference] =
      await Promise.all([
        prepareModuleComponent(MONSTER_MODULE_ID, "reference", {
          documentValue: monsterAsset.document,
          value: enemyId,
          label: "选择怪物",
        }),
        prepareModuleComponent(GRAPHIC_MODULE_ID, "reference", {
          documentValue: asset.document,
          value: initial.graphicId,
          label: "怪物图形",
        }),
        prepareModuleComponent(PALETTE_MODULE_ID, "reference", {
          documentValue: asset.document,
          value: initial.paletteId,
          label: "单调色板",
        }),
        prepareModuleComponent(PALETTE_PAIR_MODULE_ID, "reference", {
          documentValue: {...asset.document, palette_pairs: monsterPalettePairs(asset.document)},
          value: initial.paletteId,
          label: "双调色板",
        }),
      ]);
    const unavailable = [
      monsterReference,
      graphicReference,
      paletteReference,
      pairReference,
    ].map(componentError).filter(Boolean);
    if (unavailable.length) throw new TypeError(unavailable.join("；"));
    return {
      asset,
      originalAsset,
      monsterAsset,
      monsterReference,
      graphicReference,
      paletteReference,
      pairReference,
      enemyId,
      version: props.resolved?.ownerVersions?.[FIGURE_MODULE_ID],
      ownerVersions: props.resolved?.ownerVersions,
      aggregateVersion: props.resolved?.version,
      error: "",
    };
  } catch (error) {
    return {
      asset: null,
      originalAsset: null,
      monsterAsset: null,
      monsterReference: null,
      graphicReference: null,
      paletteReference: null,
      pairReference: null,
      enemyId: null,
      version: null,
      error: error?.message || String(error),
    };
  }
}
